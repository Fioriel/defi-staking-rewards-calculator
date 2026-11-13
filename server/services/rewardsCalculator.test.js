'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  MAX_CHART_SEGMENTS,
  CalculatorError,
  calculateRewards,
} = require('./rewardsCalculator');

const base = {
  principal: 1000,
  apy: 5,
  duration: 1,
  durationUnit: 'years',
  compoundingFrequency: 'annually',
};

test('annual compounding matches a one-step nominal rate', () => {
  const result = calculateRewards(base);
  assert.equal(result.projectedBalance, 1050);
  assert.equal(result.rewardsEarned, 50);
  assert.equal(result.duration.years, 1);
  assert.equal(result.rateInterpretation, 'nominal');
  assert.equal(result.periodsPerYear, 1);
});

test('daily compounding for 365 days matches one nominal year', () => {
  const result = calculateRewards({
    ...base,
    duration: 365,
    durationUnit: 'days',
    compoundingFrequency: 'daily',
  });
  const expected = 1000 * (1 + 0.05 / 365) ** 365;
  assert.ok(Math.abs(result.projectedBalance - expected) < 1e-9);
  assert.equal(result.duration.years, 1);
  assert.ok(result.projectedBalance > 1050);
  assert.ok(result.projectedBalance < 1051.3);
});

test('monthly compounding is the closed form for n = 12', () => {
  const result = calculateRewards({
    ...base,
    compoundingFrequency: 'monthly',
  });
  const expected = 1000 * (1 + 0.05 / 12) ** 12;
  assert.ok(Math.abs(result.projectedBalance - expected) < 1e-9);
  assert.ok(Math.abs(result.projectedBalance - 1051.161897881733) < 1e-9);
});

test('fractional duration of 1.5 years is supported', () => {
  const result = calculateRewards({
    ...base,
    duration: 1.5,
    compoundingFrequency: 'annually',
  });
  const expected = 1000 * 1.05 ** 1.5;
  assert.ok(Math.abs(result.projectedBalance - expected) < 1e-9);
  assert.equal(result.duration.years, 1.5);
});

test('zero APY returns the principal and zero rewards', () => {
  const result = calculateRewards({ ...base, apy: 0, compoundingFrequency: 'daily' });
  assert.equal(result.projectedBalance, 1000);
  assert.equal(result.rewardsEarned, 0);
  assert.ok(result.chart.every((point) => point.balance === 1000 && point.rewards === 0));
});

test('more frequent compounding produces a higher balance for the same nominal rate', () => {
  const annual = calculateRewards(base);
  const daily = calculateRewards({ ...base, compoundingFrequency: 'daily' });
  assert.ok(daily.projectedBalance > annual.projectedBalance);
});

test('chart starts at principal, ends at the closed-form balance, and stays within the point cap', () => {
  const result = calculateRewards({
    ...base,
    duration: 10,
    compoundingFrequency: 'daily',
  });
  assert.equal(result.chart[0].balance, 1000);
  assert.equal(result.chart[0].rewards, 0);
  assert.ok(Math.abs(result.chart.at(-1).balance - result.projectedBalance) < 1e-8);
  assert.ok(result.chart.length <= MAX_CHART_SEGMENTS + 1);
  for (let i = 1; i < result.chart.length; i += 1) {
    assert.ok(result.chart[i].balance >= result.chart[i - 1].balance);
  }
});

test('optional token price projects USD balances and is omitted when absent', () => {
  const priced = calculateRewards({ ...base, tokenPrice: 2 });
  assert.equal(priced.projectedBalanceUsd, 2100);
  assert.equal(priced.rewardsEarnedUsd, 100);

  const plain = calculateRewards(base);
  assert.equal(plain.tokenPrice, null);
  assert.equal(plain.projectedBalanceUsd, null);
  assert.equal(plain.rewardsEarnedUsd, null);
});

test('invalid and out-of-range inputs are rejected', () => {
  const cases = [
    [{ ...base, principal: 0 }, /principal/],
    [{ ...base, principal: -10 }, /principal/],
    [{ ...base, principal: Number.POSITIVE_INFINITY }, /principal/],
    [{ ...base, principal: '1000' }, /principal/],
    [{ ...base, apy: -0.01 }, /apy/],
    [{ ...base, apy: 1000.01 }, /apy/],
    [{ ...base, duration: 0 }, /duration/],
    [{ ...base, duration: -2 }, /duration/],
    [{ ...base, duration: 101, durationUnit: 'years' }, /100 years/],
    [{ ...base, durationUnit: 'weeks' }, /durationUnit/],
    [{ ...base, compoundingFrequency: 'hourly' }, /compoundingFrequency/],
    [{ ...base, tokenPrice: 0 }, /tokenPrice/],
    [{ ...base, tokenPrice: -1 }, /tokenPrice/],
    [null, /JSON object/],
    [[base], /JSON object/],
  ];

  for (const [input, pattern] of cases) {
    assert.throws(() => calculateRewards(input), (error) => {
      assert.ok(error instanceof CalculatorError);
      assert.equal(error.status, 400);
      assert.match(error.message, pattern);
      return true;
    });
  }
});
