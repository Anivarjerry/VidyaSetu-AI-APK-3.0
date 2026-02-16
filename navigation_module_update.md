
# VidyaSetu AI - Native Navigation & Back Handler Overhaul

## 1. Overview
This module aims to implement a **"Single Source of Truth"** navigation system to fix back-button conflicts. Currently, multiple components (`Dashboard`, `TeacherDashboard`, hooks) fight for control over the browser history, causing the app to exit prematurely or jump to the wrong tab. We will implement a centralized **Global Navigation Context** that manages a logical stack of views and modals, providing a native Android-like experience.

## 2. Coding & Implementation Rules (STRICT)
*   **Read Before Write:** Always read the existing file content completely before making changes.
*   **Full Code Policy:** When updating any file, **ALWAYS output the FULL content**. Never use shortcuts like `// ... existing code` or `// rest of the code`.
*   **Backup Logic:** Before overwriting complex logic, ensure the old logic is preserved or seamlessly migrated. Do not break existing functionality.
*   **Context Isolation:** Ensure that the new Navigation Context allows independent operation of different dashboards without state bleeding.
*   **Step-by-Step Update:** After completing a step, **YOU MUST UPDATE THIS FILE** to mark the step as `[x] Done`. When the user asks for the "Next Step", read this file first to know where to resume.

## 3. Architecture Strategy: "Global Stack Manager"

### The Problem
Currently, `useModalBackHandler` pushes a history state locally. If `Dashboard.tsx` (Parent) and `TeacherDashboard.tsx` (Child) both use it, we get race conditions.

### The Solution
1.  **Central Brain (`NavigationContext`):** It will hold a `stack` array (e.g., `['home', 'profile', 'modal:attendance']`).
2.  **One Listener:** Only `App.tsx` (or the Provider) will listen to the physical Back Button (`popstate`).
3.  **Smart Hook:** `useModalBackHandler` will no longer touch `window.history` directly. Instead, it will register/unregister itself with the Context.
4.  **Logic Flow on Back Press:**
    *   **Priority 1:** If a `Modal` is in the stack -> Close it (pop stack).
    *   **Priority 2:** If a `Sub-Tab` (Action/Manage/Profile) is active -> Switch to 'Home'.
    *   **Priority 3:** If on `Home` -> Allow App Exit (Default browser behavior).

## 4. Implementation Steps

### Step 1: Core Infrastructure (Context & Hook)
*   **Goal:** Establish the brain of the navigation.
*   **Files:**
    1.  `contexts/NavigationContext.tsx`: Update to manage a global `modalStack` and `activeTab`. Add methods `registerModal`, `unregisterModal`, `goBack`.
    2.  `hooks/useModalBackHandler.ts`: Rewrite this to simply call `registerModal` on mount and `unregisterModal` on unmount. Remove direct `history.pushState` from here.
    3.  `App.tsx`: Add the **Master History Listener**. This listener will intercept the back button and tell the Context what to do.

### Step 2: Dashboard Integration (Parent Layer)
*   **Goal:** Connect the main Dashboard container to the new system.
*   **Files:**
    1.  `components/Dashboard.tsx`:
        *   Replace local `currentView` state with `useNavigation().activeTab`.
        *   Replace local `activeModal` state logic to rely on the Context for back handling checks.
    2.  `components/Header.tsx` & `components/BottomNav.tsx`: Update to use Context for switching tabs (Home/Profile/etc).

### Step 3: Sub-Dashboard Cleanup (Child Layer)
*   **Goal:** Ensure child components play nicely with the global brain.
*   **Files:**
    *   `components/TeacherDashboard.tsx`
    *   `components/PrincipalDashboard.tsx`
    *   `components/ParentDashboard.tsx`
    *   `components/GatekeeperDashboard.tsx`
    *   **Action:** Ensure they use the updated `useModalBackHandler`. Since we refactored the hook in Step 1, this step might mostly be verification, but we need to check if they have conflicting local history logic.

## 5. Progress Log

- [x] **Step 1:** Core Infrastructure (Context, Hook, App.tsx).
- [x] **Step 2:** Dashboard Integration (Dashboard, Header, BottomNav).
- [x] **Step 3:** Sub-Dashboard Verification & Cleanup.

---
**Instruction for AI:** When asked to "Start" or "Next", read the Checklist above. Execute the first unchecked step. After generating the code, update this file to mark that step as `[x]`.
