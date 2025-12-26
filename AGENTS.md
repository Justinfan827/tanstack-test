# AGENTS.md

Guidelines for AI agents working in this codebase.

## General Guidelines

- Make plans and responses concise. Sacrifice grammar for concision.
- At the end of each plan, list unresolved questions to answer (if any).

## Project Overview

Full-stack TypeScript app using:
- **Frontend**: TanStack Start (React Router + SSR), TanStack Query, Tailwind CSS v4
- **Backend**: Convex (real-time database, mutations, queries, actions)
- **Auth**: Better Auth with Convex adapter
- **UI**: shadcn/ui components, Base UI primitives

## Build & Dev Commands

```bash
# Development
pnpm dev              # Start dev server on port 3000

# Build & Preview
pnpm build            # Production build
pnpm preview          # Preview production build

# Type Checking & Linting
pnpm typecheck        # Run TypeScript type checking (tsc --noEmit)
pnpm lint             # Run Biome linter
pnpm check            # Run Biome check (lint + format)
pnpm format           # Run Biome formatter

# Testing
pnpm test             # Run all tests (vitest run)
npx vitest run src/path/to/file.test.ts   # Run single test file
npx vitest run -t "test name"              # Run tests matching name

# Scripts
pnpm script           # Run custom scripts via scripts/run.ts
pnpm auth:migrate     # Generate Better Auth schema
```

## Code Style

### Formatting (Biome)
- **Indent**: 2 spaces
- **Semicolons**: As needed (omit when possible)
- **Quotes**: Single quotes for JS/TS
- **Imports**: Auto-organized by Biome

### TypeScript
- Strict mode enabled
- No unused locals/parameters
- Use `@/*` path alias for `./src/*` imports
- Use `Id<'tableName'>` for Convex document IDs (not `string`)
- Always use `as const` for string literals in discriminated unions

### React & Components
- Functional components only
- Use `useCallback`/`useMemo` for expensive operations
- shadcn components live in `src/components/ui/`
- Install new shadcn components: `pnpm dlx shadcn@latest add <component>`

### Naming Conventions
- **Files**: kebab-case (`data-grid-cell.tsx`)
- **Components**: PascalCase (`DataGridCell`)
- **Functions/variables**: camelCase
- **Types/Interfaces**: PascalCase
- **Constants**: SCREAMING_SNAKE_CASE for true constants

## Convex Backend Guidelines

### Function Syntax
Always use the new function syntax with validators:

```typescript
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const myQuery = query({
  args: { id: v.id("users") },
  returns: v.object({ name: v.string() }),
  handler: async (ctx, args) => {
    // ...
  },
});
```

### Function Types
- `query`/`mutation`/`action` - Public API functions
- `internalQuery`/`internalMutation`/`internalAction` - Private functions
- Always include `args` and `returns` validators
- Return `v.null()` if function returns nothing

### Database Queries
- Do NOT use `.filter()` - use indexes with `.withIndex()` instead
- Use `.unique()` for single document queries
- Default ordering is ascending by `_creationTime`

### Optimistic Updates
For responsive UIs, use `.withOptimisticUpdate()`:

```typescript
const myMutation = useMutation(api.module.myMutation).withOptimisticUpdate(
  (localStore, args) => {
    const current = localStore.getQuery(api.module.myQuery, { id: args.id })
    if (!current) return
    localStore.setQuery(api.module.myQuery, { id: args.id }, { ...current, ...args })
  }
)
```

For fire-and-forget patterns (instant UI, no await):
```typescript
const onRowAdd = useCallback(() => {
  // Don't await - let optimistic update handle UI
  addRow({ dayId })
  return { rowIndex: rows.length, columnId: 'name' }
}, [addRow, dayId, rows.length])
```

### Schema
- Define in `convex/schema.ts`
- System fields `_id` and `_creationTime` are automatic
- Index names should include all fields: `by_user_and_status`

## Project Structure

```
convex/           # Backend (Convex functions, schema)
  _generated/     # Auto-generated types (don't edit)
  schema.ts       # Database schema
  *.ts            # Queries, mutations, actions
src/
  components/     # React components
    ui/           # shadcn/ui components
    data-grid/    # Data grid components
  features/       # Feature-specific code
  hooks/          # Custom React hooks
  lib/            # Utilities
  routes/         # TanStack Router routes
  integrations/   # Third-party integrations
```

## Key Patterns

### Data Grid
Custom data grid with virtualization. Cell variants in `cell-variants/`.
Uses `useDataGrid` hook for state management.

### Authentication
Better Auth configured in `convex/betterAuth/`. Client in `src/lib/auth-client.ts`.

### Routing
TanStack Router with file-based routing in `src/routes/`.
Route tree auto-generated in `src/routeTree.gen.ts`.

## Cursor Rules

Additional context available in `.cursor/rules/`:
- `convex_rules.mdc` - Detailed Convex patterns and examples
- `tanstack-react-router_*.mdc` - TanStack Router documentation
