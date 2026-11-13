'use strict';

const { createApp } = require('./server/app');

const PORT = Number(process.env.API_PORT) || 5025;
const HOST = '127.0.0.1';

createApp().listen(PORT, HOST, () => {
  console.log(`Calculator API listening on http://${HOST}:${PORT}`);
});
