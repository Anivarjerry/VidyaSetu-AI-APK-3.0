# VIDYASETU AI 2.0 - THE MASTER TECHNICAL UI/UX BLUEPRINT (ULTRA-LARGE SPEC)
**Version:** 2.0.0-Final-Spec
**Target:** Flutter / Android Studio High-Fidelity Reconstruction
**Design Language:** Telegram-Premium, Glassmorphic, Fluid-Motion, AI-Integrated.

---

## 1. FOUNDATIONAL DESIGN TOKENS (THE "SOUL" OF THE UI)

### A. The "Emerald-Slate" Color System
*   **Primary Accent (Emerald 500):** `#10B981` - Used for the "Primary Action" buttons, active navigation states, and success indicators.
*   **Primary Dark (Emerald 600):** `#059669` - Used for button hover/pressed states to give depth.
*   **Primary Light (Emerald 50):** `#ECFDF5` - Used for subtle backgrounds behind emerald text or icons.
*   **Light Mode Background:** `#F1F2F6` - A soft, Telegram-style gray that reduces eye strain.
*   **Light Mode Surface:** `#FFFFFF` - Pure white for cards, modals, and elevated surfaces.
*   **Dark Mode Background:** `#020617` - Slate 950. A deep, cinematic black-blue.
*   **Dark Mode Surface (Level 1):** `#0F172A` - Slate 900. For main cards.
*   **Dark Mode Surface (Level 2):** `#1E293B` - Slate 800. For nested elements like input fields or sub-cards.
*   **Text (Light):** Primary: `#000000` | Secondary: `#64748B` (Slate 500).
*   **Text (Dark):** Primary: `#FFFFFF` | Secondary: `#94A3B8` (Slate 400).

### B. Typography (Inter Variable Font)
*   **H1 (Hero Title):** 28px | Weight: 900 (Black) | Tracking: -0.03em | Line-height: 1.1.
*   **H2 (Dashboard Greeting):** 22px | Weight: 800 (Extra Bold) | Tracking: -0.02em.
*   **H3 (Card Title):** 16px | Weight: 700 (Bold) | Tracking: -0.01em.
*   **Body (Standard):** 14px | Weight: 400 (Regular) | Line-height: 1.5.
*   **Label (Medium):** 13px | Weight: 600 (Semi-bold) | Uppercase for micro-labels.
*   **Mono (Data):** 12px | Weight: 500 | 'JetBrains Mono' for IDs and timestamps.

### C. Geometry & Glassmorphism
*   **Corner Radius:** 
    *   `Dashboard Cards`: 24px (Ultra-rounded for a modern feel).
    *   `Modals`: 32px (Top corners only).
    *   `Buttons/Inputs`: 14px.
*   **Glass Effect:** 
    *   `Blur`: 25px.
    *   `Saturation`: 150%.
    *   `Border`: 1px solid `white/10` (Dark) or `black/5` (Light).

---

## 2. MOTION & INTERACTION ENGINE

### A. The "VidyaSetu" Splash Sequence (1.5s)
1.  **Phase 1 (0-800ms):** A circular Emerald ripple expands from the center of the screen, covering the white/slate background.
2.  **Phase 2 (400-1200ms):** The white SVG Logo fades in with a "Slam-In" effect (Scale 1.5 -> 1.0) with a soft glow.
3.  **Phase 3 (800-1500ms):** The text "VIDYASETU AI" slides up from below the logo with letter-spacing expanding from 0.1em to 0.3em.
4.  **Exit:** The entire splash screen fades to `opacity: 0` as the Login/Dashboard scales in from 0.95.

### B. Gesture Controls
*   **Vertical Drag (Modals):** Modals can be "flicked" down to close.
*   **Horizontal Swipe (Tabs):** Smooth transition between Home, History, and Profile.
*   **Long Press:** On dashboard cards to show "Quick Actions" (e.g., Long press Attendance to see "Quick Mark All Present").

---

## 3. THE DASHBOARD ARCHITECTURES (ULTRA-DETAILED)

### A. THE PRINCIPAL'S COMMAND CENTER (`PrincipalDashboard`)
*   **Top Bar:** Glassmorphic header with "VidyaSetu AI" logo on left, Profile Avatar on right.
*   **Hero Section:** A large card showing "School Health" - a percentage of overall attendance and a line chart of the week's activity.
*   **Stats Row (Horizontal Scroll):**
    *   `Card 1`: Total Students (Icon: Users, Color: Emerald).
    *   `Card 2`: Staff Active (Icon: Briefcase, Color: Blue).
    *   `Card 3`: Fees Collected (Icon: Wallet, Color: Amber).
*   **Action Grid (2x2):**
    *   `Attendance Analytics`: Opens a deep-dive modal with Recharts-style bar graphs.
    *   `Staff Configuration`: A list of all staff with "Active/Inactive" toggles and role editing.
    *   `School Info`: Editable card with school address, contact, and logo.
    *   `Notices`: A list view where Principal can type a message and hit "Broadcast".

