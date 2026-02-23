#!/usr/bin/env node
'use strict';
const https = require('https');

function post(host, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request(
      {
        hostname: host,
        path,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...headers },
      },
      res => {
        let d = '';
        res.on('data', c => (d += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(d) });
          } catch (e) {
            resolve({ status: res.statusCode, body: d });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

(async () => {
  const API_KEY = 'AIzaSyDqow-DLrBOZGUbGCN2nxpMCqXcbqDQe5Q';

  console.log('Creating anon user...');
  const signup = await post(
    'identitytoolkit.googleapis.com',
    `/v1/accounts:signUp?key=${API_KEY}`,
    { returnSecureToken: true }
  );
  const idToken = signup.body.idToken;
  const uid = signup.body.localId;
  console.log('Anon uid:', uid);

  const docHash = 'a'.repeat(64);
  const text = [
    'Invoice Number: INV-2024-001',
    'Due Date: 2024-02-28',
    'Total Amount Due: $1,200.00',
    'Please pay within 30 days of the invoice date.',
    'Late fees of 2% per month apply after the due date.',
  ].join('\n');

  console.log('\nCalling analyzeText...');
  const result = await post(
    'analyzetext-ylrliabaza-uc.a.run.app',
    '/',
    { data: { docHash, text: { value: text }, stats: { totalChars: text.length }, options: {} } },
    { Authorization: `Bearer ${idToken}` }
  );
  console.log('Status:', result.status);
  console.log('Body:', JSON.stringify(result.body, null, 2).slice(0, 3000));

  console.log('\nCalling explainSelection...');
  const expResult = await post(
    'explainselection-ylrliabaza-uc.a.run.app',
    '/',
    {
      data: {
        docHash,
        selection: 'Late fees of 2% per month apply after the due date.',
        documentContext: 'Invoice',
      },
    },
    { Authorization: `Bearer ${idToken}` }
  );
  console.log('explainSelection status:', expResult.status);
  console.log('explainSelection body:', JSON.stringify(expResult.body, null, 2).slice(0, 2000));
})().catch(err => console.error('Top-level error:', err));
