# Offline Resilience (PWA) Implementation Plan

## Goal Description
The objective is to make the ShopTrack React frontend resilient to network drops. If the internet goes down, staff should still be able to load the app, browse the product catalog, ring up sales (including Credit sales), and save them locally. Once the connection is restored, these queued transactions will automatically sync to the PostgreSQL backend.

## Proposed Changes

---

### Phase 1: Local Database & PWA Plugins

#### [MODIFY] package.json
Install necessary libraries to support IndexedDB and Service Workers:
- **Production:** `dexie` (A minimalist wrapper for IndexedDB)
- **Development:** `vite-plugin-pwa` (Zero-config PWA framework for Vite)

#### [MODIFY] vite.config.ts
Integrate the `VitePWA` plugin to automatically generate a Service Worker using Workbox.
- Configure Workbox to pre-cache all static assets (HTML, JS, CSS).
- Add runtime caching rules for `GET /api/v1/products` and `GET /api/v1/categories` so the product grid loads even when completely offline.

---

### Phase 2: IndexedDB Sync Architecture

#### [NEW] src/services/db.ts
Initialize a local Dexie database (`ShopTrackDB`).
- Define a table: `syncQueue` 
- Schema: `id++`, `type` ('sale' | 'credit'), `payload` (JSON), `createdAt`, `status` ('pending' | 'failed').

#### [NEW] src/services/syncQueue.ts
Create a foreground sync manager.
- Function `queueTransaction(type, payload)`: Saves item to Dexie.
- Function `processQueue()`: Iterates over `syncQueue`, attempts to `api.post` each item to the backend. If successful, deletes from Dexie.
- Register `window.addEventListener('online', processQueue)` to trigger sync automatically when the network returns.

---

### Phase 3: Application UI & Logic Integration

#### [MODIFY] src/services/api.ts
Add a global Axios interceptor (or handle it at the component level) to detect `ERR_NETWORK` on POST requests. For now, it's safer to handle the logic explicitly in the components to manage optimistic UI updates correctly.

#### [MODIFY] src/pages/POSPage.tsx & src/pages/CreditPage.tsx
- When the user clicks "Checkout" or "Record Credit", catch any network errors (like `err.message === 'Network Error'` or no response).
- If a network error occurs, divert the payload to `syncQueue.queueTransaction()`.
- Show a Toast notification: `"You are offline. Sale saved locally and will sync when online."`
- Clear the local cart just like a successful online sale.

#### [MODIFY] src/components/Topbar.tsx
- Add an `Online / Offline` indicator status badge (e.g., using a green/red dot or a Wifi icon).
- Add a counter showing the number of pending transactions sitting in the IndexedDB `syncQueue`.
- Click the counter to manually trigger `processQueue()`.

---

## Verification Plan

### Manual Verification
1. **Load Up:** Open the app and verify the PWA manifests and Service Worker register successfully.
2. **Go Offline:** Simulate offline mode via Chrome DevTools (Network tab -> "Offline").
3. **Test Caching:** Hard refresh the page. The app UI should still fully load, and the product grid should populate from the Workbox cache.
4. **Offline Sale:** Ring up a sale and click checkout. It should succeed instantly, placing the payload in IndexedDB and showing an "Offline" toast.
5. **Verify Queue:** Check the Topbar; it should show 1 pending sync item. Check Application tab -> IndexedDB to see the stored row.
6. **Go Online:** Switch Chrome DevTools Network back to "No throttling".
7. **Auto-Sync:** The app should detect the [online](file:///c:/Users/Wis_Dom/Documents/AG%20Codes/ShopTrack_POS/backend/alembic/env.py#32-42) event, push the queued sale to the FastAPI backend, and clear the local Dexie queue.
8. **Verify Backend:** Check the Sales Records tab to confirm the backend successfully ingested the offline transaction.
