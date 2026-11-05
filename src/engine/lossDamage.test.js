import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DISASTER_TYPES,
  CROP_BASELINES,
  USD_BDT_RATE,
  computeLossAndDamage,
  generateLossDossierText,
} from './lossDamage.js';

test('DISASTER_TYPES contains verified extreme climate shocks with sensor provenance', () => {
  assert.ok(DISASTER_TYPES.cyclone_surge);
  assert.ok(DISASTER_TYPES.heat_sterility);
  assert.ok(DISASTER_TYPES.flash_flood);
  assert.ok(DISASTER_TYPES.delayed_monsoon);

  for (const [key, d] of Object.entries(DISASTER_TYPES)) {
    assert.equal(d.id, key);
    assert.ok(d.name.bn && d.name.en);
    assert.ok(d.satelliteSensors.length > 0);
    assert.ok(d.unfcccCode.startsWith('WIM-'));
  }
});

test('computeLossAndDamage accurately quantifies yield loss, sunk costs and USD valuation', () => {
  // Test case: 100 hectares of Boro rice affected by heat sterility wave at 50% severity
  const res = computeLossAndDamage({
    disasterTypeId: 'heat_sterility',
    affectedAreaHa: 100,
    cropKey: 'boro',
    severityRatio: 0.50,
  });

  assert.equal(res.affectedAreaHa, 100);
  assert.equal(res.severityPct, 50);
  assert.equal(res.potentialYieldMt, 450); // 100 ha * 4.5 MT/ha = 450 MT
  assert.equal(res.lostYieldMt, 225); // 450 * 0.5 = 225 MT
  assert.equal(res.harvestedYieldMt, 225);

  // Gross lost value: 225 MT * 30,000 BDT/MT = 6,750,000 BDT
  assert.equal(res.grossLostValueBdt, 6_750_000);

  // Sunk input costs: 100 ha * 68,000 BDT/ha * 0.95 = 6,460,000 BDT
  assert.equal(res.sunkInputCostBdt, 6_460_000);

  // Total economic loss: 6,750,000 + 6,460,000 = 13,210,000 BDT
  assert.equal(res.totalEconomicLossBdt, 13_210_000);

  // USD conversion: 13,210,000 / 120 = 110,083.33 USD
  assert.equal(res.totalEconomicLossUsd, 110083.33);

  // Immediate relief grant: 70% of sunk cost = 4,522,000 BDT -> 37,683.33 USD
  assert.equal(res.immediateReliefGrantBdt, 4_522_000);
  assert.equal(res.immediateReliefGrantUsd, 37683.33);
});

test('generateLossDossierText constructs valid UNFCCC loss dossier certificate', () => {
  const assessment = computeLossAndDamage({
    disasterTypeId: 'cyclone_surge',
    affectedAreaHa: 50,
    cropKey: 'aman',
  });

  const text = generateLossDossierText({
    upazilaNameEn: 'Sitakunda',
    districtNameEn: 'Chattogram',
    assessment,
    officerNameEn: 'Kalpana Rahman',
    dossierHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  });

  assert.ok(text.includes('WARSAW INTERNATIONAL MECHANISM FOR LOSS AND DAMAGE'));
  assert.ok(text.includes('SITAKUNDA, CHATTOGRAM, BANGLADESH'));
  assert.ok(text.includes('Copernicus Sentinel-1 SAR'));
  assert.ok(text.includes('50 Hectares'));
  assert.ok(text.includes('Kalpana Rahman'));
  assert.ok(text.includes('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'));
});
