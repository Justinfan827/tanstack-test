# AiFit Code Migration Skill

Migrate code from `/Users/justinfan/Developer/01-04-2025-aifit/aifitweb` to current project.

## Source Project Structure

The old project (`aifitweb`) uses similar tech stack but may have different patterns.

## Migration Strategy

### 1. Analyze Source Code
- Read the file from old project path
- Identify dependencies, imports, and patterns
- Check for Convex backend functions vs React components
- Note any schema dependencies

### 2. Adapt to New Project
- **Convex Functions**: Use new function syntax with validators
  ```typescript
  export const fn = query({
    args: { ... },
    returns: v.object({ ... }),
    handler: async (ctx, args) => { ... }
  })
  ```
- **Imports**: Update to use `@/*` path aliases
- **Schema**: Add/update tables in `convex/schema.ts` if needed
- **Components**: Follow kebab-case file naming
- **Types**: Use `Id<'tableName'>` not `string` for IDs

### 3. Migration Checklist
For each file to migrate:
- [ ] Read source file
- [ ] Identify file type (component/hook/backend/lib)
- [ ] Check dependencies and imports
- [ ] Update schema if backend function
- [ ] Adapt code to new patterns
- [ ] Place in correct directory structure
- [ ] Update imports to use new paths
- [ ] Run type check: `pnpm typecheck`
- [ ] Test if applicable

### 4. Directory Mapping
Map old paths to new structure:
- Old Convex functions → `convex/*.ts`
- Old components → `src/components/` or `src/features/`
- Old hooks → `src/hooks/`
- Old utils → `src/lib/`
- Old routes → `src/routes/`

### 5. Schema Updates
If migrating Convex tables:
1. Add to `convex/schema.ts`
2. Update indexes for query patterns
3. Avoid `.filter()` - use `.withIndex()` instead

### 6. Authentication
Old auth code may need adapting to Better Auth patterns.
Check `src/lib/auth-client.ts` and `convex/betterAuth/` for current patterns.

## Usage

When user requests migration:
1. Ask which file(s) to migrate
2. Read from old project path
3. Analyze and explain needed changes
4. Migrate with adaptations
5. Run `pnpm typecheck` and `pnpm check`
6. Report any issues or dependencies needed

## Common Adaptations

- Old mutation/query syntax → New validator syntax
- String IDs → `Id<'table'>` types
- Direct filters → Indexed queries
- Old auth → Better Auth patterns
- Relative imports → `@/*` aliases
- Any deprecated TanStack Router patterns → Current patterns
