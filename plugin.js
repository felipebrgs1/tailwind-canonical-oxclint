import { createSyncFn } from 'synckit';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const workerPath = fileURLToPath(
  new URL('./worker.js', import.meta.url)
);

const canonicalizeSync = createSyncFn(workerPath);

const UTILITY_FUNCTIONS = [
  'cn', 'clsx', 'classNames', 'twMerge', 'cva',
  'twJoin', 'tv', 'cx', 'classnames'
];

const TAILWIND_ATTR_NAMES = [
  'className', 'class', 'tw', 'twx', 'css',
  'styles'
];

function splitClasses(value) {
  if (typeof value !== 'string') return [];
  return value.trim().split(/\s+/).filter(Boolean);
}

function joinClasses(classes) {
  return classes.join(' ');
}

function extractTemplate(source) {
  const match = source.match(/<template[^>]*>([\s\S]*?)<\/template>/);
  if (!match) return null;
  return {
    content: match[1],
    start: match.index + match[0].indexOf(match[1]),
  };
}

function getAttributeName(prefix) {
  if (prefix === 'v-bind:class') return 'v-bind:class';
  return prefix.replace(/^:/, '');
}

function extractVueClasses(source, templateContent, templateStart) {
  const results = [];
  const classRegex = /(:?class|v-bind:class)\s*=\s*['"]/g;
  let match;

  while ((match = classRegex.exec(templateContent)) !== null) {
    const fullMatch = match[0];
    const prefix = match[1];
    const quoteChar = fullMatch[fullMatch.length - 1];
    const attrName = getAttributeName(prefix);

    const valueStartInTemplate = match.index + fullMatch.length;
    const closeQuoteIndex = templateContent.indexOf(quoteChar, valueStartInTemplate);

    if (closeQuoteIndex === -1) continue;

    const value = templateContent.slice(valueStartInTemplate, closeQuoteIndex);
    const valueStartInFile = templateStart + valueStartInTemplate;
    const valueEndInFile = templateStart + closeQuoteIndex + 1;

    if (prefix === 'class') {
      if (!value.trim()) continue;
      if (!isLikelyTailwindClasses(value)) continue;
      results.push({
        value,
        attrName,
        start: valueStartInFile,
        end: valueEndInFile,
        quoteChar,
        isDynamic: false,
      });
    } else {
      const strRegexes = [
        { regex: /'([^'\\]*(\\.[^'\\]*)*)'/g, quote: "'" },
        { regex: /"([^"\\]*(\\.[^"\\]*)*)"/g, quote: '"' },
        { regex: /`([^`\\]*(\\.[^`\\]*)*)`/g, quote: '`' },
      ];

      for (const { regex: sr, quote: sq } of strRegexes) {
        let sm;
        while ((sm = sr.exec(value)) !== null) {
          const str = sm[1];
          if (!str.trim()) continue;
          if (!isLikelyTailwindClasses(str)) continue;
          const strStartInFile = valueStartInFile + sm.index + sq.length;
          const strEndInFile = strStartInFile + str.length;
          results.push({
            value: str,
            attrName,
            start: strStartInFile,
            end: strEndInFile,
            quoteChar: sq,
            isDynamic: true,
          });
        }
      }
    }

    classRegex.lastIndex = closeQuoteIndex + 1;
    if (classRegex.lastIndex >= templateContent.length) break;
  }

  return results;
}

function processTemplateClasses(extractions, canonicalize, context, sourceText, resolveArbitrary) {
  for (const ext of extractions) {
    const classes = splitClasses(ext.value);
    if (classes.length === 0) continue;

    let canonicalized;
    try {
      canonicalized = canonicalize(classes);
    } catch {
      continue;
    }

    const errors = [];
    for (let i = 0; i < classes.length; i++) {
      const canonical = canonicalized[i];
      if (canonical && canonical !== classes[i]) {
        errors.push({
          original: classes[i],
          canonical,
          index: i,
        });
      }
    }

    if (errors.length > 0) {
      const fixedClasses = [...classes];
      for (const error of errors) {
        fixedClasses[error.index] = error.canonical;
      }
      const fixedValue = joinClasses(fixedClasses);

      const replacementText = `${ext.quoteChar}${fixedValue}${ext.quoteChar}`;

      for (let i = 0; i < errors.length; i++) {
        const error = errors[i];
        context.report({
          node: context.sourceCode.ast,
          message: `Class '${error.original}' should be '${error.canonical}'`,
          fix:
            i === 0
              ? (fixer) =>
                  fixer.replaceTextRange(
                    [ext.start, ext.end],
                    replacementText
                  )
              : undefined,
        });
      }
      continue;
    }

    if (!resolveArbitrary) continue;

    const arbitraryClasses = classes.filter(c => c.includes('[') && c.includes(']'));
    if (arbitraryClasses.length === 0) continue;

    let resolved;
    try {
      resolved = resolveArbitrary(classes);
    } catch {
      continue;
    }

    const arbErrors = [];
    for (let i = 0; i < classes.length; i++) {
      if (resolved[i] && resolved[i] !== classes[i]) {
        arbErrors.push({
          original: classes[i],
          shorthand: resolved[i],
          index: i,
        });
      }
    }

    if (arbErrors.length === 0) continue;

    const fixedClasses = [...classes];
    for (const error of arbErrors) {
      fixedClasses[error.index] = error.shorthand;
    }
    const fixedValue = joinClasses(fixedClasses);

    const replacementText = `${ext.quoteChar}${fixedValue}${ext.quoteChar}`;

    for (let i = 0; i < arbErrors.length; i++) {
      const error = arbErrors[i];
      context.report({
        node: context.sourceCode.ast,
        message: `Class '${error.original}' can be written as '${error.shorthand}'`,
        fix:
          i === 0
            ? (fixer) =>
                fixer.replaceTextRange(
                  [ext.start, ext.end],
                  replacementText
                )
            : undefined,
      });
    }
  }
}

function containsCssOrHtml(str) {
  if (/<\s*[a-zA-Z][^>]*>/.test(str)) return true;
  if (/\bstyle\s*=\s*["']/.test(str)) return true;
  if (/<\/[a-zA-Z]/.test(str)) return true;
  if (/<style\b/i.test(str)) return true;
  if (/\w[\w-]*:\s+[\w#]/.test(str)) return true;
  return false;
}

function isLikelyTailwindClasses(str) {
  const trimmed = str.trim();
  if (!trimmed || trimmed.length < 2) return false;

  if (containsCssOrHtml(trimmed)) return false;

  const twPrefixes = [
    'p-', 'm-', 'w-', 'h-', 'text-', 'bg-', 'border-',
    'flex', 'grid', 'block', 'inline', 'hidden', 'absolute',
    'relative', 'fixed', 'sticky', 'rounded', 'shadow',
    'font-', 'leading-', 'tracking-', 'gap-', 'items-',
    'justify-', 'self-', 'object-', 'overflow-', 'z-',
    'opacity-', 'transition-', 'duration-', 'ease-',
    'translate-', 'scale-', 'rotate-', 'skew-',
    'ring-', 'outline-', 'cursor-', 'select-',
    'whitespace-', 'break-', 'decoration-',
    'from-', 'via-', 'to-', 'gradient-',
    'space-', 'divide-', 'placeholder-',
    'animate-', 'blur-', 'brightness-', 'contrast-',
    'grayscale-', 'invert-', 'saturate-', 'sepia-',
    'backdrop-', 'grow', 'shrink', 'basis',
    'col-', 'row-', 'start-', 'end-', 'top-',
    'right-', 'bottom-', 'left-', 'inset-',
    'min-w', 'max-w', 'min-h', 'max-h',
    'first:', 'last:', 'odd:', 'even:',
    'hover:', 'focus:', 'active:', 'disabled:',
    'sm:', 'md:', 'lg:', 'xl:', '2xl:',
    'dark:', 'group-', 'peer-',
    'wpx', 'wrem', 'hpx', 'hrem',
    'ppx', 'prem', 'mpx', 'mrem',
    'bpx', 'brem', 'rpx', 'rrem',
    'gapx', 'gaprem',
    'flex-grow', 'flex-shrink', 'flex-col',
    'decoration-', 'underline', 'overline', 'line-through',
    'list-', 'table-', 'caption-',
    'border-b', 'border-t', 'border-l', 'border-r',
    'border-x', 'border-y',
  ];

  const classes = splitClasses(trimmed);
  if (classes.length === 0) return false;

  let matches = 0;
  for (const cls of classes) {
    if (cls.startsWith('!') || cls.startsWith('-')) {
      const normalized = cls.slice(1);
      if (twPrefixes.some(p => normalized.startsWith(p) || normalized === p)) {
        matches++;
        continue;
      }
    }
    if (twPrefixes.some(p => cls.startsWith(p) || cls === p)) {
      matches++;
    }
  }

  return matches >= 1;
}

function createCanonicalizer(cssPath, rootFontSize) {
  if (!fs.existsSync(cssPath)) {
    return null;
  }

  return (candidates) => {
    try {
      return canonicalizeSync(cssPath, candidates, { rem: rootFontSize });
    } catch {
      return candidates;
    }
  };
}

function createArbitraryResolver(cssPath, rootFontSize) {
  if (!fs.existsSync(cssPath)) {
    return null;
  }

  return (classes) => {
    try {
      return canonicalizeSync(cssPath, classes, {
        rem: rootFontSize,
        mode: 'resolve-arbitrary',
      });
    } catch {
      return classes.map(() => null);
    }
  };
}

function extractStringLiterals(node, sourceCode) {
  const results = [];

  if (node.type === 'Literal' && typeof node.value === 'string') {
    if (isLikelyTailwindClasses(node.value)) {
      results.push({
        value: node.value,
        node,
        type: 'literal',
      });
    }
  } else if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
    const value = node.quasis.map(q => q.value.cooked).join('');
    if (containsCssOrHtml(value)) return results;
    if (isLikelyTailwindClasses(value)) {
      results.push({
        value,
        node,
        type: 'template',
      });
    }
  }

  return results;
}

function getCalleeName(node) {
  if (node.type === 'Identifier') {
    return node.name;
  }
  if (node.type === 'MemberExpression') {
    if (node.property.type === 'Identifier') {
      return node.property.name;
    }
  }
  return null;
}

function collectCallExpressionArgs(node, calleeFunctions, sourceCode) {
  if (node.type !== 'CallExpression') return [];

  const calleeName = getCalleeName(node.callee);
  if (!calleeName || !calleeFunctions.includes(calleeName)) return [];

  const results = [];

  for (let i = 0; i < node.arguments.length; i++) {
    const arg = node.arguments[i];
    const literals = extractStringLiterals(arg, sourceCode);
    results.push(...literals);
  }

  return results;
}

function getQuoteChar(source, start, end) {
  if (source[start] === "'" && source[end - 1] === "'") return "'";
  if (source[start] === '"' && source[end - 1] === '"') return '"';
  if (source[start] === '`' && source[end - 1] === '`') return '`';
  return '"';
}

function processLiterals(literals, canonicalize, context, sourceCode, calleeFunctions, resolveArbitrary) {
  const sourceText = sourceCode.getText();

  for (const literal of literals) {
    const classes = splitClasses(literal.value);
    if (classes.length === 0) continue;

    let canonicalized;
    try {
      canonicalized = canonicalize(classes);
    } catch {
      continue;
    }

    const errors = [];
    for (let i = 0; i < classes.length; i++) {
      const canonical = canonicalized[i];
      if (canonical && canonical !== classes[i]) {
        errors.push({
          original: classes[i],
          canonical,
          index: i,
        });
      }
    }

    if (errors.length > 0) {
      const fixedClasses = [...classes];
      for (const error of errors) {
        fixedClasses[error.index] = error.canonical;
      }
      const fixedValue = joinClasses(fixedClasses);

      const nodeRange = literal.node.range;
      const start = nodeRange[0];
      const end = nodeRange[1];

      let replacementText;
      if (literal.type === 'literal') {
        const quoteChar = getQuoteChar(sourceText, start, end);
        replacementText = `${quoteChar}${fixedValue}${quoteChar}`;
      } else if (literal.type === 'template') {
        replacementText = `\`${fixedValue}\``;
      } else {
        replacementText = fixedValue;
      }

      for (let i = 0; i < errors.length; i++) {
        const error = errors[i];
        context.report({
          node: literal.node,
          message: `Class '${error.original}' should be '${error.canonical}'`,
          fix:
            i === 0
              ? (fixer) => fixer.replaceTextRange([start, end], replacementText)
              : undefined,
        });
      }
      continue;
    }

    if (!resolveArbitrary) continue;

    const arbitraryClasses = classes.filter(c => c.includes('[') && c.includes(']'));
    if (arbitraryClasses.length === 0) continue;

    let resolved;
    try {
      resolved = resolveArbitrary(classes);
    } catch {
      continue;
    }

    const arbErrors = [];
    for (let i = 0; i < classes.length; i++) {
      if (resolved[i] && resolved[i] !== classes[i]) {
        arbErrors.push({
          original: classes[i],
          shorthand: resolved[i],
          index: i,
        });
      }
    }

    if (arbErrors.length === 0) continue;

    const fixedClasses = [...classes];
    for (const error of arbErrors) {
      fixedClasses[error.index] = error.shorthand;
    }
    const fixedValue = joinClasses(fixedClasses);

    const nodeRange = literal.node.range;
    const start = nodeRange[0];
    const end = nodeRange[1];

    let replacementText;
    if (literal.type === 'literal') {
      const quoteChar = getQuoteChar(sourceText, start, end);
      replacementText = `${quoteChar}${fixedValue}${quoteChar}`;
    } else if (literal.type === 'template') {
      replacementText = `\`${fixedValue}\``;
    } else {
      replacementText = fixedValue;
    }

    for (let i = 0; i < arbErrors.length; i++) {
      const error = arbErrors[i];
      context.report({
        node: literal.node,
        message: `Class '${error.original}' can be written as '${error.shorthand}'`,
        fix:
          i === 0
            ? (fixer) => fixer.replaceTextRange([start, end], replacementText)
            : undefined,
      });
    }
  }
}

function processAttributeLiterals(
  node,
  attrName,
  canonicalize,
  context,
  sourceCode,
  calleeFunctions
) {
  if (node.type !== 'JSXAttribute') return;

  const name = node.name.type === 'JSXIdentifier' ? node.name.name : null;
  if (!name || !attrName.includes(name)) return;

  const value = node.value;
  if (!value) return;

  const sourceText = sourceCode.getText();

  if (value.type === 'Literal') {
    const classesStr = value.value;
    if (!isLikelyTailwindClasses(classesStr)) return;

    const classes = splitClasses(classesStr);
    if (classes.length === 0) return;

    let canonicalized;
    try {
      canonicalized = canonicalize(classes);
    } catch {
      return;
    }

    const errors = [];
    for (let i = 0; i < classes.length; i++) {
      const canonical = canonicalized[i];
      if (canonical && canonical !== classes[i]) {
        errors.push({
          original: classes[i],
          canonical,
          index: i,
        });
      }
    }

    if (errors.length === 0) return;

    const fixedClasses = [...classes];
    for (const error of errors) {
      fixedClasses[error.index] = error.canonical;
    }
    const fixedValue = joinClasses(fixedClasses);

    const quoteChar = getQuoteChar(sourceText, value.range[0], value.range[1]);
    const replacementText = `${quoteChar}${fixedValue}${quoteChar}`;

    for (let i = 0; i < errors.length; i++) {
      const error = errors[i];
      context.report({
        node: value,
        message: `Class '${error.original}' should be '${error.canonical}'`,
        fix:
          i === 0
            ? (fixer) =>
                fixer.replaceTextRange(
                  [value.range[0], value.range[1]],
                  replacementText
                )
            : undefined,
      });
    }
  } else if (value.type === 'JSXExpressionContainer') {
    const expr = value.expression;

    if (expr.type === 'TemplateLiteral' && expr.expressions.length === 0) {
      const classesStr = expr.quasis.map(q => q.value.cooked).join('');
      if (!isLikelyTailwindClasses(classesStr)) return;

      const classes = splitClasses(classesStr);
      if (classes.length === 0) return;

      let canonicalized;
      try {
        canonicalized = canonicalize(classes);
      } catch {
        return;
      }

      const errors = [];
      for (let i = 0; i < classes.length; i++) {
        const canonical = canonicalized[i];
        if (canonical && canonical !== classes[i]) {
          errors.push({
            original: classes[i],
            canonical,
            index: i,
          });
        }
      }

      if (errors.length === 0) return;

      const fixedClasses = [...classes];
      for (const error of errors) {
        fixedClasses[error.index] = error.canonical;
      }
      const fixedValue = joinClasses(fixedClasses);

      for (let i = 0; i < errors.length; i++) {
        const error = errors[i];
        context.report({
          node: expr,
          message: `Class '${error.original}' should be '${error.canonical}'`,
          fix:
            i === 0
              ? (fixer) =>
                  fixer.replaceTextRange(
                    [value.range[0], value.range[1]],
                    `{\`${fixedValue}\`}`
                  )
              : undefined,
        });
      }
    } else if (expr.type === 'CallExpression') {
      const callLiterals = collectCallExpressionArgs(expr, calleeFunctions, sourceCode);
      processLiterals(callLiterals, canonicalize, context, sourceCode, calleeFunctions);
    }
  }
}

const rule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Enforce canonical Tailwind CSS v4 class names (framework-agnostic)',
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          cssPath: { type: 'string' },
          rootFontSize: { type: 'number', default: 16 },
          calleeFunctions: {
            type: 'array',
            items: { type: 'string' },
            default: UTILITY_FUNCTIONS,
          },
          attributeNames: {
            type: 'array',
            items: { type: 'string' },
            default: TAILWIND_ATTR_NAMES,
          },
        },
        required: ['cssPath'],
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode?.();
    const cwd = context.cwd ?? process.cwd();
    const options = context.options[0] ?? {};

    const cssPathRaw = options.cssPath;
    if (!cssPathRaw) {
      context.report({
        node: sourceCode.ast,
        message: 'cssPath option is required',
      });
      return {};
    }

    let cssPath;
    if (path.isAbsolute(cssPathRaw)) {
      cssPath = path.normalize(cssPathRaw);
    } else {
      cssPath = path.normalize(path.resolve(cwd, cssPathRaw));
    }

    if (!fs.existsSync(cssPath)) {
      context.report({
        node: sourceCode.ast,
        message: `Could not load Tailwind CSS file: ${cssPath}`,
      });
      return {};
    }

    const rootFontSize = options.rootFontSize ?? 16;
    const calleeFunctions = options.calleeFunctions ?? UTILITY_FUNCTIONS;
    const attributeNames = options.attributeNames ?? TAILWIND_ATTR_NAMES;

    const canonicalize = createCanonicalizer(cssPath, rootFontSize);
    if (!canonicalize) return {};

    const resolveArbitrary = createArbitraryResolver(cssPath, rootFontSize);

    const filename = context.filename ?? context.filepath ?? '';
    const isVue = filename.endsWith('.vue');

    return {
      Program(node) {
        if (!isVue) return;

        const sourceText = sourceCode.getText();
        const template = extractTemplate(sourceText);
        if (!template) return;

        const extractions = extractVueClasses(
          sourceText,
          template.content,
          template.start
        );
        if (extractions.length === 0) return;

        processTemplateClasses(
          extractions,
          canonicalize,
          context,
          sourceText,
          resolveArbitrary
        );
      },

      Literal(node) {
        if (typeof node.value !== 'string') return;
        if (!isLikelyTailwindClasses(node.value)) return;

        const literals = extractStringLiterals(node, sourceCode);
        processLiterals(literals, canonicalize, context, sourceCode, calleeFunctions, resolveArbitrary);
      },

      TemplateLiteral(node) {
        if (node.expressions.length > 0) return;

        const literals = extractStringLiterals(node, sourceCode);
        processLiterals(literals, canonicalize, context, sourceCode, calleeFunctions);
      },

      CallExpression(node) {
        const literals = collectCallExpressionArgs(node, calleeFunctions, sourceCode);
        processLiterals(literals, canonicalize, context, sourceCode, calleeFunctions);
      },

      JSXAttribute(node) {
        processAttributeLiterals(
          node,
          attributeNames,
          canonicalize,
          context,
          sourceCode,
          calleeFunctions
        );
      },
    };
  },
};

const plugin = {
  meta: {
    name: 'tailwind-canonical-classes',
  },
  rules: {
    'canonical': rule,
  },
};

export { containsCssOrHtml, isLikelyTailwindClasses, extractTemplate, extractVueClasses };
export default plugin;
