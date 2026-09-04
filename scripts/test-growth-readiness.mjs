import assert from 'node:assert/strict';
import { growthIntegrationReadiness } from '../api/brain-chat.mjs';

const empty = growthIntegrationReadiness({});
assert.equal(empty.length, 4);
assert.equal(empty.find(item => item.id === 'supabase-auth').status, 'verified');
assert.ok(empty.filter(item => item.id !== 'supabase-auth').every(item => item.status === 'not_configured'));

const configured = growthIntegrationReadiness({
  GROWTH_SUPABASE_ENABLED: 'true',
  GROWTH_SUPABASE_SCHEMA_VERSION: '1',
  GOOGLE_DRIVE_CLIENT_EMAIL: 'service@example.invalid',
  GOOGLE_DRIVE_PRIVATE_KEY: 'PRIVATE-SECRET',
  GOOGLE_DRIVE_ROOT_FOLDER_ID: 'folder-secret',
  METRICOOL_API_TOKEN: 'TOKEN-SECRET',
  METRICOOL_USER_ID: 'user-secret',
  METRICOOL_BLOG_ID: 'blog-secret'
});

assert.ok(configured.filter(item => item.id !== 'supabase-auth').every(item => item.status === 'configured'));
const responseShape = JSON.stringify(configured);
for (const secret of ['PRIVATE-SECRET', 'folder-secret', 'TOKEN-SECRET', 'user-secret', 'blog-secret']) {
  assert.equal(responseShape.includes(secret), false, 'La respuesta nunca debe reflejar secretos');
}
assert.match(responseShape, /GOOGLE_DRIVE_CLIENT_EMAIL/);
assert.match(responseShape, /METRICOOL_API_TOKEN/);

console.log('Growth readiness: estados honestos y no exposición de secretos verificados.');
