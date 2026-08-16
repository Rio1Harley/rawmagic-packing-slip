# Raw Magic · Packing Slip Studio

A tiny, single-purpose web app that turns a **Shopify packing slip PDF** into a
**Raw Magic–branded courier label** at whatever size you print on — 4×6″ thermal,
A4, A5, A6, and more.

Everything runs **in the browser**. The PDF is read with `pdf.js` on the client,
the details are extracted and shown in an editable form, and the branded label is
generated with `jsPDF`. **Nothing is uploaded, and nothing is stored** — the file
never leaves the device, and closing the tab clears it.

## What it does

1. **Upload** the packing-slip PDF from Shopify (`Orders → Print → Packing slip`).
2. **Auto-detect** the order number, ship-to name/address/phone, items (including
   gift-box contents), and gift message.
3. **Edit** anything that didn't come through cleanly — every field is editable.
4. **Pick a size** — standard courier label sizes are built in, plus a custom size.
5. **Download** a print-ready, brand-styled PDF at the exact physical dimensions.

### Label sizes (researched)

`4" × 6"` is the universal thermal shipping-label size accepted across Amazon,
Meesho, Myntra, Flipkart, Shiprocket, Delhivery, Blue Dart, DTDC, etc. Also
included: A6, A5, A4 (Shopify's own slip), 4×4″, 3×4″, and a custom size (in / mm).

## Privacy

- No backend, no database, no analytics.
- The uploaded PDF is parsed in memory with `pdf.js`; only the extracted text
  fields are kept in React state. The `File` object is never persisted or sent
  anywhere, and everything is gone on refresh.

## Tech

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS**
- **pdfjs-dist** — client-side PDF text extraction
- **jsPDF** + **html2canvas** — exact-size PDF export of the branded label

The `pdf.js` web worker is copied into `/public` automatically (`postinstall` /
`prebuild` run `scripts/copy-pdf-worker.mjs`).

## Run locally

```bash
npm install
npm run dev
# http://localhost:3000
```

## Deploy to Vercel

1. Push this repo to GitHub (already done).
2. In Vercel: **New Project → import this repo**.
3. Framework preset **Next.js** is auto-detected — no env vars, no database.
4. Deploy. That's it.

---

Built for **Raw Magic** (therawmagic.com) by **Nextline Creative**.
