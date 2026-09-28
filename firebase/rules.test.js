/**
 * Firebase Security Rules unit tests.
 *
 * Harness: @firebase/rules-unit-testing (official) against the Firestore and
 * Storage emulators, executed with the Node.js test runner via the CI workflow
 * (`node firebase/rules.test.js`).
 *
 * Verifies the deployed baseline:
 *   - Firestore: deny ALL client reads/writes (locked mode).
 *   - Storage:   public read on uploads/*, no client writes anywhere,
 *                no read on any other path.
 *
 * The backend always uses the Admin SDK, which bypasses rules, so deny-by-default
 * must not break the app — these tests pin exactly that contract.
 */
const {
  assertSucceeds,
  assertFails,
  initializeTestEnvironment,
} = require('@firebase/rules-unit-testing');
const {describe, it, before, after, beforeEach} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const PROJECT_ID = 'khadyabachao';
const BUCKET = `${PROJECT_ID}.firebasestorage.app`;

// Minimal valid 1x1 PNG; the Storage emulator needs real bytes to seed objects.
const ONE_BY_ONE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: fs.readFileSync('firebase/firestore.rules', 'utf8'),
    },
    storage: {
      rules: fs.readFileSync('firebase/storage.rules', 'utf8'),
      buckets: {default: BUCKET},
    },
  });
});

after(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

async function seedObject(destination) {
  // Seed with admin privileges — emulates the backend's Admin SDK writes.
  await testEnv.withSecurityRulesDisabled(async ctx => {
    await ctx
      .storage()
      .ref(destination)
      .put(ONE_BY_ONE_PNG, {contentType: 'image/png'});
  });
}

describe('Firestore rules: locked mode', () => {
  it('denies unauthenticated reads', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(db.collection('food_listings').get());
  });

  it('denies unauthenticated writes', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      db.collection('food_listings').doc('x').set({title: 'nope'}),
    );
  });

  it('denies reads even for authenticated users', async () => {
    const db = testEnv
      .authenticatedContext('some-uid', {email: 'user@example.com'})
      .firestore();
    await assertFails(db.collection('food_listings').get());
  });

  it('denies writes even for authenticated users', async () => {
    const db = testEnv
      .authenticatedContext('some-uid', {email: 'user@example.com'})
      .firestore();
    await assertFails(
      db.collection('food_listings').doc('x').set({title: 'nope'}),
    );
  });
});

describe('Storage rules: uploads/* public read, no client writes', () => {
  it('allows public (unauthenticated) read of uploads/*', async () => {
    await seedObject('uploads/test.png');
    const client = testEnv.unauthenticatedContext().storage();
    await assertSucceeds(client.ref('uploads/test.png').getMetadata());
  });

  it('denies unauthenticated write to uploads/*', async () => {
    const client = testEnv.unauthenticatedContext().storage();
    await assertFails(
      client
        .ref('uploads/evil.png')
        .put(ONE_BY_ONE_PNG, {contentType: 'image/png'}),
    );
  });

  it('denies authenticated overwrite of uploads/*', async () => {
    await seedObject('uploads/test.png');
    const client = testEnv.authenticatedContext('attacker-uid').storage();
    await assertFails(
      client
        .ref('uploads/test.png')
        .put(ONE_BY_ONE_PNG, {contentType: 'image/png'}),
    );
  });

  it('denies deletion of uploads/*', async () => {
    await seedObject('uploads/test.png');
    const client = testEnv.unauthenticatedContext().storage();
    await assertFails(client.ref('uploads/test.png').delete());
  });

  it('denies read of non-uploads paths', async () => {
    await seedObject('private/secret.txt');
    const client = testEnv.unauthenticatedContext().storage();
    await assertFails(client.ref('private/secret.txt').getMetadata());
  });
});
