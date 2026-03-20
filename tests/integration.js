import { createSyncFn } from 'synckit';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workerPath = path.resolve(__dirname, '../worker.js');
const cssPath = path.resolve(__dirname, './fixtures/test.css');

console.log('Testing Tailwind CSS v4 canonicalization...\n');

if (!fs.existsSync(cssPath)) {
  console.error('Test CSS file not found:', cssPath);
  process.exit(1);
}

const canonicalizeSync = createSyncFn(workerPath);

const testCases = [
  // ===== Flex renomeações (v3 -> v4) =====
  { name: 'flex-grow -> grow', input: ['flex-grow'], expected: ['grow'] },
  { name: 'flex-grow-1 -> grow', input: ['flex-grow-1'], expected: ['grow'] },
  { name: 'flex-grow-0 -> grow-0', input: ['flex-grow-0'], expected: ['grow-0'] },
  { name: 'flex-shrink -> shrink', input: ['flex-shrink'], expected: ['shrink'] },
  { name: 'flex-shrink-0 -> shrink-0', input: ['flex-shrink-0'], expected: ['shrink-0'] },
  { name: 'flex-shrink-1 -> shrink', input: ['flex-shrink-1'], expected: ['shrink'] },
  { name: 'grow-1 -> grow', input: ['grow-1'], expected: ['grow'] },

  // ===== Gradient (bg-gradient -> bg-linear) =====
  { name: 'bg-gradient-to-r -> bg-linear-to-r', input: ['bg-gradient-to-r'], expected: ['bg-linear-to-r'] },
  { name: 'bg-gradient-to-l -> bg-linear-to-l', input: ['bg-gradient-to-l'], expected: ['bg-linear-to-l'] },
  { name: 'bg-gradient-to-t -> bg-linear-to-t', input: ['bg-gradient-to-t'], expected: ['bg-linear-to-t'] },
  { name: 'bg-gradient-to-b -> bg-linear-to-b', input: ['bg-gradient-to-b'], expected: ['bg-linear-to-b'] },
  { name: 'bg-gradient-to-br -> bg-linear-to-br', input: ['bg-gradient-to-br'], expected: ['bg-linear-to-br'] },
  { name: 'bg-gradient-to-bl -> bg-linear-to-bl', input: ['bg-gradient-to-bl'], expected: ['bg-linear-to-bl'] },
  { name: 'bg-gradient-to-tr -> bg-linear-to-tr', input: ['bg-gradient-to-tr'], expected: ['bg-linear-to-tr'] },
  { name: 'bg-gradient-to-tl -> bg-linear-to-tl', input: ['bg-gradient-to-tl'], expected: ['bg-linear-to-tl'] },

  // ===== Arbitrary values -> canônicos =====
  { name: 'grow-[2] -> grow-2', input: ['grow-[2]'], expected: ['grow-2'] },
  { name: 'shrink-[2] -> shrink-2', input: ['shrink-[2]'], expected: ['shrink-2'] },
  { name: 'grow-[3] -> grow-3', input: ['grow-[3]'], expected: ['grow-3'] },

  // ===== Com variantes =====
  { name: 'hover:flex-grow -> hover:grow', input: ['hover:flex-grow'], expected: ['hover:grow'] },
  { name: 'focus:flex-shrink-0 -> focus:shrink-0', input: ['focus:flex-shrink-0'], expected: ['focus:shrink-0'] },
  { name: 'sm:flex-grow -> sm:grow', input: ['sm:flex-grow'], expected: ['sm:grow'] },
  { name: 'md:bg-gradient-to-r -> md:bg-linear-to-r', input: ['md:bg-gradient-to-r'], expected: ['md:bg-linear-to-r'] },
  { name: 'lg:bg-gradient-to-br -> lg:bg-linear-to-br', input: ['lg:bg-gradient-to-br'], expected: ['lg:bg-linear-to-br'] },
  { name: 'dark:bg-gradient-to-l -> dark:bg-linear-to-l', input: ['dark:bg-gradient-to-l'], expected: ['dark:bg-linear-to-l'] },

  // ===== Variantes duplas/triplas =====
  { name: 'dark:hover:flex-grow -> dark:hover:grow', input: ['dark:hover:flex-grow'], expected: ['dark:hover:grow'] },
  { name: 'sm:md:flex-grow -> sm:md:grow', input: ['sm:md:flex-grow'], expected: ['sm:md:grow'] },
  { name: 'sm:md:lg:flex-grow -> sm:md:lg:grow', input: ['sm:md:lg:flex-grow'], expected: ['sm:md:lg:grow'] },

  // ===== Group/peer/data attrs =====
  { name: 'group-hover:flex-grow -> group-hover:grow', input: ['group-hover:flex-grow'], expected: ['group-hover:grow'] },
  { name: 'peer-disabled:flex-shrink -> peer-disabled:shrink', input: ['peer-disabled:flex-shrink'], expected: ['peer-disabled:shrink'] },
  { name: 'data-[state=open]:flex-grow -> data-[state=open]:grow', input: ['data-[state=open]:flex-grow'], expected: ['data-[state=open]:grow'] },
  { name: 'data-[active]:bg-gradient -> data-active:bg-linear', input: ['data-[active]:bg-gradient-to-r'], expected: ['data-active:bg-linear-to-r'] },
  { name: 'has-[input:checked]:flex-grow -> has-[input:checked]:grow', input: ['has-[input:checked]:flex-grow'], expected: ['has-[input:checked]:grow'] },
  { name: 'aria-[expanded=true]:flex-grow -> aria-expanded:grow', input: ['aria-[expanded=true]:flex-grow'], expected: ['aria-expanded:grow'] },

  // ===== Mix de canônicas e não canônicas =====
  { name: 'Mixed canonical + non-canonical', input: ['flex', 'flex-grow', 'p-4', 'items-center', 'bg-gradient-to-r', 'rounded-lg'], expected: ['flex', 'grow', 'p-4', 'items-center', 'bg-linear-to-r', 'rounded-lg'] },
  { name: 'All canonical stays', input: ['flex', 'p-4', 'rounded-lg', 'bg-blue-500'], expected: ['flex', 'p-4', 'rounded-lg', 'bg-blue-500'] },

  // ===== Casos reais grandes =====
  {
    name: 'Button component',
    input: [
      'inline-flex', 'items-center', 'justify-center', 'gap-2',
      'px-4', 'py-2', 'bg-blue-500', 'text-white', 'rounded-md',
      'hover:bg-blue-600', 'focus:outline-none', 'focus:ring-2',
      'focus:ring-blue-500', 'disabled:opacity-50', 'disabled:cursor-not-allowed',
      'transition-colors', 'duration-200'
    ],
    expected: [
      'inline-flex', 'items-center', 'justify-center', 'gap-2',
      'px-4', 'py-2', 'bg-blue-500', 'text-white', 'rounded-md',
      'hover:bg-blue-600', 'focus:outline-none', 'focus:ring-2',
      'focus:ring-blue-500', 'disabled:opacity-50', 'disabled:cursor-not-allowed',
      'transition-colors', 'duration-200'
    ],
  },
  {
    name: 'Card with gradient',
    input: [
      'relative', 'flex', 'flex-col', 'gap-4', 'p-6',
      'bg-gradient-to-br', 'from-blue-500', 'via-purple-500', 'to-pink-500',
      'rounded-xl', 'shadow-lg', 'hover:shadow-xl',
      'transition-shadow', 'duration-300'
    ],
    expected: [
      'relative', 'flex', 'flex-col', 'gap-4', 'p-6',
      'bg-linear-to-br', 'from-blue-500', 'via-purple-500', 'to-pink-500',
      'rounded-xl', 'shadow-lg', 'hover:shadow-xl',
      'transition-shadow', 'duration-300'
    ],
  },
  {
    name: 'Responsive layout',
    input: [
      'grid', 'grid-cols-1', 'sm:grid-cols-2', 'md:grid-cols-3', 'lg:grid-cols-4',
      'gap-4', 'sm:gap-6', 'md:gap-8', 'p-4', 'sm:p-6', 'md:p-8',
      'flex-grow', 'sm:flex-shrink-0'
    ],
    expected: [
      'grid', 'grid-cols-1', 'sm:grid-cols-2', 'md:grid-cols-3', 'lg:grid-cols-4',
      'gap-4', 'sm:gap-6', 'md:gap-8', 'p-4', 'sm:p-6', 'md:p-8',
      'grow', 'sm:shrink-0'
    ],
  },
  {
    name: 'Navbar component',
    input: [
      'sticky', 'top-0', 'z-50', 'flex', 'items-center', 'justify-between',
      'px-6', 'py-3', 'bg-gradient-to-r', 'from-white', 'to-gray-100',
      'border-b', 'border-gray-200', 'shadow-sm',
      'dark:bg-gradient-to-r', 'dark:from-gray-900', 'dark:to-gray-800'
    ],
    expected: [
      'sticky', 'top-0', 'z-50', 'flex', 'items-center', 'justify-between',
      'px-6', 'py-3', 'bg-linear-to-r', 'from-white', 'to-gray-100',
      'border-b', 'border-gray-200', 'shadow-sm',
      'dark:bg-linear-to-r', 'dark:from-gray-900', 'dark:to-gray-800'
    ],
  },
  {
    name: 'Sidebar layout',
    input: [
      'flex', 'h-screen', 'overflow-hidden',
      'w-64', 'flex-shrink-0', 'bg-gray-50', 'border-r', 'border-gray-200',
      'flex-grow', 'overflow-y-auto', 'p-4'
    ],
    expected: [
      'flex', 'h-screen', 'overflow-hidden',
      'w-64', 'shrink-0', 'bg-gray-50', 'border-r', 'border-gray-200',
      'grow', 'overflow-y-auto', 'p-4'
    ],
  },

  // ===== Trimming =====
  { name: 'Trailing space', input: ['flex-grow '], expected: ['grow'] },
  { name: 'Leading space', input: [' flex-grow'], expected: ['grow'] },
  { name: 'Both spaces', input: [' flex-grow '], expected: ['grow'] },

  // ===== Negativas (stays - Tailwind behavior) =====
  { name: '-flex-grow stays', input: ['-flex-grow'], expected: ['-flex-grow'] },
  { name: '-grow stays', input: ['-grow'], expected: ['-grow'] },
  { name: '-bg-gradient-to-r stays', input: ['-bg-gradient-to-r'], expected: ['-bg-gradient-to-r'] },

  // ===== Custom/invalid classes =====
  { name: 'Custom class stays', input: ['my-custom-class', 'flex-grow'], expected: ['my-custom-class', 'grow'] },
  { name: 'Invalid class stays', input: ['totally-invalid-xyz'], expected: ['totally-invalid-xyz'] },

  // ===== Edge cases =====
  { name: 'Empty array', input: [], expected: [] },
];

