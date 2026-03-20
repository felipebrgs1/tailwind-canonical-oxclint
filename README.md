# oxlint-tailwind-canonical-classes

Oxlint plugin to enforce canonical Tailwind CSS v4 class names. Framework-agnostic — works with any JS/TS project, not just JSX/React.

Detects non-canonical classes like `flex-grow` (should be `grow`), `border-1` (should be `border`), `bg-gradient-to-*` (should be `bg-linear-to-*`), and auto-fixes them.

## Features

- **Framework-agnostic**: Works in plain JS/TS, not tied to JSX/React
- **Auto-fix**: Automatically corrects non-canonical class names
- **String literals**: Detects classes in any string literal
- **Template literals**: Detects classes in static template literals
- **JSX support**: Detects classes in `className`, `class`, and other attribute names
- **Utility functions**: Supports `cn()`, `clsx()`, `classNames()`, `twMerge()`, `cva()`, and more
- **Zero config**: Minimal setup required

## Installation

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

Run oxlint with the fix flag:

```bash
npx oxlint --fix
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

### String literals

```js
// Before
const className = "flex-grow p-4px m-2rem";

// After auto-fix
const className = "grow p-4 m-8";
```

### Template literals

```js
// Before
const className = `flex-grow p-4px`;

// After auto-fix
const className = `grow p-4`;
```

### JSX attributes

```jsx
// Before
<div className="flex-grow p-4px" />

// After auto-fix
<div className="grow p-4" />
```

### Utility functions

```js
// Before
import { cn } from './utils';
const className = cn("flex-grow", "p-4px", isActive && "m-2rem");

// After auto-fix
import { cn } from './utils';
const className = cn("grow", "p-4", isActive && "m-8");
```

## How it works

1. The plugin loads your Tailwind CSS file using `@tailwindcss/node`
2. It extracts class names from strings, template literals, JSX attributes, and utility function calls
3. Each class is canonicalized using Tailwind CSS v4's `canonicalizeCandidates` API
4. Non-canonical classes are reported as warnings/errors and can be auto-fixed

## Limitations

- Only works with static class names (dynamic expressions are skipped)
- Requires Tailwind CSS v4
- CSS file must be accessible from where oxlint runs

## License

MIT
