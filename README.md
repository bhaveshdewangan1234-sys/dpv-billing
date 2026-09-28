# Dewangan Photo & Videography – Invoice Management System

A standalone, professional cloud-ready Invoice Management Web Application and Progressive Web App (PWA) built specifically for **Dewangan Photo & Videography (DPV)**.

---

## 🌟 Key Features

1. **Primary Design Reference Fidelity**:
   - Matches the official Dewangan Photo & Videography aesthetic (`Invoice_INV-2026-0001.pdf`).
   - Deep studio navy (`#1e3a8a`) and subtle gold accents (`#d97706`).
   - Clean A4 portrait format with dedicated print stylesheet and high-definition PDF generator.

2. **Single Management Panel**:
   - Unified interface for the studio owner and staff.
   - Absolutely zero customer login or external portals required; customers only receive finalized PDF invoices or prints.

3. **Multiple Shooting Dates Schedule**:
   - Supports multi-day Indian wedding bookings (e.g. Day 1: Haldi, Day 2: Wedding, Day 3: Reception).
   - Dedicated shooting dates timeline displayed cleanly on the A4 invoice.
   - Syncs automatically to the **Studio Shooting Calendar** for schedule management.

4. **Dynamic UPI QR Code**:
   - Embedded "SCAN TO PAY (UPI)" box with dynamically generated QR code (`upi://pay?pa=9301614549@ybl...`).
   - Automatically populates the exact outstanding balance due.

5. **Financial Precision & Payment Ledger**:
   - Accurate automatic calculations: Subtotal, Discounts, Optional GST/Tax (18%), Grand Total, Total Paid, and Balance Due.
   - Status indicators: `PAID`, `PARTIALLY PAID`, `PENDING`.
   - Multi-installment payment recording with payment method (UPI, Cash, Bank Transfer, Card) and transaction reference IDs.

6. **Immutable Studio Snapshots (Rule #32 & #33)**:
   - When an invoice is finalized, an immutable snapshot of business details, rates, logo, and terms is permanently locked.
   - Changing prices or settings later will **never** alter existing finalized invoices.
   - Revisions require explicit admin unlock and record audit history.

7. **Bilingual Terms & Conditions Policy**:
   - Numbered Hindi & English policy conditions.
   - Add, edit, delete, reorder, or toggle terms anytime from the management panel.

8. **Customer Autocomplete & History**:
   - Autocompletes customer details as you type name or phone number.
   - Deep customer directory showing aggregate spend, event history, and pending balances.

9. **Installable PWA**:
   - Full Web App Manifest (`manifest.webmanifest`) and Service Worker (`sw.js`).
   - Installable on Android, iPhone, iPad, Windows PC, and Mac.

10. **Data Safety & Backup (Rule #35)**:
    - One-click full database export to timestamped JSON file.
    - One-click restore facility from backup JSON file.
    - Export invoices table to CSV for spreadsheet calculations.

---

## 🚀 How to Run the Application

The application is completely self-contained with offline-ready vendor libraries (`lucide`, `qrcode`, `html2pdf`) and persistent browser storage.

### Option 1: Direct Browser Launch
Simply double-click `index.html` or open it in any modern browser:
- Google Chrome
- Microsoft Edge
- Safari
- Firefox

### Option 2: Local HTTP Server (Recommended for PWA Features)
Run any local static server inside this directory:
```bash
# Using Python (if installed):
python -m http.server 8080

# Or using npx:
npx serve .
```
Then navigate to: `http://localhost:8080`

---

## 🔐 Initial Credentials
- **Username**: `admin`
- **Password**: `DPV@9301614549Kumar`
- **Role**: Owner / Admin

You can update your studio profile, password, and add staff accounts from the Management Panel.

---

## 🛡️ Cloud Database Configuration (Optional Firebase Sync)
If you wish to synchronize data with a dedicated Google Firebase project:
1. Create a **new** Firebase project in the [Firebase Console](https://console.firebase.google.com/).
2. Enable Firestore Database and Firebase Authentication.
3. Deploy the included `firestore.rules` file to protect data.
4. Paste your Firebase web configuration keys in **Studio Settings &rarr; Cloud Sync**.
5. The system uses an isolated collection namespace (`dpv_inv_*`) ensuring zero collision with any other project.

---

## 📁 Standalone Directory Structure
```
c:\Users\HP\Downloads\New folder (2)\
├── index.html                   # Master Application Shell
├── manifest.webmanifest         # PWA Manifest
├── sw.js                        # Offline Service Worker
├── css/
│   ├── main.css                 # Responsive Design System & Layout
│   ├── invoice.css              # Pixel-Perfect A4 Invoice Styling
│   └── print.css                # Dedicated Print Stylesheet
├── js/
│   ├── app.js                   # Master App Controller
│   ├── auth.js                  # Authentication & RBAC
│   ├── store.js                 # Persistent Store (IndexedDB + LocalStorage)
│   ├── invoice-engine.js        # Calculations, Auto-Numbering & Snapshots
│   ├── qr-helper.js             # Dynamic UPI QR Code Engine
│   ├── pdf-generator.js         # A4 PDF Generator & WhatsApp Sharer
│   ├── calendar.js              # Shooting Calendar & Event Schedule
│   ├── backup.js                # JSON Export & Restore Utility
│   ├── firebase-config.js       # Isolated Cloud Sync Adapter
│   └── vendor/
│       ├── lucide.min.js        # Offline Lucide Icons
│       ├── qrcode.min.js        # Offline QR Code Engine
│       └── html2pdf.bundle.min.js # Offline PDF Engine
├── assets/
│   ├── dpv-logo.svg             # Vector Studio Logo
│   ├── icon-192.png             # PWA App Icon (192x192)
│   └── icon-512.png             # PWA App Icon (512x512)
├── firestore.rules              # Isolated Firestore Rules
└── README.md                    # Documentation
```
