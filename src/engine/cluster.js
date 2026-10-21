// Area hotspot detection: DBSCAN on help requests [AI: unsupervised clustering].
export function haversineKm(a, b) {
  const R = 6371, toR = Math.PI / 180;
  const dLat = (b.lat - a.lat) * toR, dLon = (b.lon - a.lon) * toR;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * toR) * Math.cos(b.lat * toR) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// points: [{id, lat, lon, ...}]; returns array of clusters (arrays of points)
export function dbscan(points, epsKm = 1.5, minPts = 5) {
  const label = new Map(); // id -> cluster index or -1 (noise)
  const clusters = [];
  const neighbours = (p) => points.filter((q) => haversineKm(p, q) <= epsKm);
  for (const p of points) {
    if (label.has(p.id)) continue;
    const nb = neighbours(p);
    if (nb.length < minPts) { label.set(p.id, -1); continue; }
    const ci = clusters.length;
    const members = [];
    clusters.push(members);
    const queue = [...nb];
    label.set(p.id, ci); members.push(p);
    while (queue.length) {
      const q = queue.shift();
      if (label.get(q.id) === -1) { label.set(q.id, ci); members.push(q); }
      if (label.has(q.id)) continue;
      label.set(q.id, ci); members.push(q);
      const nq = neighbours(q);
      if (nq.length >= minPts) queue.push(...nq);
    }
  }
  return clusters;
}

// cluster requests with the same symptom reported within `days` days of the newest one
export function findHotspots(requests, { days = 7, epsKm = 1.5, minPts = 5 } = {}) {
  const bySym = {};
  for (const r of requests) {
    if (r.status === 'resolved' || !r.symptom) continue;
    (bySym[`${r.symptom}|${r.crop}`] ||= []).push(r);
  }
  const out = [];
  for (const [key, list] of Object.entries(bySym)) {
    const [symptom, crop] = key.split('|');
    const newest = Math.max(...list.map((r) => r.created));
    const recent = list.filter((r) => newest - r.created <= days * 864e5);
    for (const c of dbscan(recent, epsKm, minPts)) {
      const lat = c.reduce((a, r) => a + r.lat, 0) / c.length, lon = c.reduce((a, r) => a + r.lon, 0) / c.length;
      const villages = [...new Set(c.map((r) => r.village))];
      out.push({ id: `${key}-${c.length}-${c.map((r) => r.id).sort()[0]}`, symptom, crop, members: c, lat, lon, villages });
    }
  }
  return out;
}
