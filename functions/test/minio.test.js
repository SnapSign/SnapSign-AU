/**
 * MinIO Integration Tests
 *
 * Validates Firestore-based MinIO config and real S3 operations against
 * the configured endpoint/bucket.
 *
 * Config load priority:
 *   1. Firestore admin/minio (ADC required)
 *   2. Local file: test/.minio-test-config.json
 */

const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const {
  S3Client,
  HeadBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const PROJECT_ID = 'snapsign-au';
const LOCAL_CONFIG_PATH = path.join(__dirname, '.minio-test-config.json');

let adminApp = null;
let rawDoc;
let storageCfg;
let s3;

function resolveConfig(doc) {
  const mode = String(doc.mode || 'prod');
  const modeConfig = doc[mode] || {};
  return {
    endpoint: doc.endpoint || null,
    bucket: doc.bucket || null,
    region: doc.region || 'us-east-1',
    forcePathStyle: doc.forcePathStyle !== false,
    ...modeConfig,
    _mode: mode,
  };
}

async function loadRawConfig() {
  try {
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp({ projectId: PROJECT_ID });
    }
    adminApp = admin.app();
    const db = admin.firestore();

    const snap = await db.collection('admin').doc('minio').get();
    if (snap.exists) {
      console.log('  ✓ Config loaded from Firestore (admin/minio)\n');
      return snap.data();
    }
  } catch (e) {
    console.warn(`  ⚠ Firestore unavailable (${e.message?.slice(0, 80)})`);
    console.warn('    Falling back to local config file...\n');
    if (adminApp) {
      try { await adminApp.delete(); } catch (_) {}
      adminApp = null;
    }
  }

  if (fs.existsSync(LOCAL_CONFIG_PATH)) {
    const raw = fs.readFileSync(LOCAL_CONFIG_PATH, 'utf8');
    const cfg = JSON.parse(raw);
    console.log('  ✓ Config loaded from test/.minio-test-config.json\n');
    return cfg;
  }

  throw new Error(
    'Could not load MinIO config.\n' +
    '  Option A: gcloud auth application-default login\n' +
    '  Option B: node test/fetch-minio-config.js'
  );
}

async function streamToString(stream) {
  if (!stream) return '';
  if (typeof stream.transformToString === 'function') {
    return stream.transformToString();
  }
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

describe('MinIO Integration Tests', function () {
  this.timeout(30000);

  before(async () => {
    rawDoc = await loadRawConfig();
    storageCfg = resolveConfig(rawDoc);

    expect(storageCfg.endpoint).to.be.a('string').and.match(/^https?:\/\//);
    expect(storageCfg.bucket).to.be.a('string').and.not.empty;
    expect(storageCfg.accessKey).to.be.a('string').and.not.empty;
    expect(storageCfg.secretKey).to.be.a('string').and.not.empty;

    s3 = new S3Client({
      region: storageCfg.region,
      endpoint: storageCfg.endpoint,
      forcePathStyle: storageCfg.forcePathStyle,
      credentials: {
        accessKeyId: storageCfg.accessKey,
        secretAccessKey: storageCfg.secretKey,
      },
    });
  });

  after(async () => {
    if (adminApp) {
      try { await adminApp.delete(); } catch (_) {}
    }
  });

  describe('1 · Config Structure (admin/minio)', () => {
    it('should have mode and prod credentials', () => {
      expect(rawDoc.mode).to.be.oneOf(['test', 'prod']);
      expect(rawDoc.prod).to.be.an('object');
      expect(rawDoc.prod.accessKey).to.be.a('string').and.not.empty;
      expect(rawDoc.prod.secretKey).to.be.a('string').and.not.empty;
    });

    it('resolved config should provide endpoint/bucket and active credentials', () => {
      expect(storageCfg.endpoint).to.be.a('string').and.match(/^https?:\/\//);
      expect(storageCfg.bucket).to.be.a('string').and.not.empty;
      expect(storageCfg.accessKey).to.be.a('string').and.not.empty;
      expect(storageCfg.secretKey).to.be.a('string').and.not.empty;
    });
  });

  describe('2 · Bucket Reachability', () => {
    it('should access configured bucket', async () => {
      const result = await s3.send(new HeadBucketCommand({ Bucket: storageCfg.bucket }));
      expect(result.$metadata.httpStatusCode).to.be.oneOf([200, 204]);
    });
  });

  describe('3 · Direct S3 CRUD', () => {
    const objectKey = `integration/minio-test-${Date.now()}.txt`;
    const payload = `minio-integration-${Date.now()}`;

    it('should PUT object', async () => {
      const result = await s3.send(
        new PutObjectCommand({
          Bucket: storageCfg.bucket,
          Key: objectKey,
          Body: payload,
          ContentType: 'text/plain',
        })
      );
      expect(result.$metadata.httpStatusCode).to.be.oneOf([200, 201]);
    });

    it('should GET object with same content', async () => {
      const result = await s3.send(
        new GetObjectCommand({
          Bucket: storageCfg.bucket,
          Key: objectKey,
        })
      );
      const body = await streamToString(result.Body);
      expect(body).to.equal(payload);
    });

    it('should DELETE object', async () => {
      const result = await s3.send(
        new DeleteObjectCommand({
          Bucket: storageCfg.bucket,
          Key: objectKey,
        })
      );
      expect(result.$metadata.httpStatusCode).to.be.oneOf([200, 204]);
    });
  });

  describe('4 · Presigned URL Flow', () => {
    const objectKey = `integration/presign-test-${Date.now()}.txt`;
    const payload = `presign-integration-${Date.now()}`;

    after(async () => {
      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: storageCfg.bucket,
            Key: objectKey,
          })
        );
      } catch (_) {}
    });

    it('should upload and download via presigned URLs', async () => {
      const putUrl = await getSignedUrl(
        s3,
        new PutObjectCommand({
          Bucket: storageCfg.bucket,
          Key: objectKey,
          ContentType: 'text/plain',
        }),
        { expiresIn: 120 }
      );

      const putRes = await fetch(putUrl, {
        method: 'PUT',
        headers: { 'content-type': 'text/plain' },
        body: payload,
      });
      expect(putRes.status).to.be.oneOf([200, 204]);

      const getUrl = await getSignedUrl(
        s3,
        new GetObjectCommand({
          Bucket: storageCfg.bucket,
          Key: objectKey,
        }),
        { expiresIn: 120 }
      );

      const getRes = await fetch(getUrl);
      expect(getRes.status).to.equal(200);
      expect(await getRes.text()).to.equal(payload);
    });
  });
});
