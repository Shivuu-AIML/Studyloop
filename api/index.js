require('dotenv').config();
const connectDB = require('../config/db');
const createApp = require('../app');

const app = createApp();

if (globalThis.__studyLoopDbPromise === undefined) {
  globalThis.__studyLoopDbPromise = connectDB();
}

module.exports = async (req, res) => {
  try {
    await globalThis.__studyLoopDbPromise;
  } catch (err) {
    res.writeHead(500, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'Database unavailable: ' + err.message }));
    return;
  }
  app(req, res);
};