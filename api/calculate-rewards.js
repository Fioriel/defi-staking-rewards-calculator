'use strict';

const { calculateRewards, CalculatorError } = require('../server/services/rewardsCalculator');

function readBody(req) {
  if (req.body == null || req.body === '') {
    return {};
  }
  if (typeof req.body === 'string') {
    return JSON.parse(req.body);
  }
  if (Buffer.isBuffer(req.body)) {
    return JSON.parse(req.body.toString('utf8'));
  }
  return req.body;
}

module.exports = (req, res) => {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    res.status(200).json(calculateRewards(readBody(req)));
  } catch (err) {
    if (err instanceof SyntaxError) {
      res.status(400).json({ error: 'Request body must be valid JSON' });
      return;
    }
    if (err instanceof CalculatorError || err.status === 400) {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
