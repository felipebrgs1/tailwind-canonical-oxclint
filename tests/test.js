import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('Testing oxlint-tailwind-canonical-classes plugin...\n');

const pluginPath = path.resolve(__dirname, '../plugin.js');
const workerPath = path.resolve(__dirname, '../worker.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (error) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${error.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

console.log('Checking files exist...');

test('plugin.js exists', () => {
  assert(fs.existsSync(pluginPath), 'plugin.js should exist');
});

test('worker.js exists', () => {
  assert(fs.existsSync(workerPath), 'worker.js should exist');
});

console.log('\nChecking plugin structure...');

test('plugin exports default object', async () => {
  const plugin = await import(pluginPath);
  assert(plugin.default, 'Should have default export');
  assert(plugin.default.meta, 'Should have meta');
  assert(plugin.default.meta.name === 'tailwind-canonical-classes', 'Should have correct name');
  assert(plugin.default.rules, 'Should have rules');
  assert(plugin.default.rules.canonical, 'Should have canonical rule');
});

test('canonical rule has correct meta', async () => {
  const plugin = await import(pluginPath);
  const rule = plugin.default.rules.canonical;
  assert(rule.meta.type === 'suggestion', 'Should be suggestion type');
  assert(rule.meta.fixable === 'code', 'Should be fixable');
  assert(rule.meta.schema.length > 0, 'Should have schema');
});

test('canonical rule has create function', async () => {
  const plugin = await import(pluginPath);
  const rule = plugin.default.rules.canonical;
  assert(typeof rule.create === 'function', 'Should have create function');
});

console.log('\nChecking package.json...');

test('package.json has correct fields', () => {
  const pkg = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8')
  );
  assert(pkg.name === 'oxlint-tailwind-canonical-classes', 'Should have correct name');
  assert(pkg.peerDependencies['@tailwindcss/node'], 'Should have @tailwindcss/node as peer dep');
});

console.log('\n========================================');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('========================================\n');

if (failed > 0) {
  process.exit(1);
}
