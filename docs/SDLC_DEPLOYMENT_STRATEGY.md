# Enterprise SDLC & Multi-Environment Strategy
**Zentropic Technologies — Engineering Governance**

---

## 1. High-Level Architecture Overview

To support multiple enterprise management systems (**MartPOS**, **SchoolIQ**, **HREdge**, **StockMaster**, **LedgerX**, **DineOS**) under one corporate parent without data corruption or cross-talk, Zentropic Technologies follows a **Two-Pillar Strategy**:

1. **Database Tier:** PostgreSQL **Schema-Isolated Sub-Databases** (Zero Data Conflict).
2. **Release Tier:** Strict 3-Stage **SDLC Promotion Gate** (DEV → UAT → PRD).

```
                      ┌──────────────────────────────────────┐
                      │      ZENTROPIC CORE (public)        │
                      │  - Organizations (Tenants)           │
                      │  - System Subscriptions / Licenses   │
                      │  - Auth & Global Audit Trail         │
                      └──────────────────┬───────────────────┘
                                         │
        ┌───────────────┬────────────────┼───────────────┬───────────────┐
        ▼               ▼                ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   mart_pos   │ │  school_iq   │ │   hr_edge    │ │ stock_master │ │   ledger_x   │
│ (Retail POS) │ │(School ERP)  │ │ (HR & Payroll│ │ (Warehouses) │ │(Accounting)  │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

---

## 2. Multi-Environment Topology (SDLC)

| Attribute | DEV (Development) | UAT (User Acceptance Testing) | PRD (Production) |
|---|---|---|---|
| **Git Branch** | `feature/*` or `fix/*` | `uat` (Staging) | `main` (Production) |
| **Database** | Local SQLite / Local Postgres | UAT Supabase / UAT Schema | Production Supabase |
| **Site Deployment** | `localhost:5173` | Vercel Preview (`uat` branch) | `zenthropictechnologies.vercel.app` |
| **POS Web App** | Local Web Dev Server | GitHub Pages (`uat` build) | Production Web & Desktop Installer |
| **Data Scope** | Mock / Seed Data | Staging / Test Business Data | Real Production Customer Data |
| **Access** | Developers only | QA, Business Stakeholders, Testers | Real End-Users & Store Owners |

---

## 3. Strict Promotion Workflow (No PRD Drift)

```
[Developer writes code]
        │
        ▼
   Pull Request
        │
        ▼
[Merged into 'uat' branch]
        │
        ├──▶ Auto-deploy to UAT Environment (Vercel & UAT Web)
        ├──▶ Run database migrations on UAT Database ONLY
        ├──▶ QA & Stakeholder Testing
        │
   [Testing Passed & Approved?]
        │
       YES
        │
        ▼
   Pull Request from 'uat' -> 'main'
        │
        ▼
[Production Deployment (PRD)]
        ├──▶ Run verified migrations on PRD Database
        ├──▶ Production Vercel & Web Build Updated
        └──▶ Desktop Release Package Generated
```

### The Golden Rule:
> **Never commit directly to `main` for business features.** 
> All changes, migrations, and bug fixes must first be deployed and verified on `uat`. Only when tested and signed off is a PR merged into `main`.

---

## 4. Sub-Database Schema Isolation (Zero Conflict Guarantee)

Each management system operates in its own PostgreSQL schema:
- **`public`**: Organizations, Multi-Tenant IDs, Auth users, Global subscriptions.
- **`mart_pos`**: `counters`, `products`, `categories`, `customers`, `sales`, `sale_items`.
- **`school_iq`**: `academic_years`, `students`, `fee_vouchers`, `attendance`.
- **`hr_edge`**: `employees`, `payroll_runs`, `shifts`, `leaves`.
- **`stock_master`**: `warehouses`, `stock_batches`, `transfers`.

### Benefits:
1. **Zero Table Clashes:** Both MartPOS and SchoolIQ can have an `invoices` or `categories` table without interfering.
2. **Independent Migrations:** Changing MartPOS products schema never breaks SchoolIQ.
3. **Unified Tenant Billing:** A company like *Metro Mart & School Group* has one Organization ID in `public.organizations` with access to both `mart_pos` and `school_iq`.
4. **Row Level Security (RLS):** Every table filters by `org_id`, ensuring strict tenant isolation.

---

## 5. Setting Up UAT vs PRD in Supabase & Vercel

### In Supabase:
- **Option 1 (Recommended for Enterprise):** Two separate free Supabase projects:
  - `zentropic-uat` (for UAT testing)
  - `zentropic-prd` (for live clients)
- **Option 2:** One project with environment prefixes (`uat_mart_pos`, `prd_mart_pos`).

### In Vercel:
- **Production Branch:** `main` (auto-deploys to `zenthropictechnologies.vercel.app`)
- **Preview Branch:** `uat` (auto-deploys to `zenthropictechnologies-git-uat.vercel.app`)
- In Vercel Project Settings > Environment Variables, you can configure different variables for:
  - **Production:** PRD Supabase URL & Key
  - **Preview (UAT):** UAT Supabase URL & Key
