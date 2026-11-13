'use strict';

const express = require('express');
const { calculateRewards, CalculatorError } = require('./services/rewardsCalculator');

const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    next(err);
    return;
  }

  const malformedJson = err instanceof SyntaxError && err.status === 400 && 'body' in err;
  if (malformedJson) {
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

function createApp() {
  const app = express();
  app.disable('x-powered-by');

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (typeof origin === 'string' && LOCAL_ORIGIN.test(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.use(express.json({ limit: '16kb' }));

  app.post('/api/calculate-rewards', (req, res, next) => {
    try {
      res.json(calculateRewards(req.body));
    } catch (err) {
      next(err);
    }
  });

  app.use(errorHandler);
  return app;
}

module.exports = { createApp, errorHandler };
