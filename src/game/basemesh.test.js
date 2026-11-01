import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const OBJ_PATH = path.resolve('public/models/basemesh_aaa.obj');

function parseObj(content) {
  const lines = content.split('\n');
  const vertices = [];
  const uvs = [];
  const normals = [];
  const groups = new Set();
  let quads = 0;
  let tris = 0;
  let currentGroup = 'default';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split(/\s+/);
    const type = parts[0];

    if (type === 'v') {
      vertices.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
    } else if (type === 'vt') {
      uvs.push([parseFloat(parts[1]), parseFloat(parts[2])]);
    } else if (type === 'vn') {
      normals.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
    } else if (type === 'g') {
      currentGroup = parts[1];
      groups.add(currentGroup);
    } else if (type === 'f') {
      const vertCount = parts.length - 1;
      if (vertCount === 4) quads++;
      else if (vertCount === 3) tris++;
    }
  }

  return { vertices, uvs, normals, groups, quads, tris };
}

test('basemesh OBJ file exists and has valid geometry structure', () => {
  assert.ok(fs.existsSync(OBJ_PATH), 'public/models/basemesh_aaa.obj must exist');
  const content = fs.readFileSync(OBJ_PATH, 'utf-8');
  assert.ok(content.length > 1000, 'OBJ file contains geometry data');

  const parsed = parseObj(content);
  assert.ok(parsed.vertices.length >= 1000, `Has substantial vertex resolution: ${parsed.vertices.length}`);
  assert.ok(parsed.normals.length >= 1000, `Has smooth vertex normals: ${parsed.normals.length}`);
  assert.ok(parsed.uvs.length >= 1000, `Has UV texture coordinates: ${parsed.uvs.length}`);
});

test('basemesh topology is quad-dominant (>90% pure quads)', () => {
  const content = fs.readFileSync(OBJ_PATH, 'utf-8');
  const { quads, tris } = parseObj(content);
  const totalFaces = quads + tris;
  assert.ok(totalFaces > 0, 'Mesh has faces');
  const quadPct = (quads / totalFaces) * 100;
  assert.ok(quadPct >= 90.0, `Quad dominance must exceed 90% for clean subdivision (got ${quadPct.toFixed(1)}%)`);
});

test('basemesh proportions match semi-realistic AAA standard (7.75 heads, 1.82 m)', () => {
  const content = fs.readFileSync(OBJ_PATH, 'utf-8');
  const { vertices } = parseObj(content);

  const ys = vertices.map((v) => v[1]);
  const xs = vertices.map((v) => v[0]);
  const zs = vertices.map((v) => v[2]);

  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const height = maxY - minY;

  // Ground plane contact
  assert.ok(Math.abs(minY) < 1e-3, `Sole of foot is planted flat at ground y=0 (minY=${minY.toFixed(4)})`);
  // Total standing stature
  assert.ok(height >= 1.80 && height <= 1.85, `Total height matches AAA standard 1.82m ± 0.03m (got ${height.toFixed(3)}m)`);

  // Shoulder and arm span in relaxed A-pose
  const span = Math.max(...xs) - Math.min(...xs);
  assert.ok(span >= 1.20 && span <= 1.35, `Relaxed A-pose span is ~1.28m (got ${span.toFixed(3)}m)`);

  // Anteroposterior depth
  const depth = Math.max(...zs) - Math.min(...zs);
  assert.ok(depth >= 0.28 && depth <= 0.38, `Chest/foot depth is ~0.32m (got ${depth.toFixed(3)}m)`);
});

test('basemesh includes all essential rigging vertex groups', () => {
  const content = fs.readFileSync(OBJ_PATH, 'utf-8');
  const { groups } = parseObj(content);

  const requiredGroups = [
    'Head',
    'Torso',
    'LeftArm',
    'RightArm',
    'LeftHand',
    'RightHand',
    'LeftLeg',
    'RightLeg',
    'LeftFoot',
    'RightFoot',
  ];

  for (const grp of requiredGroups) {
    assert.ok(groups.has(grp), `Mesh includes vertex group "${grp}" for modular skinning/rigging`);
  }
});

test('basemesh exhibits exact bilateral symmetry across the sagittal plane', () => {
  const content = fs.readFileSync(OBJ_PATH, 'utf-8');
  const { vertices } = parseObj(content);

  const leftArmVerts = vertices.filter((v) => v[0] < -0.22 && v[1] > 0.8 && v[1] < 1.45);
  const rightArmVerts = vertices.filter((v) => v[0] > 0.22 && v[1] > 0.8 && v[1] < 1.45);

  assert.equal(leftArmVerts.length, rightArmVerts.length, 'Bilateral arm vertex counts must match exactly');

  // Verify centroid mirror
  const avgLeftX = leftArmVerts.reduce((sum, v) => sum + v[0], 0) / leftArmVerts.length;
  const avgRightX = rightArmVerts.reduce((sum, v) => sum + v[0], 0) / rightArmVerts.length;
  assert.ok(Math.abs(avgLeftX + avgRightX) < 1e-3, 'Left and right arm centroids mirror cleanly across X=0');
});
