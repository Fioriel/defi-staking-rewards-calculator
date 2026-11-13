# DeFi Dashboard · Staking Rewards Calculator

The staking calculator is part of the existing dashboard. It posts to `/api/calculate-rewards` on the same host and renders the projected balance, rewards, and a growth chart.

Locally, the API listens on `127.0.0.1`. On Vercel, the same route is a serverless function. There is no database and no third-party data service.

## Live preview

https://defi-staking-rewards-calculator.vercel.app/dashboard

The Vercel project is connected to this GitHub repository, so a push to `main` publishes a new production build.

## Setup

Node.js 18 or later.

```bash
npm install --ignore-scripts
npm test
npm start
```

- Dashboard during development: http://127.0.0.1:3010/dashboard
- API: http://127.0.0.1:5025/api/calculate-rewards

To serve the built dashboard and the API from one address:

```bash
npm run build
npm run server
```

Then open http://127.0.0.1:5025/dashboard. The page calls `/api/calculate-rewards` on that same server.

The dev server port and host are set in `.env.development` (`PORT=3010`, `HOST=127.0.0.1`). Port 3000 is left alone because another local process may already be using it. `npm start` runs the API and the React dev server together. Set `API_PORT` to move the local API. The page always calls `/api/calculate-rewards` on its own host.

## API

`POST /api/calculate-rewards`

```json
{
  "principal": 1000,
  "apy": 5,
  "duration": 365,
  "durationUnit": "days",
  "compoundingFrequency": "daily",
  "tokenPrice": 2
}
```

`tokenPrice` is optional. `durationUnit` is `days` or `years`. `compoundingFrequency` is `daily`, `weekly`, `monthly`, or `annually`.

A valid body returns the projected balance, rewards, the duration normalized to years, periods per year, optional USD figures, and chart points. Invalid JSON or out-of-range fields return `400` with `{ "error": "..." }`. Unexpected failures return `500` with `{ "error": "Internal Server Error" }` and do not stop the process.

## Mathematical assumptions

`apy` is a **nominal annual rate in percent**, not effective APY. Effective APY already includes compounding, so the ending balance would not change with frequency. The calculator uses the compound-interest formula consistently:

```
A = P * (1 + r / n) ^ (n * t)
```

- `P` is principal
- `r` is `apy / 100`
- `n` is 365, 52, 12, or 1
- `t` is duration in years
- one year is 365 days, so 365 days and 1 year are the same duration
- fractional durations such as 1.5 years are evaluated directly with a fractional exponent
- an APY of 0 returns the principal and zero rewards

A single balance is closed form: **O(1)** time and **O(1)** extra space. The chart builds `k` points, capped at 121 (120 segments plus the start), so it is **O(k)** time and **O(k)** space. The quoted balance is the closed form. The last chart point uses the full duration, so it matches that balance.

## Architecture

- `server/services/rewardsCalculator.js` is the pure calculation and validation module. It does not know about HTTP.
- `server/app.js` is the Express app: loopback CORS, JSON parsing, the route, and one error handler.
- `server.js` binds the app to `127.0.0.1`.
- `src/components/staking-calculator/` is the dashboard widget. It keeps idle, loading, success, and error states, validates before the request, and draws the chart in SVG so no chart package is required.

The stock social-network routes that shipped with the template are not mounted. They were unused by this dashboard and included calls that left the machine. The widget follows the dashboard's teal, navy, and paper surfaces, including the active light or dark palette.

## Tests

```bash
npm test
```

The suite covers annual, monthly, and daily compounding, a 1.5 year duration, zero APY, chart bounds, token-price projections, rejected inputs, `400` responses, a `500` response that hides internal details, and the loopback CORS rule.
