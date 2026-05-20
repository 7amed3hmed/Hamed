# inPlace — Volunteer Opportunity Matching Platform

inPlace is a high-performance, full-stack volunteering ecosystem designed to bridge the gap between passionate volunteers and impactful organizations. By leveraging intelligent skill-based matching and personality assessments, inPlace transforms traditional volunteering into a measurable journey of growth and contribution.

The platform provides dedicated workflows for three primary roles:
- **Student / Volunteer**: Discover opportunities that match your specific skills and personality profile.
- **Organization / Company**: List, manage, and moderate high-quality volunteering opportunities.
- **Admin**: Oversee platform integrity, moderate organizations and opportunities, and analyze community impact.

---

## 🚀 Project Overview

inPlace is built to modernize the volunteering landscape with a premium, data-driven approach:
- **Intelligent Matching**: Volunteers are matched with causes based on their technical skills (e.g., React, Node.js) and soft-skill strengths derived from personality snapshots.
- **Verified Impact**: Every hour contributed is tracked and verified, contributing to a global **Top Rank Volunteer** leaderboard.
- **Robust Moderation**: A comprehensive admin dashboard ensures all organizations and opportunities meet platform standards before going live.
- **Real-time Notifications**: Users receive instant updates on application statuses, approvals, and new opportunities.

The architecture follows a modern **MERN**-inspired stack (MongoDB, Express, React, Node.js) with a focus on type safety and a sleek, purple-themed design system.

---

## ✨ Key Features

### 🎓 Student / Volunteer Features
- **Smart Onboarding**: Multi-step onboarding including CV skill extraction (via Gemini AI) and personality assessments.
- **Opportunity Discovery**: Browse approved opportunities with advanced filters for category, mode (Remote/Hybrid), and compensation.
- **One-Click Application**: Apply instantly or complete an organization-required assessment (exam) to demonstrate capability.
- **Profile Management**: Manage skills, interests, and upload professional portraits.
- **Gamified Ranking**: Earn badges (Platinum, Gold, Bronze) and climb the leaderboard based on verified volunteer hours.
- **Notifications**: Instant alerts for application acceptance, rejection, and milestone achievements.

### 🏢 Organization / Company Features
- **Opportunity Lifecycle**: Create, edit, and delete opportunities with detailed requirements and custom assessments.
- **Applicant Management**: View detailed applicant profiles including radar charts for personality compatibility and skill match percentages.
- **Verification System**: Track "Volunteer Hours" (1-140) per opportunity for automated leaderboard credit.
- **Organization Branding**: Professional profiles with logo uploads and industry categorization.
- **Notification Center**: Alerts for new applicants and admin moderation decisions.

### 🛡️ Admin Features
- **Moderation Queue**: Review pending organizations and opportunities to ensure platform safety.
- **User Management**: Monitor, suspend, or remove users and organizations.
- **Platform Analytics**: High-level statistics on volunteers, organizations, and live opportunities.
- **System Oversight**: Direct control over the status of any listing or user account.

---

## 🛠️ Tech Stack

| Area | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 18 / TypeScript | Core UI framework with strict typing |
| **Styling** | Tailwind CSS / shadcn/ui | Premium design system and component library |
| **State Management** | Zustand | Lightweight, high-performance global state |
| **Animations** | Framer Motion / Lucide | Smooth transitions and modern iconography |
| **Backend** | Node.js / Express 5 | Scalable RESTful API architecture |
| **Database** | MongoDB / Mongoose | NoSQL data persistence and modeling |
| **Authentication** | JWT / Bcryptjs | Secure token-based auth and password hashing |
| **AI Integration** | Google Gemini API | Automated CV skill extraction |
| **Communication** | Resend / Nodemailer | Professional email verification and transactional mail |
| **File Storage** | Multer | Local storage for images and documents |

---

## 🏗️ Architecture & Structure

inPlace uses a decoupled client-server architecture:
- **Frontend**: A Vite-powered SPA communicating via Axios.
- **Backend**: An Express API serving JSON and managing static assets from `/uploads`.
- **Database**: MongoDB handles complex relationships between users, opportunities, and applications.

### Project Layout
```text
inplace/
├── backend/
│   ├── src/
│   │   ├── controllers/   # Request logic & business rules
│   │   ├── models/        # Mongoose schemas (User, Internship, etc.)
│   │   ├── routes/        # API endpoint definitions
│   │   ├── middlewares/   # Auth (JWT) & role-based access
│   │   ├── emails/        # HTML email templates
│   │   └── index.ts       # Server entry point
│   ├── uploads/           # Static asset storage (profile pics, logos)
│   └── .env               # Server configuration
└── frontend/
    ├── src/
    │   ├── pages/         # Role-specific dashboards & public views
    │   ├── components/    # Reusable UI (Navbar, Cards, Layouts)
    │   ├── store/         # Zustand state (auth, internships)
    │   ├── services/      # Axios API wrappers
    │   └── utils/         # Image URL helpers & formatting
    ├── vite.config.ts     # Frontend port & alias config
    └── .env               # Frontend environment vars
```

