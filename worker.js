import { runAsWorker } from 'synckit';
import { __unstable__loadDesignSystem } from '@tailwindcss/node';
import fs from 'node:fs';
import path from 'node:path';

const designSystemCache = new Map();

async function getDesignSystem(cssPath, options = {}) {
  const basePath = path.dirname(cssPath);
  const cacheKey = `${cssPath}:${options.rem ?? 16}`;

  if (designSystemCache.has(cacheKey)) {
    return designSystemCache.get(cacheKey);
  }

  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  const designSystem = await __unstable__loadDesignSystem(cssContent, {
    base: basePath,
  });

  designSystemCache.set(cacheKey, designSystem);
  return designSystem;
}

async function canonicalizeInWorker(cssPath, candidates, options = {}) {
  const designSystem = await getDesignSystem(cssPath, options);

  // Trim whitespace from candidates before canonicalization
  const trimmed = candidates.map(c => typeof c === 'string' ? c.trim() : c);
  const canonicalized = designSystem.canonicalizeCandidates(trimmed, {
    rem: options.rem,
  });

  // Return canonicalized results
  return canonicalized;
}

runAsWorker(canonicalizeInWorker);
