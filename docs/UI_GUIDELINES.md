# MARTPOS — UI/UX Guidelines

## Design Philosophy

MARTPOS should feel like **professional commercial POS software** — not a basic student CRUD project.

### Core Principles

| Principle | Application |
|-----------|-------------|
| Clean | Minimal visual noise, clear whitespace |
| Modern | Contemporary layout, subtle shadows, rounded corners |
| Professional | Consistent typography, restrained color palette |
| Fast | No unnecessary animations; POS prioritizes speed |
| Keyboard-friendly | Tab order, shortcuts, Enter to confirm |
| Touch-friendly | Adequate tap targets where useful (44px minimum) |
| Readable | High contrast text, clear hierarchy |

## Color System

Defined in `tailwind.config.js`:

- **Brand:** Blue scale (`brand-50` through `brand-950`) — primary actions, active nav
- **Surface:** White backgrounds, muted gray page background, subtle borders
- **Semantic:** Emerald (success/offline), Red (error/destructive), Amber (warning)

## Typography

- **Font:** Inter (fallback: Segoe UI, system-ui)
- **Page title:** `text-lg font-semibold`
- **Section heading:** `text-base font-semibold`
- **Body:** `text-sm text-slate-600`
- **Labels:** `text-sm font-medium text-slate-700`
- **Monospace:** User paths, barcodes, invoice numbers

## Spacing

- Page padding: `p-6`
- Card padding: `p-5` or `p-6`
- Form field gap: `gap-4`
- Button padding: `px-4 py-2`

## Components

### Buttons

- **Primary:** `btn-primary` — main actions (Save, Complete Sale)
- **Secondary:** `btn-secondary` — cancel, back, secondary actions
- **Destructive:** Red variant — delete, cancel sale (with confirmation)

### Cards

- `card` class — white background, border, rounded-xl, subtle shadow

### Forms

- Labels above inputs
- Inline validation errors below fields
- Required fields marked with asterisk
- React Hook Form + Zod validation

### Tables

- Sticky header on long lists
- Row hover highlight
- Sortable columns where appropriate
- Empty state when no data

### States

| State | Treatment |
|-------|-------------|
| Loading | Spinner + message (`LoadingState` component) |
| Empty | Illustration/icon + helpful message + action button |
| Error | Red alert card with retry option (`ErrorState` component) |
| Success | Brief toast or inline confirmation |

## POS Screen Guidelines (Phase 6)

The POS screen has different priorities:

1. **Speed over decoration** — large product list, minimal chrome
2. **Barcode input always focused** — hidden or prominent scan field
3. **Cart always visible** — right panel or bottom panel
4. **Large touch targets** — payment buttons, quantity controls
5. **Keyboard shortcuts:**
   - `F1` — Focus search
   - `F2` — Hold bill
   - `F3` — Resume held bill
   - `F4` — Payment
   - `Escape` — Cancel current action
   - `Enter` — Confirm
6. **High contrast totals** — large font for bill total
7. **Minimal page transitions** — instant feedback on scan

## Layout

### Application Shell

```
┌──────────┬────────────────────────────────────┐
│          │  Header (title, breadcrumb, clock) │
│ Sidebar  ├────────────────────────────────────┤
│ (nav)    │                                    │
│          │  Main Content Area                 │
│          │                                    │
└──────────┴────────────────────────────────────┘
```

- **Sidebar:**
  - Expanded: 256px fixed width, categorized into 5 sections (`Main`, `Inventory`, `Customers`, `Finance`, `Tools`).
  - Collapsed: 64px icon-only width with accessible hover tooltips.
  - Active route highlighting via React Router NavLink.
  - Semantic HTML with `aria-label` navigation landmarks.
- **Header:**
  - Fixed 56px (h-14) top bar with dynamic breadcrumb, live POS clock, offline badge, user profile, and version indicator.
- **Content:**
  - Scrollable main viewport with maximum constraint layouts (`max-w-7xl` or `max-w-5xl`) and `p-6` standard padding.

## Accessibility

- Semantic HTML (`nav`, `main`, `header`, `button`)
- `aria-label` on icon-only buttons
- `role="status"` on loading indicators
- `role="alert"` on error messages
- Focus visible outlines on interactive elements

## Confirmation Dialogs

Required for:

- Deleting/deactivating records
- Cancelling a sale
- Restoring a backup
- Closing cash session with discrepancy

## Do Not

- Use mock/demo business data in production UI
- Hard-code product names or categories in UI
- Add decorative animations to POS screen
- Use floating-point display for money without formatting
- Show raw error stack traces to users
