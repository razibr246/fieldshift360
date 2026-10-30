import test from 'node:test';
import assert from 'node:assert/strict';
import { localCropAssessment } from './cropDoctor.js';

test('crop doctor: an offline healthy sample never claims the image was examined', () => {
  const res = localCropAssessment({
    crop: 'aman',
    symptomKey: 'healthy',
    context: { weather: { rain7: 15, tmax: 30, tmin: 22 } },
    lang: 'bn',
  });

  assert.equal(res.is_crop_photo, null);
  assert.equal(res.image_analyzed, false);
  assert.equal(res.findings[0].key, 'healthy');
  assert.equal(res.findings[0].likelihood, null);
  assert.equal(res.urgency, 'low');
  assert.ok(res.actions_now.length >= 2);
  assert.equal(res.offline, true);
});

test('crop doctor: an explicit symptom key returns a non-probabilistic text match', () => {
  const res = localCropAssessment({
    crop: 'tomato',
    symptomKey: 'late_blight',
    context: { weather: { rain7: 25, tmax: 24, tmin: 15 }, note: 'dark spots after fog' },
    lang: 'en',
  });

  assert.equal(res.is_crop_photo, null);
  assert.equal(res.image_analyzed, false);
  assert.equal(res.urgency, 'high');
  assert.equal(res.findings[0].key, 'late_blight');
  assert.equal(res.findings[0].likelihood, null, 'A text match is not a calibrated probability');
  assert.equal(res.treatment_note, '', 'Offline guidance must not recommend chemicals');
  assert.ok(res.call_officer_if.length > 0);
});

test('crop doctor: mustard aphids identified correctly with dry warm conditions', () => {
  const res = localCropAssessment({
    crop: 'mustard',
    symptomKey: 'aphid',
    context: { weather: { rain7: 0, tmax: 27, tmin: 16 } },
    lang: 'bn',
  });

  assert.equal(res.urgency, 'high');
  assert.equal(res.findings[0].key, 'aphid');
  assert.equal(res.findings[0].likelihood, null);
  assert.ok(res.actions_now.some((a) => a.includes('কর্মকর্তা')));
});

test('crop doctor: a specific note matches its reference without claiming a photo diagnosis', () => {
  const res = localCropAssessment({
    crop: 'tomato',
    context: { note: 'নিচের পাতায় বাদামি দাগ, দাগের ভেতর গোল গোল রেখা' },
    lang: 'bn',
  });

  assert.equal(res.findings[0].key, 'early_blight');
  assert.equal(res.image_analyzed, false);
});

test('crop doctor: vague notes never become the first disease in the crop list', () => {
  const res = localCropAssessment({ crop: 'tomato', context: { note: 'পাতায় দাগ' }, lang: 'bn' });

  assert.equal(res.findings.length, 0);
  assert.match(res.summary, /নির্দিষ্ট কোনো লক্ষণ মেলেনি/);
  assert.equal(res.sources.length, 0);
  assert.equal(res.treatment_note, '');
});

