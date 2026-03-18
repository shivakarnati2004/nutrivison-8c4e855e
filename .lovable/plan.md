
## Problem

Lovable's build pipeline calls `build:dev` on the **root** `package.json`. The root `package.json` currently has only three scripts:

```json
"dev":     "cd nutrivison-8c4e855e-main && bun install && bunx vite --host",
"build":   "cd nutrivison-8c4e855e-main && bun install && bunx vite build",
"preview": "cd nutrivison-8c4e855e-main && bunx vite preview"
```

`build:dev` is missing at the root level — it exists only inside `nutrivison-8c4e855e-main/package.json`, which Lovable never runs directly.

## Fix

Add the missing `build:dev` script to the **root** `package.json`:

```json
"build:dev": "cd nutrivison-8c4e855e-main && bun install && bunx vite build --mode development"
```

### File to change

- **`package.json`** (root) — add `build:dev` script alongside the existing three scripts
