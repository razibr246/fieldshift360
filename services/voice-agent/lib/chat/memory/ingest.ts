import {
  asChatDatabase,
  bumpMemoryVersion,
  hashContent,
  normalizeDocument,
} from "./store";
import type { IngestResult, MemoryBatch } from "./types";

const MAX_DOCUMENTS_PER_BATCH = 500;

/**
 * Short, quotable document id. The full SHA-256 was unusable in a citation
 * ("[MEM-79d870ab...]"), and 12 hex chars keeps collisions negligible at this
 * scale. Idempotency still keys off the UNIQUE (source, external_id).
 */
export function documentId(source: string, externalId: string): Promise<string> {
  return hashContent(`${source}:${externalId}`).then((hash) => `MEM-${hash.slice(0, 12)}`);
}

export class MemoryIngestError extends Error {}

/**
 * Applies a memory batch from the data control center.
 *
 * Idempotent on (source, external_id): re-sending a batch updates documents whose
 * content changed and leaves the rest untouched, so a failed push can simply be
 * retried. The memory version is bumped once per applied batch, which is what
 * invalidates the cached prompt prefix.
 */
export async function ingestMemoryBatch(
  database: unknown,
  batch: MemoryBatch,
): Promise<IngestResult> {
  const db = asChatDatabase(database);
  if (!db) throw new MemoryIngestError("Database unavailable");

  const source = (batch.source || "").trim();
  if (!source) throw new MemoryIngestError("source is required");
  if (!Array.isArray(batch.documents) || batch.documents.length === 0) {
    throw new MemoryIngestError("documents must be a non-empty array");
  }
  if (batch.documents.length > MAX_DOCUMENTS_PER_BATCH) {
    throw new MemoryIngestError(`A batch may carry at most ${MAX_DOCUMENTS_PER_BATCH} documents`);
  }

  const batchId = `MB-${crypto.randomUUID()}`;
  let inserted = 0;
  let updated = 0;
  let unchanged = 0;
  let disabled = 0;

  for (const raw of batch.documents) {
    const document = normalizeDocument(source, raw);
    if (!document.externalId || !document.title || !document.body) {
      throw new MemoryIngestError(
        `Every document needs externalId, title and body (got "${document.externalId || "?"}")`,
      );
    }

    const contentHash = await hashContent(
      [document.title, document.body, document.keywords, document.scope].join(" "),
    );
    const id = await documentId(source, document.externalId);

    const existing = await db
      .prepare(
        "SELECT id, content_hash FROM chat_memory_documents WHERE source = ? AND external_id = ?",
      )
      .bind(source, document.externalId)
      .first<{ id: string; content_hash: string }>();

    if (!existing) {
      await db
        .prepare(
          `INSERT INTO chat_memory_documents
            (id, source, external_id, scope, title, body, keywords, language,
             source_url, authority, is_core, enabled, revision, content_hash, batch_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        )
        .bind(
          id,
          source,
          document.externalId,
          document.scope,
          document.title,
          document.body,
          document.keywords,
          document.language,
          document.sourceUrl,
          document.authority,
          document.isCore ? 1 : 0,
          document.enabled ? 1 : 0,
          contentHash,
          batchId,
        )
        .run();
      inserted += 1;
      continue;
    }

    if (existing.content_hash === contentHash) {
      // Identical content: only re-assert the flags in case they were the change.
      await db
        .prepare(
          "UPDATE chat_memory_documents SET is_core = ?, enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        )
        .bind(document.isCore ? 1 : 0, document.enabled ? 1 : 0, existing.id)
        .run();
      unchanged += 1;
      continue;
    }

    await db
      .prepare(
        `UPDATE chat_memory_documents
         SET scope = ?, title = ?, body = ?, keywords = ?, language = ?, source_url = ?,
             authority = ?, is_core = ?, enabled = ?, revision = revision + 1,
             content_hash = ?, batch_id = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
      .bind(
        document.scope,
        document.title,
        document.body,
        document.keywords,
        document.language,
        document.sourceUrl,
        document.authority,
        document.isCore ? 1 : 0,
        document.enabled ? 1 : 0,
        contentHash,
        batchId,
        existing.id,
      )
      .run();
    updated += 1;
  }

  if (batch.pruneMissing) {
    const keepIds: string[] = [];
    for (const raw of batch.documents) {
      const document = normalizeDocument(source, raw);
      keepIds.push(await documentId(source, document.externalId));
    }
    const placeholders = keepIds.map(() => "?").join(",");
    const result = (await db
      .prepare(
        `UPDATE chat_memory_documents SET enabled = 0, updated_at = CURRENT_TIMESTAMP
         WHERE source = ? AND enabled = 1 AND id NOT IN (${placeholders})`,
      )
      .bind(source, ...keepIds)
      .run()) as { meta?: { changes?: number } } | null;
    disabled = Number(result?.meta?.changes ?? 0);
  }

  await db
    .prepare(
      `INSERT INTO chat_memory_batches
        (id, source, note, document_count, inserted_count, updated_count, disabled_count)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      batchId,
      source,
      batch.note ?? null,
      batch.documents.length,
      inserted,
      updated,
      disabled,
    )
    .run();

  const memoryVersion = await bumpMemoryVersion(db);

  return {
    batchId,
    source,
    received: batch.documents.length,
    inserted,
    updated,
    unchanged,
    disabled,
    memoryVersion,
  };
}

export async function listMemoryBatches(
  database: unknown,
  limit = 20,
): Promise<Array<Record<string, unknown>>> {
  const db = asChatDatabase(database);
  if (!db) return [];
  const { results } = await db
    .prepare(
      `SELECT id, source, note, document_count, inserted_count, updated_count,
              disabled_count, status, created_at
       FROM chat_memory_batches ORDER BY created_at DESC, rowid DESC LIMIT ?`,
    )
    .bind(limit)
    .all<Record<string, unknown>>();
  return results;
}
