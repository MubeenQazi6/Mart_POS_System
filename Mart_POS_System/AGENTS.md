# AGENTS.md — AI Development Rules for MARTPOS

Permanent rules for Cursor and future AI coding agents working on this project.

## Before You Start

1. Read the existing architecture and relevant documentation in `docs/` before making changes.
2. Read `docs/MODULES.md` to understand which phase is current and what is in scope.
3. Inspect existing code patterns before adding new code.

## Core Rules

- Never rewrite or delete working functionality without a specific reason.
- Never modify unrelated modules while implementing a feature.
- Do not introduce dependencies without explaining why they are necessary.
- Prefer simple, maintainable solutions over unnecessary abstraction.
- Keep business logic separate from UI components.
- Use strict TypeScript — no `any` unless absolutely unavoidable and documented.
- Validate all user input with Zod at IPC boundaries and form submission.
- Use database transactions for financially important operations.
- Never silently ignore errors — log and surface appropriately.
- Never use mock data in production functionality unless explicitly requested.
- Do not hard-code products, categories, or business data.
- Do not hard-code prices.
- Do not store passwords in plain text.
- Do not expose database access directly to the renderer.
- Do not expose arbitrary filesystem access to the renderer.
- Maintain backward compatibility with the existing database schema through migrations.
- Every database schema change must have a migration.
- Test affected functionality after implementation.
- Before finishing a task, verify that the application builds successfully (`npm run build`).
- Do not claim something is complete unless it has actually been implemented and verified.
- If a requirement is ambiguous, inspect existing documentation and code first. If still ambiguous, choose the safest maintainable solution and document the decision in `docs/DECISIONS.md`.
- Keep the application completely usable offline.
- Never add a cloud dependency to core POS functionality.
- Financial calculations must be deterministic and precision-safe (integer minor units).
- Stock changes must always be traceable via stock movement records.
- Never permanently delete critical financial records such as completed sales, payments, or stock movements. Prefer cancellation, reversal, deactivation, or soft deletion.

## Architecture Rules

### Process Separation

```
Renderer (React) → Preload (contextBridge) → Main Process (Node.js) → SQLite
```

- IPC channels must be defined in `src/shared/ipc/channels.ts`.
- Preload exposes typed `window.martpos` API only.
- Main process handlers validate input before executing.

### Code Organization

| Layer | Location | Responsibility |
|-------|----------|----------------|
| UI | `src/renderer/src/features/` | React components, no business logic |
| State | `src/renderer/src/stores/` | Zustand stores |
| IPC | `src/main/ipc/handlers/` | Request validation, delegate to services |
| Domain | `src/domain/` | Business rules, transaction orchestration |
| Data | `src/repositories/` | Drizzle queries |
| Schema | `src/database/` | Drizzle schema, migrations |
| Shared | `src/shared/` | Types, constants, utilities, IPC channels |

### Money

- Use `MoneyMinor` type and utilities from `src/shared/utils/money.ts`.
- Never use `float`, `double`, or JavaScript floating-point for financial math.

### Database

- Driver: `better-sqlite3` in main process only.
- ORM: Drizzle with versioned migrations.
- Location: `app.getPath('userData')/martpos.db`.
- Enable WAL mode and foreign keys.

## Documentation Rules

- Update relevant docs when making architectural changes.
- Add ADR entries to `docs/DECISIONS.md` for significant decisions.
- Update `docs/MODULES.md` phase status when completing a phase.

## UI Rules

- Follow `docs/UI_GUIDELINES.md`.
- Use existing component classes (`btn-primary`, `btn-secondary`, `card`).
- POS screen prioritizes speed over visual decoration.
- Provide loading, empty, and error states.

## What NOT To Do

- Do not enable `nodeIntegration: true`.
- Do not bypass IPC to access the database from the renderer.
- Do not create a REST/HTTP server unless explicitly required.
- Do not commit `.env` files or secrets.
- Do not skip migrations for schema changes.
- Do not proceed to the next phase without verifying the current phase.

## Verification Checklist

Before marking any task complete:

- [ ] Code follows existing patterns and conventions
- [ ] TypeScript compiles without errors (`npm run typecheck`)
- [ ] Application builds (`npm run build`)
- [ ] Lint passes (`npm run lint`)
- [ ] Relevant documentation updated
- [ ] No unrelated files modified
- [ ] No mock/fake business data added
