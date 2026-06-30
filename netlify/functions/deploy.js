'use strict';
const https = require('https');
const crypto = require('crypto');

const TOKEN = process.env.NETLIFY_TOKEN;

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors(), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { html } = JSON.parse(event.body);
    const contentBytes = Buffer.from(html, 'utf-8');
    const sha1 = crypto.createHash('sha1').update(contentBytes).digest('hex');

    // サイト作成
    const siteName = `miyasui-html-${Date.now()}`;
    const site = await netlifyJSON('POST', '/sites', { name: siteName });

    // デプロイ開始（ファイルダイジェスト方式）
    const deploy = await netlifyJSON('POST', `/sites/${site.id}/deploys`, {
      files: { '/index.html': sha1 }
    });

    // Netlifyがファイルを必要としている場合のみアップロード
    if (deploy.required && deploy.required.includes(sha1)) {
      await netlifyPUT(`/deploys/${deploy.id}/files/index.html`, contentBytes);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', ...cors() },
      body: JSON.stringify({
        deployId: deploy.id,
        siteId: site.id,
        siteUrl: site.ssl_url || site.url
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

function netlifyJSON(method, path, data) {
  return new Promise((resolve, reject) => {
    const body = Buffer.from(JSON.stringify(data), 'utf-8');
    const req = https.request({
      hostname: 'api.netlify.com',
      path: `/api/v1${path}`,
      method,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': body.length
      }
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString();
        if (res.statusCode >= 400) return reject(new Error(`Netlify ${res.statusCode}: ${text}`));
        resolve(JSON.parse(text));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function netlifyPUT(path, contentBytes) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.netlify.com',
      path: `/api/v1${path}`,
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/octet-stream',
        'Content-Length': contentBytes.length
      }
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString();
        if (res.statusCode >= 400) return reject(new Error(`PUT ${res.statusCode}: ${text}`));
        resolve(JSON.parse(text));
      });
    });
    req.on('error', reject);
    req.write(contentBytes);
    req.end();
  });
}
