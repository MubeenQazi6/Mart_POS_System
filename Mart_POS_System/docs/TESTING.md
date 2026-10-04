# MARTPOS — Testing Strategy

## Overview

Testing will be introduced incrementally. Phase 0 establishes the strategy; test infrastructure arrives in Phase 17 with unit tests added alongside features from Phase 2 onward.

## Test Layers

| Layer | Tool (Planned) | Scope |
|-------|----------------|-------|
| Unit | Vitest | Domain logic, money utils, validation schemas |
| Integration | Vitest + better-sqlite3 | Repository queries, DB transactions |
| Component | Vitest + Testing Library | React components, forms |
| E2E | Playwright (optional) | Critical user flows |

## Priority Test Scenarios

### Money Utilities (High Priority)

- `toMinorUnits` rounding (half-up)
- `fromMinorUnits` display conversion
- `formatMoney` locale formatting
- Integer arithmetic: totals, discounts, change calculation
- No floating-point drift in chained calculations

### Database Transactions (Critical)

- Sale completion: all records created or none
- Sale failure mid-transaction: full rollback
- Purchase with stock increase: atomic
- Concurrent access: single-instance enforcement

### Product Management

- Create product with category, brand, unit
- Deactivate product (soft delete, not removed)
- Custom packaging: parent → child products
- Barcode uniqueness constraint

### POS Flow

- Scan barcode → product found → added to cart
- Unknown barcode → error message, no cart change
- Complete sale → stock decreased → movement recorded
- Hold bill → resume → complete
- Cancel bill → no sale record, no stock change

### Inventory

- Stock = SUM(stock_movements.quantity)
- Manual adjustment creates movement record
- Damage/expiry creates negative movement

### Security

- Renderer cannot access Node.js APIs directly
- Invalid IPC channel rejected
- Invalid IPC payload rejected by Zod
- Password not stored in plain text

### Backup/Restore

- Backup creates valid copy of database
- Restore replaces database atomically
- Corrupted backup rejected with clear error

## Test Data Policy

- **No mock data in production code**
- Tests use isolated in-memory SQLite or temp files
- Test fixtures created per test, cleaned up after
- Never commit test databases to repository

## Running Tests (Future)

```bash
npm run test          # All tests
npm run test:unit     # Unit tests only
npm run test:integration  # DB integration tests
```

## CI (Future — Phase 17)

- Run typecheck, lint, and tests on every push
- Build verification on Windows runner
- No cloud dependency for local development tests

## Manual Testing Checklist (Per Phase)

After each phase, verify:

- [ ] Application launches without errors
- [ ] New feature works as specified
- [ ] Existing features still work (regression)
- [ ] Offline operation confirmed
- [ ] No console errors in dev tools
- [ ] `npm run build` succeeds
- [ ] TypeScript strict mode passes

## Phase 11/12 and Returns Verification

The finance and returns scripts use isolated temporary SQLite databases and the real migration chain:

```bash
npx tsx scripts/test-phase11.ts
npx tsx scripts/test-phase12.ts
npx tsx scripts/test-returns.ts
```

Coverage includes dashboard KPIs and date ranges, expense categories and totals, cash session lifecycle and variance, customer partial/full/over-return behavior, supplier purchase returns, stock reversal, cash settlement, ledger adjustments, sequential return numbering, and audit events.

Phase 13 additionally verifies invoice search, sale void status, stock reversal, cash reversal, invoice-number preservation, duplicate-void rejection, Khata reversal, and sale-void audit logging.

Latest individually observed results:

| Suite | Passed | Failed | Status |
|-------|--------|--------|--------|
| Phase 5 | 35 | 0 | VERIFIED |
| Phase 6 | 60 | 0 | VERIFIED |
| Phase 7 | 49 | 0 | VERIFIED |
| Phase 8 | 35 | 0 | VERIFIED |
| Phase 9 | 42 | 0 | VERIFIED |
| Phase 10 | 35 | 0 | VERIFIED |
| Phase 11 | 14 | 0 | VERIFIED |
| Phase 12 | 19 | 0 | VERIFIED |
| Returns | 16 | 0 | VERIFIED |
| E2E workflow | 46 | 0 | VERIFIED |

TypeScript and ESLint completed without reported errors. The production build generated the main and preload bundles. Standalone preload verification was not verified because another Electron instance was holding the application's single-instance lock during the check.

## Phase 0 Verification

- [x] Electron launches successfully
- [x] React renders welcome shell
- [x] IPC returns app info via secure preload
- [x] `npm run build` succeeds
- [x] Context isolation enabled
- [x] No business modules implemented