---

## 📊 Database Design

| Collection | Purpose | Key Fields |
| :--- | :--- | :--- |
| **users** | Identity & Profiles | `email`, `role`, `isVerified`, `profileImage`, `logo`, `skills` |
| **internships** | Opportunities | `title`, `companyId`, `volunteerHours`, `status`, `exam` |
| **applications** | Matches | `studentId`, `internshipId`, `status`, `hoursEarned` |
| **notifications** | User Alerts | `recipientId`, `type`, `message`, `isRead` |
| **supportmessages**| User Support | `name`, `email`, `subject`, `message` |

> [!NOTE]
> The system has transitioned from `duration` to `volunteerHours` (1-140) to support the automated ranking system.

---

## ⚙️ Setup & Installation (Windows PowerShell)

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [MongoDB Community Server](https://www.mongodb.com/try/download/community)
- [MongoDB Compass](https://www.mongodb.com/products/compass) (Optional)

### 1. Initialize MongoDB
Ensure your local MongoDB service is running:
```powershell
# Check service status
Get-Service -Name MongoDB
# If stopped, start it
Start-Service -Name MongoDB
```

### 2. Backend Configuration
1. Navigate to the backend directory:
   ```powershell
   cd backend
   npm install
   ```
2. Create a `.env` file based on the following:
   ```env
   PORT=8000
   MONGODB_URI=mongodb://127.0.0.1:27017/inplace
   JWT_SECRET=your_secret_key
   JWT_EXPIRES_IN=30d
   RESEND_API_KEY=your_resend_key
   GEMINI_API_KEY=your_gemini_key
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password
   ```
   link RESEND_API_KEY: https://resend.com/
   
   link GEMINI_API_KEY: https://ai.google.dev/gemini-api/docs/api-key
   
   EMAIL_PASS:https://myaccount.google.com/apppasswords?utm_source=chatgpt.com
   ---
   
4. Start the development server:
   ```powershell
   npm run dev
   ```

### 3. Frontend Configuration
1. Open a new PowerShell terminal:
   ```powershell
   cd frontend
   npm install
   ```
2. Start the Vite dev server:
   ```powershell
   npm run dev
   ```
   The app will typically be available at `http://localhost:5173`.

---

## 📡 API Endpoints

| Endpoint | Method | Purpose | Role Required |
| :--- | :--- | :--- | :--- |
| `/api/auth/login` | POST | Authenticate & issue JWT | Public |
| `/api/auth/profile`| PUT | Update profile / Upload image | User |
| `/api/internships` | POST | Create new opportunity | Company |
| `/api/admin/stats` | GET | Platform analytics | Admin |
| `/api/volunteers/top-rank` | GET | Leaderboard data | Public |

---

## 🛠️ Troubleshooting

| Issue | Cause | Resolution |
| :--- | :--- | :--- |
| **ECONNREFUSED 127.0.0.1:27017** | MongoDB not running | Run `Start-Service -Name MongoDB` in PowerShell. |
| **Broken Images** | CORS/CORP Policies | Ensure backend `index.ts` has `Cross-Origin-Resource-Policy: cross-origin`. |
| **401 Unauthorized** | Missing/Expired Token | Log out and log back in to refresh the session. |
| **Validation: duration required** | Schema Mismatch | Update models to use `volunteerHours` and remove `duration` requirements. |
| **Blank Top Rank Page** | Missing Icons | Check console for `ReferenceError` and ensure all icons are imported from `lucide-react`. |

---

## 📦 Production Build

To build both the backend and frontend for production, execute the following commands in their respective directories:

### Backend Build
```powershell
cd backend
npm install
npm run build
```
This compiles the TypeScript code in `src/` to JavaScript under the `dist/` directory.

### Frontend Build
```powershell
cd frontend
npm install
npm run build
```
This builds and bundles the React Vite client to optimized static assets under the `dist/` directory.

---

## 🎨 Development Guidelines
- **Branding**: Always use **inPlace** for public-facing text.
- **Design**: Stick to the purple (`#7c3aed`) and indigo color palette.
- **Safety**: Never delete `_id` during serialization; it is required for backend comparisons.
- **Uploads**: Images are served from `http://localhost:8000/uploads/`. Do not prepend `/api`.

---
© 2026 inPlace. Matching skills with service.