### B. THE TEACHER'S PRODUCTIVITY HUB (`TeacherDashboard`)
*   **Greeting:** "Good Morning, [Name]! You have 4 classes today."
*   **Class Cards:** Vertical list of classes. Each card shows: Class Name, Subject, Time, and a "Mark Attendance" button.
*   **Attendance Modal:**
    *   Search bar at top to find students.
    *   List of students with large, thumb-friendly "P" (Green) and "A" (Red) buttons.
    *   "Submit" button with a loading spinner and success ripple.
*   **Homework Portal:**
    *   Multi-step form: 1. Select Class -> 2. Type Description -> 3. Attach Media (Camera/Gallery) -> 4. Set Deadline.
*   **History Modal:** A chronological list of all actions taken, with a "Search by Date" filter.

### C. THE PARENT'S ENGAGEMENT PORTAL (`ParentDashboard`)
*   **Child Profile Switcher:** If multiple children, a row of circular avatars at the top. Active child has an Emerald ring.
*   **Status Bento Grid:**
    *   `Attendance`: Large percentage (e.g., 94%) with a "View History" link.
    *   `Transport`: A mini-map preview showing the bus icon moving.
    *   `Homework`: "3 Pending" badge.
    *   `Exams`: "Next Exam: Mathematics (25th Oct)".
*   **Transport Tracker Modal:**
    *   Full-screen Google Maps integration.
    *   Custom "Bus" marker with a directional arrow.
    *   Bottom Sheet: Shows Driver Name, Phone (with Call button), Current Speed, and ETA to "Your Stop".

### D. THE GATEKEEPER'S SECURITY HUB (`GatekeeperDashboard`)
*   **Primary Action:** A massive, glowing Emerald button: "SCAN QR CODE".
*   **Scanner Interface:** A camera view with a square overlay. On success, it shows a "Student Verified" popup with the student's photo and class.
*   **Manual Log Form:** Fields for Visitor Name, Mobile, Purpose, and "Whom to Meet".
*   **Live Feed:** A scrolling list of everyone who entered/exited in the last 2 hours with "In/Out" badges.

### E. THE DRIVER'S TRACKING HUB (`DriverDashboard`)
*   **The "Live" Switch:** A large toggle at the top: "GO LIVE / START TRIP". When ON, the header turns Emerald and pulses.
*   **Route List:** A vertical timeline of stops.
*   **Student Checklist:** For each stop, a list of students to be picked up. Checking them off sends a "Student Boarded" notification to parents.
*   **SOS Button:** A red floating button that sends an immediate alert to the Principal and Transport Manager.

### F. THE SYSTEM ADMIN CONTROL (`AdminDashboard`)
*   **User Management:** A searchable table of all users with "Edit", "Block", and "Reset Password" actions.
*   **School Config:** Global settings for school name, logo, academic year, and working days.
*   **Subscription Modal:** Shows current plan, expiry date, and a "Renew/Upgrade" button linked to Razorpay.
*   **Database Logs:** A technical view of system syncs and errors (for troubleshooting).

---

## 4. CORE UI COMPONENTS (SPECIFICATIONS)

### A. The "VidyaSetu" Modal System
*   **Animation:** `slideUp` from bottom.
*   **Header:** Sticky, glassmorphic, with a "Drag Handle" (thin gray line) at the top center.
*   **Close Action:** Tap "X" or Swipe Down.
*   **Background Dim:** 60% black blur.

### B. AIChatModal (The Intelligent Assistant)
*   **Interface:** Looks exactly like Telegram.
*   **Bubbles:** 
    *   `User`: Right-aligned, Emerald background, White text, rounded except bottom-right corner.
    *   `AI`: Left-aligned, Slate-800 background, White text, rounded except bottom-left corner.
*   **Features:** Typing animation (3 dots), Markdown support for AI responses, and "Quick Reply" chips at the bottom.

### C. Skeleton Loaders
*   **Design:** Rounded rectangles matching the actual card shapes.
*   **Animation:** A soft, diagonal shimmer moving from left to right every 1.5 seconds.

---

## 5. TECHNICAL GESTURES & LOGIC
*   **Back Button Priority:** 
    1. Close Modal.
    2. Close Keyboard.
    3. Switch to Home Tab.
    4. Exit App.
*   **Offline Banner:** A thin, Amber (`#F59E0B`) bar that slides down from the header when `navigator.onLine` is false.
*   **Haptic Feedback:** Light vibration on button taps, heavy vibration on errors/SOS.

---
**Final Instruction for Flutter Dev:** Use `CustomPainter` for the ripple effects and `AnimationController` for the splash sequence. Ensure all lists use `ListView.builder` for performance. The UI must feel "expensive" and "fluid"—no janky transitions.
