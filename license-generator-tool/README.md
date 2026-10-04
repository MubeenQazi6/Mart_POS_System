# MARTPOS License Generator Tool (Developer Vault)

> **CONFIDENTIAL**: This tool contains the master private signing key (`Ed25519`) for MARTPOS. It is for developer / vendor use only and must **NEVER** be committed to customer builds or distributed to clients.

---

## 🚀 How to Run

### Option 1: Electron Desktop Window (Recommended)
```bash
cd license-generator-tool
npm start
```
*(Or `npx electron .`)*

### Option 2: Zero-Dependency Local Web Server GUI
```bash
cd license-generator-tool
npm run serve
# Or directly:
node server.js
```
This starts an internal HTTP server and automatically opens the GUI in your default web browser.

---

## 📝 How to Generate a Customer License

1. **Customer shares Machine Code**: The customer opens MARTPOS and provides their Machine Code (e.g., `5E6B-189D-8B07-7BDD`).
2. **Fill in the Form**:
   - **Machine Code**: Paste the customer's machine code (or use `*` for floating licenses).
   - **Customer Name**: Name of the owner.
   - **Business Name**: Store / company name.
   - **License Type**: Choose **Lifetime** or **Time-Limited** (enter number of months).
   - **Features**: Toggle any modules to include (defaults to all modules).
3. **Generate & Export**:
   - Click **Generate Signed License**.
   - Click **Save .JSON File** or **Copy to Clipboard**.
4. **Send to Customer**:
   - Send the `.json` file or JSON text to the client.
   - Client pastes or imports the file in MARTPOS **Settings &rarr; License** or on the **Activation Lock Screen** to activate the software.

---

## 🔐 Cryptographic Specification

- **Algorithm**: Ed25519 (Asymmetric)
- **Signature Encoding**: Base64
- **Deterministic Payload Canonicalization**: Matches `Mart_POS_System/src/main/licensing/index.ts`
