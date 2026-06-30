'use strict';
const https = require('https');

const TOKEN = process.env.NETLIFY_TOKEN;

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors(), body: '' };
  }

  const { siteId, deployId } = event.queryStringParameters || {};
  if (!siteId || !deployId) {
    return { statusCode: 400, body: 'Missing siteId or deployId' };
  }

  try {
    const status = await netlifyGET(`/sites/${siteId}/deploys/${deployId}`);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', ...cors() },
      body: JSON.stringify({
        state: status.state,
        url: status.ssl_url || status.url
      })
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', ...cors() },
      body: JSON.stringify({ error: e.message })
    };
  }
};

function cors() {
  return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' };
}

function netlifyGET(path) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.netlify.com',
      path: `/api/v1${path}`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString();
        if (res.statusCode >= 400) return reject(new Error(`${res.statusCode}: ${text}`));
        resolve(JSON.parse(text));
      });
    });
    req.on('error', reject);
    req.end();
  });
}
