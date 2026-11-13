'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createApp, errorHandler } = require('./app');

async function withServer(fn) {
  const server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  try {
    await fn(port);
  } finally {
    if (typeof server.closeAllConnections === 'function') {
      server.closeAllConnections();
    }
    server.close();
    await once(server, 'close');
  }
}

async function post(port, body, headers = {}) {
  const response = await fetch(`http://127.0.0.1:${port}/api/calculate-rewards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://127.0.0.1:3000', ...headers },
    body,
  });
  const text = await response.text();
  return {
    status: response.status,
    allowOrigin: response.headers.get('access-control-allow-origin'),
    body: text ? JSON.parse(text) : null,
  };
}

test('POST /api/calculate-rewards returns balance, rewards, duration, and chart data', async () => {
  await withServer(async (port) => {
    const response = await post(port, JSON.stringify({
      principal: 1000,
      apy: 5,
      duration: 365,
      durationUnit: 'days',
      compoundingFrequency: 'daily',
    }));

    assert.equal(response.status, 200);
    assert.equal(response.allowOrigin, 'http://127.0.0.1:3000');
    assert.equal(response.body.duration.years, 1);
    assert.equal(response.body.rewardsEarned, response.body.projectedBalance - 1000);
    assert.ok(response.body.chart.length >= 2);
    assert.equal(response.body.chart[0].balance, 1000);
  });
});

test('invalid requests return 400 and do not crash the server', async () => {
  await withServer(async (port) => {
    const invalid = await post(port, JSON.stringify({
      principal: -1,
      apy: 5,
      duration: 365,
      durationUnit: 'days',
      compoundingFrequency: 'daily',
    }));
    assert.equal(invalid.status, 400);
    assert.match(invalid.body.error, /principal/);

    const malformed = await post(port, '{');
    assert.equal(malformed.status, 400);
    assert.equal(malformed.body.error, 'Request body must be valid JSON');

    const stillAlive = await post(port, JSON.stringify({
      principal: 1000,
      apy: 0,
      duration: 1,
      durationUnit: 'years',
      compoundingFrequency: 'annually',
    }));
    assert.equal(stillAlive.status, 200);
    assert.equal(stillAlive.body.projectedBalance, 1000);
  });
});

test('unexpected failures return 500 without an internal message', () => {
  const res = {
    headersSent: false,
    statusCode: 0,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };

  errorHandler(new Error('database password leaked'), {}, res, () => {});
  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.payload, { error: 'Internal Server Error' });
});

test('non-local origins are not reflected', async () => {
  await withServer(async (port) => {
    const response = await fetch(`http://127.0.0.1:${port}/api/calculate-rewards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://example.com',
      },
      body: JSON.stringify({
        principal: 1000,
        apy: 0,
        duration: 1,
        durationUnit: 'years',
        compoundingFrequency: 'annually',
      }),
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), null);
  });
});
