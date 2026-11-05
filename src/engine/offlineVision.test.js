import test from 'node:test';
import assert from 'node:assert/strict';
import { extractLeafMetrics, classifyLeafPixels, generateFalseColorSpectralMap } from './offlineVision.js';

test('offline colour check: neutral pixels do not produce a green signal or a diagnosis', () => {
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
  assert.equal(res.on_device_pixel_check, true);
  assert.equal(res.method, 'rgb-thresholds');
  assert.equal(res.findings.length, 0);
});

test('offline colour check: green pixels are only reported as a colour cue, never a healthy diagnosis', () => {
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
  assert.equal(res.is_crop_photo, true);
  assert.equal(res.crop_seen, '');
  assert.equal(res.findings.length, 0);
  assert.match(res.summary, /cannot identify a crop or disease/);
});

test('offline colour check: dark pixels are measured but never diagnosed as blight', () => {
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
    metrics,
    lang: 'bn',
  });
  assert.equal(res.is_crop_photo, true);
  assert.equal(res.findings.length, 0);
  assert.equal(res.urgency, 'low');
  assert.match(res.summary, /রোগ শনাক্ত করে না/);
});

test('offline colour check: yellow pixels are measured but never diagnosed as pests', () => {
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
    metrics,
    lang: 'bn',
  });
  assert.equal(res.is_crop_photo, true);
  assert.equal(res.findings.length, 0);
  assert.equal(res.urgency, 'low');
  assert.match(res.summary, /রোগ শনাক্ত করে না/);
});

test('generateFalseColorSpectralMap categorises healthy foliage, chlorosis, and necrotic pixels accurately', () => {
  const width = 10, height = 10;
  const total = width * height;
  const data = new Uint8ClampedArray(total * 4);

  // Fill 40 pixels green, 30 pixels chlorotic yellow, 20 pixels necrotic, 10 pixels grey background
  for (let i = 0; i < total; i++) {
    const idx = i * 4;
    data[idx + 3] = 255;
    if (i < 40) {
      // Green
      data[idx] = 40;
      data[idx + 1] = 180;
      data[idx + 2] = 50;
    } else if (i < 70) {
      // Chlorotic
      data[idx] = 180;
      data[idx + 1] = 175;
      data[idx + 2] = 30;
    } else if (i < 90) {
      // Necrotic
      data[idx] = 90;
      data[idx + 1] = 30;
      data[idx + 2] = 20;
    } else {
      // Grey background
      data[idx] = 120;
      data[idx + 1] = 120;
      data[idx + 2] = 120;
    }
  }

  const { falseColorData, stats } = generateFalseColorSpectralMap({ data, width, height });
  assert.ok(falseColorData instanceof Uint8ClampedArray);
  assert.equal(stats.greenPct, 40);
  assert.equal(stats.chlorosisPct, 30);
  assert.equal(stats.necroticPct, 20);
  assert.equal(stats.otherPct, 10);

  // Check green pixel false colour is emerald (R=16, G=185, B=129)
  assert.equal(falseColorData[0], 16);
  assert.equal(falseColorData[1], 185);
  assert.equal(falseColorData[2], 129);

  // Check necrotic pixel false colour is crimson (R=239, G=68, B=68)
  const necIdx = 75 * 4;
  assert.equal(falseColorData[necIdx], 239);
  assert.equal(falseColorData[necIdx + 1], 68);
  assert.equal(falseColorData[necIdx + 2], 68);
});

