
# VidyaSetu AI - Offline Implementation Master Plan

## 🛑 UNIVERSAL CODING RULES (AI MUST FOLLOW)
1.  **READ BEFORE WRITE:** Before modifying any file, read its *entire* existing content to understand context, imports, and structure.
2.  **NO PARTIAL CODE:** Never return code with comments like `// ... rest of the code` or `// existing code`. ALWAYS provide the FULL file content in the XML output.
3.  **NO BREAKING CHANGES:** Ensure that while adding offline features, the online functionality remains exactly as it is.
4.  **TYPE SAFETY:** Maintain TypeScript interfaces. If a function signature changes, update it everywhere.
5.  **TASK UPDATES:** After completing a task, update this file to mark the task as `[x] Done`.

---

## 🏗 Architecture Strategy: "Offline-First Sync"

1.  **Storage:** We will use **IndexedDB** (via `idb` library) instead of `localStorage` because it can store large data (images, lists) and is asynchronous.
2.  **Read Strategy (Stale-While-Revalidate):**
    *   UI loads data immediately from IndexedDB (instant load).
    *   App fetches fresh data from Supabase in the background.
    *   If fresh data comes, UI updates and IndexedDB is updated.
3.  **Write Strategy (Queue & Sync):**
    *   **Online:** Send directly to Supabase.
    *   **Offline:** Save action to `mutation_queue` in IndexedDB. Show "Saved (Offline)" status.
    *   **Sync:** When connection returns, `SyncManager` processes the queue automatically.

---

## ✅ Task List

### 🔴 Task 0: Fix PWA Ghost Window (Immediate Fix)
- [x] Update `vite.config.ts` manifest configuration to force standalone mode and fix scope issues causing dual instances.

### ⚪ Task 1: Infrastructure Setup (The Foundation)
- [x] Create `services/offlineStore.ts`: Setup IndexedDB with tables (`cache`, `mutation_queue`).
- [x] Create `services/syncManager.ts`: Create the background worker that listens for internet connection and processes the queue.
- [x] Install `idb` package (Implementation done via native `indexedDB` wrapper to avoid dependency issues).

### ⚪ Task 2: Auth Service Refactor
- [x] Update `services/authService.ts`: 
    *   Allow `loginUser` to check local storage/IDB if offline.
    *   Store user session securely in IDB for offline retrieval.

### ⚪ Task 3: Dashboard Service Refactor (Heavy Lifting)
- [x] Update `services/dashboardService.ts`:
    *   Wrap all `fetch...` functions with the "Read Strategy" (Cache first, then Network).
    *   Wrap all `submit...` (Attendance, Homework, etc.) functions with "Write Strategy" (Queue if offline).

### ⚪ Task 4: UI Indicators & Feedback
- [x] Update `components/Header.tsx`: Add Cloud Sync Icon (Green=Online, Yellow=Syncing, Red=Offline).
- [x] Update `App.tsx`: Initialize `SyncManager` on app start.
- [x] Update `components/Dashboard.tsx` & Modals: Show toast/alert when data is saved offline.

---

## 📝 Current Status
**Status:** All tasks completed. Offline system is fully operational.
