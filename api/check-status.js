'use strict';
const https = require('https');

const TOKEN = process.env.VERCEL_TOKEN;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const { deployId } = req.query;
  if (!deployId) return res.status(400).end('Missing deployId');

  try {
    const deployment = await vercelGet(`/v13/deployments/${deployId}`);
    const rs = deployment.readyState;

    let state = 'building';
    if (rs === 'READY') state = 'ready';
    if (rs === 'ERROR' || rs === 'CANCELED') state = 'error';

    res.status(200).json({ state, url: `https://${deployment.url}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

function vercelGet(path) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.vercel.com',
      path,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    }, (r) => {
      const chunks = [];
      r.on('data', c => chunks.push(c));
      r.on('end', () => {
        const text = Buffer.concat(chunks).toString();
        if (r.statusCode >= 400) return reject(new Error(`${r.statusCode}: ${text}`));
        resolve(JSON.parse(text));
      });
    });
    req.on('error', reject);
    req.end();
  });
}
