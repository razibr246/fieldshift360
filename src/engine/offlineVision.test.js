import test from 'node:test';
import assert from 'node:assert/strict';
import { extractLeafMetrics, classifyLeafPixels } from './offlineVision.js';

test('offlineVision: non-crop image (blank/grey pixels) is identified as non-crop', () => {
  const width = 10, height = 10;
  // Grey pixels (R=128, G=128, B=128)
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 128;
    data[i + 1] = 128;
    data[i + 2] = 128;
    data[i + 3] = 255;
  }

  const metrics = extractLeafMetrics({ data, width, height });
  assert.equal(metrics.isCrop, false);

  const res = classifyLeafPixels({ crop: 'tomato', metrics, lang: 'bn' });
  assert.equal(res.is_crop_photo, false);
  assert.equal(res.image_analyzed, true);
  assert.equal(res.on_device_vision, true);
  assert.equal(res.findings.length, 0);
});

test('offlineVision: healthy green leaf pixels produce healthy diagnosis with high GLI', () => {
  const width = 20, height = 20;
  // Vibrant green leaf pixels (R=45, G=170, B=50)
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 45;
    data[i + 1] = 170;
    data[i + 2] = 50;
    data[i + 3] = 255;
  }

  const metrics = extractLeafMetrics({ data, width, height });
  assert.equal(metrics.isCrop, true);
  assert.ok(metrics.gli > 0.40, 'Healthy green leaves have high positive GLI');
  assert.equal(metrics.necroticPct, 0);

  const res = classifyLeafPixels({ crop: 'tomato', metrics, lang: 'en' });
  assert.equal(res.is_crop_photo, true);
  assert.equal(res.image_analyzed, true);
  assert.equal(res.findings[0].key, 'healthy');
  assert.ok(res.findings[0].confidence_pct >= 85);
});

test('offlineVision: necrotic lesion patches correctly diagnose blight with high necrotic lesion ratio', () => {
  const width = 20, height = 20;
  const data = new Uint8ClampedArray(width * height * 4);
  // 75% green leaf, 25% necrotic dark brown blight spots (R=80, G=35, B=20)
  for (let i = 0; i < data.length; i += 4) {
    const isLesion = i < data.length * 0.25;
    if (isLesion) {
      data[i] = 80;
      data[i + 1] = 35;
      data[i + 2] = 20;
    } else {
      data[i] = 50;
      data[i + 1] = 160;
      data[i + 2] = 45;
    }
    data[i + 3] = 255;
  }

  const metrics = extractLeafMetrics({ data, width, height });
  assert.equal(metrics.isCrop, true);
  assert.ok(metrics.necroticPct >= 20.0, 'Detects ~25% necrotic lesion coverage');

  const res = classifyLeafPixels({
    crop: 'tomato',
    metrics,
    context: { weather: { rain7: 12, tmin: 17 } },
    lang: 'bn',
  });
  assert.equal(res.is_crop_photo, true);
  assert.equal(res.findings[0].key, 'late_blight');
  assert.equal(res.urgency, 'high');
  assert.ok(res.findings[0].evidence.includes('নেক্রোটিক'));
});

test('offlineVision: chlorotic yellowing diagnoses aphid/sap-sucking pest symptom', () => {
  const width = 20, height = 20;
  // Chlorotic yellowing (R=180, G=190, B=30)
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 180;
    data[i + 1] = 190;
    data[i + 2] = 30;
    data[i + 3] = 255;
  }

  const metrics = extractLeafMetrics({ data, width, height });
  assert.equal(metrics.isCrop, true);
  assert.ok(metrics.chlorosis >= 0.85, 'High chlorosis index for yellowing leaf');

  const res = classifyLeafPixels({
    crop: 'mustard',
    metrics,
    context: { weather: { rain7: 0 } },
    lang: 'bn',
  });
  assert.equal(res.is_crop_photo, true);
  assert.equal(res.findings[0].key, 'aphid');
  assert.ok(res.findings[0].evidence.includes('ক্লোরোসিস'));
});