let passed = 0;
let failed = 0;

for (const tc of testCases) {
  try {
    const result = canonicalizeSync(cssPath, tc.input, { rem: 16 });
    const ok = result.length === tc.expected.length && result.every((v, i) => v === tc.expected[i]);
    if (ok) {
      console.log(`  ✓ ${tc.name}`);
      passed++;
    } else {
      console.log(`  ✗ ${tc.name}`);
      if (tc.input.length <= 6) {
        console.log(`    IN:       ${tc.input.map(s => JSON.stringify(s)).join(' | ')}`);
        console.log(`    EXPECTED: ${tc.expected.map(s => JSON.stringify(s)).join(' | ')}`);
        console.log(`    GOT:      ${result.map(s => JSON.stringify(s)).join(' | ')}`);
      } else {
        for (let i = 0; i < Math.max(tc.expected.length, result.length); i++) {
          if (tc.expected[i] !== result[i]) {
            console.log(`    [${i}] expected: ${tc.expected[i]} | got: ${result[i] || '(missing)'}`);
          }
        }
      }
      failed++;
    }
  } catch (error) {
    console.log(`  ✗ ${tc.name} (error: ${error.message})`);
    failed++;
  }
}

console.log('\n========================================');
console.log(`${passed} passed, ${failed} failed / ${testCases.length} total`);
console.log('========================================\n');

if (failed > 0) {
  process.exit(1);
}
