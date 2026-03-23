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

  const mode = options.mode ?? 'canonicalize';

  if (mode === 'resolve-arbitrary') {
    return resolveArbitraryClassesInWorker(designSystem, candidates, options);
  }

  // Trim whitespace from candidates before canonicalization
  const trimmed = candidates.map(c => typeof c === 'string' ? c.trim() : c);
  const canonicalized = designSystem.canonicalizeCandidates(trimmed, {
    rem: options.rem,
  });

  // Return canonicalized results
  return canonicalized;
}

function valueToRem(value, unit, rootFontSize) {
  if (unit === 'px') {
    const px = parseFloat(value);
    if (Number.isNaN(px)) return null;
    return px / rootFontSize;
  }
  if (unit === 'rem') {
    return parseFloat(value);
  }
  if (unit === 'em') {
    return parseFloat(value);
  }
  return null;
}

function generateArbitraryCandidates(cls, rootFontSize) {
  const match = cls.match(
    /^(-?)([\w-]+)-\[(.+)\]$/
  );
  if (!match) return [];

  const [, negative, utility, rawValue] = match;
  const neg = negative || '';

  const candidates = [];

  // Try as spacing: Npx or Nrem → Tailwind scale (units of 0.25rem)
  const spacingMatch = rawValue.match(
    /^([0-9.]+)\s*(px|rem)$/
  );
  if (spacingMatch) {
    const rem = valueToRem(spacingMatch[1], spacingMatch[2], rootFontSize);
    if (rem !== null) {
      const scale = rem / 0.25;
      if (Number.isInteger(scale) && scale > 0 && scale <= 960) {
        candidates.push(`${neg}${utility}-${scale}`);
      } else if (!Number.isInteger(scale) && scale > 0) {
        const rounded = Math.round(scale * 10000) / 10000;
        if (rounded > 0) candidates.push(`${neg}${utility}-${rounded}`);
      }
    }
  }

  // Try as percentage → fraction (e.g., 50% → 1/2)
  const pctMatch = rawValue.match(/^([0-9.]+)%$/);
  if (pctMatch) {
    const pct = parseFloat(pctMatch[1]);
    if (pct > 0 && pct <= 100) {
      if (pct === 50) candidates.push(`${neg}${utility}-1/2`);
      if (pct === 33.333333 || pct === 33.33) candidates.push(`${neg}${utility}-1/3`);
      if (pct === 66.666667 || pct === 66.67) candidates.push(`${neg}${utility}-2/3`);
      if (pct === 25) candidates.push(`${neg}${utility}-1/4`);
      if (pct === 75) candidates.push(`${neg}${utility}-3/4`);
      candidates.push(`${neg}${utility}-${pct}/100`);
    }
  }

  // Try as number → direct (e.g., [3] → 3 for grow, basis, etc.)
  const numMatch = rawValue.match(/^([0-9.]+)$/);
  if (numMatch) {
    candidates.push(`${neg}${utility}-${numMatch[1]}`);
  }

  return candidates;
}

async function resolveArbitraryClassesInWorker(designSystem, classes, options) {
  const rootFontSize = options.rem ?? 16;
  const results = [];

  for (const cls of classes) {
    if (!cls.includes('[') || !cls.includes(']')) {
      results.push(null);
      continue;
    }

    const candidates = generateArbitraryCandidates(cls, rootFontSize);
    if (candidates.length === 0) {
      results.push(null);
      continue;
    }

    try {
      const validated = designSystem.canonicalizeCandidates(candidates, {
        rem: rootFontSize,
      });

      let found = null;
      for (let i = 0; i < candidates.length; i++) {
        if (validated[i] && validated[i] !== candidates[i]) continue;
        if (validated[i]) {
          found = validated[i];
          break;
        }
      }

      results.push(found);
    } catch {
      results.push(null);
    }
  }

  return results;
}

runAsWorker(canonicalizeInWorker);
