
# VidyaSetu AI - Smart Time Table Module Update Plan

## 1. Overview
This document outlines the strategy for upgrading the Time Table management system in VidyaSetu AI. The goal is to assist Principals in creating schedules efficiently using "Logic-Based Suggestions" for manual entry and "Generative AI" for full schedule creation, while managing teacher hierarchy (Expert/Senior/Associate).

## 2. Coding & Implementation Rules (STRICT)
*   **Read Before Write:** Always read the existing file content completely before making changes.
*   **Full Code Policy:** When updating any file, **ALWAYS output the FULL content**. Never use shortcuts like `// ... existing code` or `// rest of code`.
*   **Backup Logic:** Before overwriting complex logic, ensure the old logic is preserved or seamlessly migrated. Do not break existing functionality.
*   **Database Integrity:** Existing data in the `time_tables` table must be preserved. New features must read/write to this existing structure.

## 3. Database Schema Strategy

### A. Existing Data Storage
*   **Current Table:** `time_tables` (Supabase)
*   **Purpose:** Stores the master schedule displayed to teachers and students.
*   **Key Columns:** `id`, `school_id`, `class_name`, `day_of_week`, `period_number`, `subject`, `teacher_id`.

### B. New Table: `teacher_profiles`
We need to create this table to store advanced metadata for the AI and Suggestion logic. This avoids cluttering the main `users` table.

**SQL Schema to Execute:**
```sql
create table teacher_profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  school_id uuid references schools(id) on delete cascade,
  teacher_tier text check (teacher_tier in ('Expert', 'Senior', 'Associate')),
  primary_subjects text[], -- Array of strings e.g. ['Maths', 'Physics']
  secondary_subjects text[], -- Array of strings e.g. ['Science', 'PT'] for substitution
  max_periods_per_day int default 8,
  is_floater boolean default false, -- Can be used for substitution easily
  created_at timestamptz default now(),
  unique(user_id)
);
```

## 4. Feature Specifications

### Feature 1: Staff Configuration (Management Tab)
*   **Location:** A new section in the Principal's "Manage" view (likely inside `AdminDashboard.tsx` or `PrincipalDashboard.tsx`).
*   **Action:** Principal selects a teacher card and assigns:
    *   **Tier:** Expert / Senior / Associate.
    *   **Skills:** Primary (Main expertise) and Secondary (Can teach if needed).
    *   **Load:** Max periods they can handle.
*   **Storage:** Saves to the new `teacher_profiles` table.

### Feature 2: Smart Suggest Button (Manual Entry)
*   **Context:** In the existing Time Table grid (Principal Dashboard > Manage > Time Table), next to the "Teacher" dropdown for a specific period cell.
*   **UI:** A small "✨ Suggest" button next to the dropdown.
*   **Logic (Client-Side filtering, No AI Cost):**
    1.  **Filter 1 (Availability):** query the `time_tables` data (already loaded) to see which teachers are **not** assigned to any other class for the *same day* and *same period*.
    2.  **Filter 2 (Leaves):** Check `staff_leaves` (if relevant for daily adjustments).
    3.  **Filter 3 (Skill Matching):**
        *   **Best Match:** Teacher is free + Primary Subject matches the class subject + Tier is appropriate (e.g., Expert for Class 10/12).
        *   **Good Match:** Teacher is free + Secondary Subject matches.
        *   **Floater:** Teacher is free + `is_floater` is true (for substitution).
*   **Output:** A sorted dropdown list showing the best candidates first (e.g., "Rakesh Sir (Maths - Expert) ✅").

### Feature 3: AI Auto-Generate (Full Schedule)
*   **Context:** A "Generate via AI" button for an empty class schedule or the whole school.
*   **Process:**
    1.  Fetch all `school_classes`, `class_subjects`, and `teacher_profiles`.
    2.  Construct a JSON payload describing constraints (e.g., "Class 10 needs 1 Maths period daily", "Teacher A is Expert in Maths").
    3.  **Gemini Prompt:** "Generate a weekly schedule for Class 10. Prioritize Expert teachers for Maths/Science in morning slots. Use Secondary subjects if Primary unavailable."
    4.  **Response:** Gemini returns a JSON array of `{ day, period, subject, teacher_name }`.
    5.  **Review:** Populate the UI grid with this data (highlighted as 'Draft').
    6.  **Save:** Principal clicks "Save" -> writes to `time_tables`.

### Feature 4: Bulk Copy / Replicate
*   **UI:** Button "Copy Monday to..." on the Time Table view.
*   **Logic:**
    *   Fetch all entries where `day_of_week` = 'Monday' and `class_name` = current class.
    *   Create new entries for target days (Tue-Sat) with the same period/subject/teacher data.
    *   **Conflict Alert:** If copying creates a conflict (e.g., Teacher A is already busy on Tuesday Period 1 in another class), warn the user or leave that slot empty.

## 5. Implementation Checklist (When Triggered)
1.  [x] **DB:** Run SQL for `teacher_profiles` in Supabase editor.
2.  [x] **Types:** Update `types.ts` with `TeacherProfile` interface.
3.  [x] **Services:**
    *   [x] Update `dashboardService.ts` to fetch/save profiles.
    *   [x] Implement `getSmartSuggestions()` logic (Client side in component).
    *   [x] AI Service update for structured output.
4.  [x] **UI Components:**
    *   [x] Create `StaffConfigModal.tsx` for setting skills.
    *   [x] Update `TimeTableTab.tsx` to integrate the Smart Suggest button and AI generation flow.
    *   [x] Update `PrincipalDashboard.tsx` to add entry point.
