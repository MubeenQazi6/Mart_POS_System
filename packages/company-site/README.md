# Zentropic Technologies — Official Company Website

A high-performance, dark-themed SaaS corporate website showcasing all Zentropic Technologies business management systems:

- **MartPOS** — Retail & Supermarket POS (Live Cloud + Offline)
- **SchoolIQ** — School Management ERP
- **HREdge** — HR, Attendance & Payroll Suite
- **StockMaster** — Multi-Warehouse Inventory & WMS
- **LedgerX** — Financial Accounting & Invoicing
- **DineOS** — Restaurant & Cafe POS

---

## 🚀 How to Deploy to Vercel

### Option 1: Direct Vercel Git Import (Recommended)
1. Go to [vercel.com/new](https://vercel.com/new).
2. Connect your GitHub repository `Mart_POS_System`.
3. In **Root Directory**, click **Edit** and select:
   ```
   packages/company-site
   ```
4. Framework Preset: **Other** (Static HTML)
5. Click **Deploy**!
6. Once deployed, link your custom domain: `zenthropictechnologies.vercel.app` (or any custom domain under Settings > Domains).

---

### Option 2: Deploy via Vercel CLI
```bash
cd packages/company-site
npx vercel
```
Follow the prompts and select current directory.

---

## 💻 Local Preview
Run any static HTTP server or Vite:
```bash
cd packages/company-site
npx serve .
# or
npx vite
```
