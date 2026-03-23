# oxlint-tailwind-canonical-classes

Oxlint plugin to enforce canonical Tailwind CSS v4 class names. Framework-agnostic — works with any JS/TS project, not just JSX/React.

Detects non-canonical classes like `flex-grow` (should be `grow`), `bg-gradient-to-*` (should be `bg-linear-to-*`), and arbitrary values like `p-[16px]` (should be `p-4`). Auto-fixes all of them.

## Features

- **Framework-agnostic**: Works in plain JS/TS, not tied to JSX/React
- **Auto-fix**: Automatically corrects non-canonical class names
- **String literals**: Detects classes in any string literal
- **Template literals**: Detects classes in static template literals
- **JSX support**: Detects classes in `className`, `class`, and other attribute names
- **Utility functions**: Supports `cn()`, `clsx()`, `classNames()`, `twMerge()`, `cva()`, and more
- **Arbitrary values → shorthand**: Detects `p-[16px]` → `p-4`, `-left-[9px]` → `-left-2.25`, `w-[50%]` → `w-1/2`
- **Smart CSS/HTML filtering**: Ignores inline CSS in template literals (no false positives on `style="..."` HTML strings)
- **Zero config**: Minimal setup required

## Installation

### Via GitHub (default)

Add to your `package.json`:

```json
{
  "devDependencies": {
    "oxlint-tailwind-canonical-classes": "github:felipebrgs1/tailwind-canonical-oxclint",
    "@tailwindcss/node": "^4.0.0"
  }
}
```

Then install:

```bash
npm install
```

To pin a specific branch or tag:

```json
"oxlint-tailwind-canonical-classes": "github:felipebrgs1/tailwind-canonical-oxclint#main"
```

### Via npm (when published)

```bash
npm install -D oxlint-tailwind-canonical-classes @tailwindcss/node
```

## Usage

Create or update your `.oxlintrc.json`:

```json
{
  "jsPlugins": ["./node_modules/oxlint-tailwind-canonical-classes/plugin.js"],
  "rules": {
    "tailwind-canonical-classes/canonical": [
      "warn",
      {
        "cssPath": "./src/styles/globals.css"
      }
    ]
  }
}
```

Run oxlint:

```bash
npx oxlint
```

Run with auto-fix:

```bash
npx oxlint --fix
```

For Vue projects:

```bash
npx oxlint --vue-plugin --fix
```

## Configuration

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `cssPath` | `string` | **required** | Path to your Tailwind CSS entry file |
| `rootFontSize` | `number` | `16` | Root font size in pixels for rem calculations |
| `calleeFunctions` | `string[]` | `['cn', 'clsx', 'classNames', 'twMerge', 'cva', 'twJoin', 'tv', 'cx', 'classnames']` | Utility function names to check |
| `attributeNames` | `string[]` | `['className', 'class', 'tw', 'twx', 'css', 'styles']` | JSX attribute names to check |

### Full example

```json
{
  "jsPlugins": ["./node_modules/oxlint-tailwind-canonical-classes/plugin.js"],
  "rules": {
    "tailwind-canonical-classes/canonical": [
      "warn",
      {
        "cssPath": "./app/globals.css",
        "rootFontSize": 16,
        "calleeFunctions": ["cn", "clsx"],
        "attributeNames": ["className", "class"]
      }
    ]
  }
}
```

## Examples

### Class renames (v3 → v4)

```js
// Before
const className = "flex-grow flex-shrink-0 bg-gradient-to-r";

// After auto-fix
const className = "grow shrink-0 bg-linear-to-r";
```

### Arbitrary values → shorthand

```js
// Before
const className = "p-[16px] -left-[9px] w-[50%] -mt-[1rem]";

// After auto-fix
const className = "p-4 -left-2.25 w-1/2 -mt-4";
```

| Input | Output | Type |
|-------|--------|------|
| `p-[16px]` | `p-4` | pixel → scale |
| `-left-[9px]` | `-left-2.25` | pixel → fractional scale |
| `w-[50%]` | `w-1/2` | percentage → fraction |
| `p-[1rem]` | `p-4` | rem → scale |
| `grow-[3]` | `grow-3` | number → direct |

### Template literals

```js
// Before
const className = `flex-grow p-[16px]`;

// After auto-fix
const className = `grow p-4`;
```

### JSX attributes

```jsx
// Before
<div className="flex-grow p-[16px] w-[50%]" />

// After auto-fix
<div className="grow p-4 w-1/2" />
```

### Utility functions

```js
// Before
import { cn } from './utils';
const className = cn("flex-grow", "p-[16px]", isActive && "-left-[9px]");

// After auto-fix
import { cn } from './utils';
const className = cn("grow", "p-4", isActive && "-left-2.25");
```

### Inline CSS is ignored

The plugin automatically skips inline CSS in template literals, so HTML strings with `style="..."` attributes won't trigger false positives:

```js
// No warnings — inline CSS is correctly ignored
const html = `<div style="display: flex; border-top: 4px solid #3498db;">
  <p style="margin-top: 20px;">Content</p>
</div>`;
```

## How it works

1. The plugin loads your Tailwind CSS file using `@tailwindcss/node`
2. It extracts class names from strings, template literals, JSX attributes, and utility function calls
3. **Class renames**: Each class is canonicalized using Tailwind CSS v4's `canonicalizeCandidates` API (e.g., `flex-grow` → `grow`)
4. **Arbitrary values**: Classes with `[...]` are checked for available shorthands by generating candidate forms and validating them against the design system (e.g., `p-[16px]` → `p-4`)
5. **CSS/HTML filtering**: Strings containing HTML tags, `style="..."` attributes, or CSS declarations (`property: value`) are automatically skipped
6. Non-canonical classes are reported as warnings/errors and can be auto-fixed

## Limitations

- Only works with static class names (dynamic expressions are skipped)
- Requires Tailwind CSS v4
- CSS file must be accessible from where oxlint runs
- Arbitrary value shorthand is limited to spacing (px/rem), percentages, and direct numbers

## License

MIT
