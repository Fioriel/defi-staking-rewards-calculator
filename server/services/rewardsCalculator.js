'use strict';

/**
 * Staking rewards engine.
 *
 * `apy` is a nominal annual rate in percent, not effective APY.
 * Effective APY already includes compounding, so the terminal balance would
 * not depend on frequency. This module uses the assessment formula as written:
 *
 *   A = P * (1 + r / n) ^ (n * t)
 *
 *   P  principal
 *   r  nominal annual rate as a decimal (apy / 100)
 *   n  compounding periods per year
 *   t  duration in years
 *   A  projected balance
 *
 * One balance is O(1). A chart of k points is O(k) time and O(k) space.
 * The chart samples at most MAX_CHART_SEGMENTS steps. The quoted balance is
 * always the closed form, and the last chart point uses the full duration,
 * so it matches that balance.
 *
 * A year is 365 days. Weekly compounding uses 52 periods.
 */

const DAYS_PER_YEAR = 365;
const MAX_CHART_SEGMENTS = 120;
const MAX_YEARS = 100;
const MAX_PRINCIPAL = 1e15;
const MAX_APY = 1000;
const MAX_TOKEN_PRICE = 1e12;

const PERIODS_PER_YEAR = Object.freeze({
  daily: 365,
  weekly: 52,
  monthly: 12,
  annually: 1,
});

class CalculatorError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CalculatorError';
    this.status = 400;
  }
}

function assertFiniteNumber(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new CalculatorError(`${name} must be a finite number`);
  }
}

function validateInput(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new CalculatorError('Request body must be a JSON object');
  }

  const {
    principal,
    apy,
    duration,
    durationUnit,
    compoundingFrequency,
  } = body;

  assertFiniteNumber(principal, 'principal');
  if (principal <= 0 || principal > MAX_PRINCIPAL) {
    throw new CalculatorError('principal must be greater than 0 and at most 1e15');
  }

  assertFiniteNumber(apy, 'apy');
  if (apy < 0 || apy > MAX_APY) {
    throw new CalculatorError('apy must be between 0 and 1000');
  }

  assertFiniteNumber(duration, 'duration');
  if (duration <= 0) {
    throw new CalculatorError('duration must be greater than 0');
  }

  if (durationUnit !== 'days' && durationUnit !== 'years') {
    throw new CalculatorError('durationUnit must be "days" or "years"');
  }

  const years = durationUnit === 'years' ? duration : duration / DAYS_PER_YEAR;
  if (years > MAX_YEARS) {
    throw new CalculatorError('duration must not exceed 100 years');
  }

  if (!Object.prototype.hasOwnProperty.call(PERIODS_PER_YEAR, compoundingFrequency)) {
    throw new CalculatorError(
      'compoundingFrequency must be daily, weekly, monthly, or annually'
    );
  }

  let tokenPrice = null;
  if (Object.prototype.hasOwnProperty.call(body, 'tokenPrice')) {
    assertFiniteNumber(body.tokenPrice, 'tokenPrice');
    if (body.tokenPrice <= 0 || body.tokenPrice > MAX_TOKEN_PRICE) {
      throw new CalculatorError('tokenPrice must be greater than 0 and at most 1e12');
    }
    tokenPrice = body.tokenPrice;
  }

  return {
    principal,
    apy,
    duration,
    durationUnit,
    compoundingFrequency,
    tokenPrice,
    years,
    periodsPerYear: PERIODS_PER_YEAR[compoundingFrequency],
    nominalRate: apy / 100,
  };
}

function balanceAt(principal, nominalRate, periodsPerYear, years) {
  if (nominalRate === 0 || years === 0) {
    return principal;
  }
  return principal * (1 + nominalRate / periodsPerYear) ** (periodsPerYear * years);
}

function buildChart(input) {
  const steps = Math.max(1, Math.ceil(input.periodsPerYear * input.years));
  const segments = Math.min(steps, MAX_CHART_SEGMENTS);
  const points = new Array(segments + 1);

  for (let i = 0; i <= segments; i += 1) {
    const yearFraction = (input.years * i) / segments;
    const balance = balanceAt(
      input.principal,
      input.nominalRate,
      input.periodsPerYear,
      yearFraction
    );
    points[i] = {
      index: i,
      yearFraction,
      balance,
      rewards: balance - input.principal,
    };
  }

  return points;
}

function calculateRewards(body) {
  const input = validateInput(body);
  const projectedBalance = balanceAt(
    input.principal,
    input.nominalRate,
    input.periodsPerYear,
    input.years
  );
  const rewardsEarned = projectedBalance - input.principal;
  const price = input.tokenPrice;

  return {
    principal: input.principal,
    apy: input.apy,
    rateInterpretation: 'nominal',
    compoundingFrequency: input.compoundingFrequency,
    periodsPerYear: input.periodsPerYear,
    duration: {
      value: input.duration,
      unit: input.durationUnit,
      years: input.years,
    },
    projectedBalance,
    rewardsEarned,
    tokenPrice: price,
    projectedBalanceUsd: price == null ? null : projectedBalance * price,
    rewardsEarnedUsd: price == null ? null : rewardsEarned * price,
    chart: buildChart(input),
  };
}

module.exports = {
  DAYS_PER_YEAR,
  MAX_CHART_SEGMENTS,
  PERIODS_PER_YEAR,
  CalculatorError,
  validateInput,
  balanceAt,
  buildChart,
  calculateRewards,
};
