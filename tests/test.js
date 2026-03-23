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

test('exports containsCssOrHtml function', async () => {
  const plugin = await import(pluginPath);
  assert(typeof plugin.containsCssOrHtml === 'function', 'Should export containsCssOrHtml');
});

test('exports isLikelyTailwindClasses function', async () => {
  const plugin = await import(pluginPath);
  assert(typeof plugin.isLikelyTailwindClasses === 'function', 'Should export isLikelyTailwindClasses');
});

console.log('\nChecking CSS/HTML detection...');

test('containsCssOrHtml rejects inline CSS in style attribute', async () => {
  const { containsCssOrHtml } = await import(pluginPath);
  assert(containsCssOrHtml('<div style="display: flex;">'), 'Should reject style attribute');
  assert(containsCssOrHtml("<div style='color: red;'>"), 'Should reject style attribute with single quotes');
});

test('containsCssOrHtml rejects HTML tags', async () => {
  const { containsCssOrHtml } = await import(pluginPath);
  assert(containsCssOrHtml('<div class="foo">'), 'Should reject HTML tags');
  assert(containsCssOrHtml('<p>text</p>'), 'Should reject HTML with closing tag');
  assert(containsCssOrHtml('<style>'), 'Should reject <style> tag');
  assert(containsCssOrHtml('<style>@keyframes spin'), 'Should reject <style> tag with content');
});

test('containsCssOrHtml rejects CSS declarations', async () => {
  const { containsCssOrHtml } = await import(pluginPath);
  assert(containsCssOrHtml('border-top: 4px solid #3498db'), 'Should reject CSS with semicolon-colon pattern');
  assert(containsCssOrHtml('flex-direction: column'), 'Should reject CSS declarations');
  assert(containsCssOrHtml('color: #666'), 'Should reject CSS declarations');
});

test('containsCssOrHtml allows valid Tailwind classes', async () => {
  const { containsCssOrHtml } = await import(pluginPath);
  assert(!containsCssOrHtml('bg-red-100 text-red-600'), 'Should allow valid Tailwind');
  assert(!containsCssOrHtml('flex-grow p-4'), 'Should allow valid Tailwind');
  assert(!containsCssOrHtml('hover:bg-blue-500 focus:ring-2'), 'Should allow valid Tailwind with variants');
});

test('isLikelyTailwindClasses rejects CSS content from RepassesList.vue', async () => {
  const { isLikelyTailwindClasses } = await import(pluginPath);
  assert(!isLikelyTailwindClasses('<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; color: #666;">'), 'Should reject full HTML div with CSS');
  assert(!isLikelyTailwindClasses('<div style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite;"></div>'), 'Should reject spinner CSS');
  assert(!isLikelyTailwindClasses('@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }'), 'Should reject @keyframes');
  assert(!isLikelyTailwindClasses('<style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>'), 'Should reject <style> block');
});

test('isLikelyTailwindClasses allows valid Tailwind classes', async () => {
  const { isLikelyTailwindClasses } = await import(pluginPath);
  assert(isLikelyTailwindClasses('bg-red-100 text-red-600'), 'Should allow bg/text classes');
  assert(isLikelyTailwindClasses('flex-grow p-4'), 'Should allow flex-grow and p-4');
  assert(isLikelyTailwindClasses('hover:bg-blue-500 focus:ring-2'), 'Should allow variant classes');
  assert(isLikelyTailwindClasses('text-(--primary)'), 'Should allow CSS variable syntax');
  assert(isLikelyTailwindClasses('bg-(--primary)/10'), 'Should allow CSS variable with opacity');
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
