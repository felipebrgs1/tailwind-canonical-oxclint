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

console.log('\nChecking Vue template extraction...');

test('exports extractTemplate function', async () => {
  const plugin = await import(pluginPath);
  assert(typeof plugin.extractTemplate === 'function', 'Should export extractTemplate');
});

test('exports extractVueClasses function', async () => {
  const plugin = await import(pluginPath);
  assert(typeof plugin.extractVueClasses === 'function', 'Should export extractVueClasses');
});

test('extractTemplate extracts template content', async () => {
  const { extractTemplate } = await import(pluginPath);
  const vue = `<template>\n  <div class="flex-grow">Hi</div>\n</template>\n<script>const x = 1</script>`;
  const result = extractTemplate(vue);
  assert(result !== null, 'Should find template');
  assert(result.content.includes('flex-grow'), 'Should contain template content');
  assert(result.start > 0, 'Should have positive start offset');
});

test('extractTemplate returns null for non-Vue files', async () => {
  const { extractTemplate } = await import(pluginPath);
  const js = `const x = 1;`;
  const result = extractTemplate(js);
  assert(result === null, 'Should return null for JS');
});

test('extractVueClasses finds static class attributes', async () => {
  const { extractVueClasses } = await import(pluginPath);
  const source = `<template>\n  <div class="flex-grow p-4">Hi</div>\n</template>`;
  const template = extractTemplate(source);
  const results = extractVueClasses(source, template.content, template.start);
  assert(results.length >= 1, 'Should find at least one class attribute');
  assert(results[0].value === 'flex-grow p-4', 'Should extract correct value');
  assert(results[0].attrName === 'class', 'Should detect class attribute');
  assert(results[0].isDynamic === false, 'Should be static');
});

test('extractVueClasses finds :class bindings with string literals', async () => {
  const { extractVueClasses } = await import(pluginPath);
  const source = `<template>\n  <button :class="isActive ? 'flex-grow' : 'shrink-0'">\n</template>`;
  const template = extractTemplate(source);
  const results = extractVueClasses(source, template.content, template.start);
  assert(results.length === 2, 'Should find two string literals from :class');
  const values = results.map(r => r.value);
  assert(values.includes('flex-grow'), 'Should find flex-grow');
  assert(values.includes('shrink-0'), 'Should find shrink-0');
  assert(results[0].isDynamic === true, 'Should be dynamic');
});

test('extractVueClasses finds v-bind:class bindings', async () => {
  const { extractVueClasses } = await import(pluginPath);
  const source = `<template>\n  <a v-bind:class="'hover:flex-grow'">\n</template>`;
  const template = extractTemplate(source);
  const results = extractVueClasses(source, template.content, template.start);
  assert(results.length === 1, 'Should find one string literal from v-bind:class');
  assert(results[0].value === 'hover:flex-grow', 'Should extract correct value');
  assert(results[0].attrName === 'v-bind:class', 'Should detect v-bind:class');
});

test('extractVueClasses skips non-Tailwind class values', async () => {
  const { extractVueClasses } = await import(pluginPath);
  const source = `<template>\n  <div class="my-custom-class">Hi</div>\n</template>`;
  const template = extractTemplate(source);
  const results = extractVueClasses(source, template.content, template.start);
  assert(results.length === 0, 'Should skip non-Tailwind classes');
});

test('extractVueClasses handles multiple class attributes', async () => {
  const { extractVueClasses } = await import(pluginPath);
  const source = `<template>\n  <div class="flex-grow">\n    <span class="bg-gradient-to-r">\n  </div>\n</template>`;
  const template = extractTemplate(source);
  const results = extractVueClasses(source, template.content, template.start);
  assert(results.length === 2, 'Should find two class attributes');
  const values = results.map(r => r.value);
  assert(values.includes('flex-grow'), 'Should find flex-grow');
  assert(values.includes('bg-gradient-to-r'), 'Should find bg-gradient-to-r');
});

test('extractVueClasses computes correct file positions', async () => {
  const { extractVueClasses } = await import(pluginPath);
  const source = `<template>\n  <div class="flex-grow">Hi</div>\n</template>`;
  const template = extractTemplate(source);
  const results = extractVueClasses(source, template.content, template.start);
  assert(results.length === 1, 'Should find one class');
  const ext = results[0];
  const extractedValue = source.slice(ext.start, ext.end - 1);
  assert(extractedValue === 'flex-grow', `Extracted value should match: got "${extractedValue}"`);
  const withQuotes = source.slice(ext.start - 1, ext.end);
  assert(withQuotes === '"flex-grow"', `With quotes should match: got "${withQuotes}"`);
});

test('Vue test fixture file exists', () => {
  assert(fs.existsSync(path.resolve(__dirname, 'fixtures/test.vue')), 'test.vue fixture should exist');
});

console.log('\n========================================');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('========================================\n');

if (failed > 0) {
  process.exit(1);
}
