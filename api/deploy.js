'use strict';
const https = require('https');

const TOKEN = process.env.VERCEL_TOKEN;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  try {
    const { html } = req.body;

    const deployment = await vercelPost('/v13/deployments?teamId=team_U1FGY8ZI2R13Zz3Pv15dSYiU', {
      name: 'miyasui-page',
      files: [{ file: 'index.html', data: html, encoding: 'utf-8' }],
      projectSettings: { framework: null }
    });

    res.status(200).json({
      deployId: deployment.id,
      siteId: deployment.id,
      siteUrl: `https://${deployment.url}`
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

function vercelPost(path, data) {
  return new Promise((resolve, reject) => {
    const body = Buffer.from(JSON.stringify(data), 'utf-8');
    const req = https.request({
      hostname: 'api.vercel.com',
      path,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': body.length
      }
    }, (r) => {
      const chunks = [];
      r.on('data', c => chunks.push(c));
      r.on('end', () => {
        const text = Buffer.concat(chunks).toString();
        if (r.statusCode >= 400) return reject(new Error(`Vercel ${r.statusCode}: ${text}`));
        resolve(JSON.parse(text));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}
