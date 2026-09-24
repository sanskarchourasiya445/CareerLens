# 🎯 Rizzume — AI Interview Report & Resume Generator

<div align="center">

![Rizzume Banner](https://img.shields.io/badge/Rizzume-AI%20Powered-6366f1?style=for-the-badge&logo=sparkles&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)

**An AI-powered full-stack web application that evaluates your resume against job descriptions, generates detailed interview reports, and provides intelligent career insights.**

[Features](#-features) • [Tech Stack](#-tech-stack) • [Getting Started](#-getting-started) • [Project Structure](#-project-structure) • [API Reference](#-api-reference) • [Contributing](#-contributing)

</div>

---

## 📌 Overview

**Rizzume** is an **evidence-based AI career intelligence platform** that systematically compares a resume against a specific target job description. Unlike generic LLM-based feedback tools, Rizzume grounds every match in verifiable citations extracted directly from the candidate's resume, computes a **100% deterministic fit score** using weighted algorithms, and offers structured, repeatable evaluation across multiple resume versions and job targets.

---

## ✨ Features

- 🎯 **Evidence-Grounded Matching** — Extracts granular job requirements (technical, experience, domain, soft skills) and categorizes resume alignment into `matched`, `partial`, or `missing` with verbatim quote citations.
- 🧮 **Deterministic Scoring Engine** — Zero LLM hallucinated scores. Match scores (0–100) are computed mathematically via backend importance weighting and critical missing skill penalties.
- 📁 **Reusable Resumes & Target Jobs** — First-class entities for resumes and job descriptions allowing users to evaluate multiple resume variations against saved job postings without repeated uploads.
- 📄 **Hardened PDF Parsing** — Strict 5MB limit, magic-byte (`%PDF-`) validation, and 50 readable character thresholds preventing corrupted or image-only submissions.
- 🛡️ **Prompt Injection Defenses** — Hardened boundary delimiters (`<SYSTEM_INSTRUCTIONS>`, `<UNTRUSTED_RESUME>`, etc.) and strict runtime Zod schema parsing.
- 📊 **Interactive Evidence UI** — Filter requirements by match status, inspect verbatim evidence quotes, review missing requirement warnings, and visualize score breakdowns.
- 🔐 **Robust Authentication** — JWT-based auth with HTTP-only cookies, token blacklisting on logout, and strict IDOR route guards.
- ⚡ **Full-Stack Performance** — Fast Vite + React 18 frontend and scalable Express + MongoDB backend with automated rollback on generation failure.

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 18** | UI library with hooks & context |
| **Vite** | Build tool & dev server |
| **React Router** | Client-side routing |
| **SCSS** | Component-scoped styling |
| **Axios** | HTTP client for API calls |
| **Context API** | Global state management (Auth & Interview) |

### Backend
| Technology | Purpose |
|---|---|
| **Node.js** | JavaScript runtime |
| **Express.js** | Web framework & REST API |
| **MongoDB + Mongoose** | Database & ODM |
| **JWT** | Stateless authentication |
| **Multer** | File upload middleware |
| **AI Service** | Resume analysis & report generation |

---

## 📁 Project Structure

```
Rizzume-AiReportAndResumeGenerator/
│
├── Backend/
│   ├── index.js                      # Server entry point
│   ├── package.json
│   │
│   ├── src/
│   │   ├── app.js                    # Express app configuration
│   │   │
│   │   ├── config/
│   │   │   └── database.js           # MongoDB connection setup
│   │   │
│   │   ├── controllers/
│   │   │   ├── auth.controller.js    # Register, login, logout logic
│   │   │   ├── resume.controller.js  # Reusable resume uploads & management
│   │   │   ├── job.controller.js     # Target job descriptions & AI parsing
│   │   │   └── interview.controller.js # Evidence-grounded analysis & reports
│   │   │
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.js    # JWT verification & blacklist middleware
│   │   │   ├── file.middleware.js    # Multer file upload handling (5MB PDF limit)
│   │   │   └── error.middleware.js   # Centralized error handler
│   │   │
│   │   ├── models/
│   │   │   ├── user.model.js         # User schema
│   │   │   ├── resumeVersion.model.js# Reusable resume entity (extracted text & meta)
│   │   │   ├── job.model.js          # Reusable job entity (structured requirements)
│   │   │   ├── interviewReport.model.js # Evidence-based report & deterministic scores
│   │   │   └── blacklist.model.js    # Invalidated JWT tokens
│   │   │
│   │   ├── routes/
│   │   │   ├── auth.routes.js        # /api/auth/* endpoints
│   │   │   ├── resume.routes.js      # /api/resumes/* endpoints
│   │   │   ├── job.routes.js         # /api/jobs/* endpoints
│   │   │   └── interview.routes.js   # /api/interview/* endpoints
│   │   │
│   │   └── services/
│   │       ├── ai.service.js         # Structured requirement extraction & evidence pipeline (Zod-validated)
│   │       ├── scoring.service.js    # Pure deterministic scoring engine
│   │       └── pdf.service.js        # Hardened Puppeteer PDF generation
│   │
│   └── tests/                        # Automated Jest/Supertest suite (39 tests)
│
└── Frontend/
    ├── index.html
    ├── vite.config.js
    │
    └── src/
        ├── App.jsx                   # Root component
        ├── app.routes.jsx            # Route definitions
        ├── main.jsx                  # React DOM entry
        │
        └── features/
            ├── auth/                 # Authentication feature
            │   ├── auth.context.jsx  # Auth state provider
            │   ├── hooks/useAuth.js  # Auth hook
            │   ├── pages/            # Login & Register pages
            │   ├── components/Protected.jsx  # Route guard
            │   └── services/auth.api.js      # Auth API calls
            │
            └── interview/            # Evidence-based interview feature
                ├── interview.context.jsx     # Interview, Resume & Job state provider
                ├── hooks/useInterview.js     # Interview hook
                ├── pages/            # Home (Dual-mode selectors) & Interview (Evidence UI)
                └── services/interview.api.js # API calls for reports, resumes & jobs
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+
- **MongoDB** (local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))
- **npm** or **yarn**

---

### 1. Clone the Repository

```bash
git clone https://github.com/sanskarchourasiya445/Rizzume-AiReportAndResumeGenerator.git
cd Rizzume-AiReportAndResumeGenerator
```

---

### 2. Backend Setup

```bash
cd Backend
npm install
```

Create a `.env` file in the `Backend/` directory (or copy from `.env.example`):

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/rizzume_ai
JWT_SECRET=your_jwt_secret_key_here
GOOGLE_GENAI_API_KEY=your_google_genai_api_key_here
NODE_ENV=development
```

Start the backend server:

```bash
npm start
# or for development with hot reload:
npm run dev
```

The backend will run at `http://localhost:3000`

---

### 3. Frontend Setup

```bash
cd ../Frontend
npm install
```

Create a `.env` file in the `Frontend/` directory (or copy from `.env.example`):

```env
VITE_API_BASE_URL=http://localhost:3000
```

Start the development server:

```bash
npm run dev
```

The frontend will run at `http://localhost:5173`

---

### 4. Running Automated Tests

Run the backend automated test suite (uses isolated in-memory MongoDB):

```bash
cd Backend
npm test
```

---

## 🔌 API Reference

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register` | Create a new user account | ❌ |
| `POST` | `/api/auth/login` | Login and receive JWT token | ❌ |
| `POST` | `/api/auth/logout` | Logout and blacklist token | ✅ |
| `GET` | `/api/auth/get-me` | Get currently logged in user profile | ✅ |

### Resume Version Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/resumes` | Upload & parse reusable resume PDF (max 5MB, ≥50 chars) | ✅ |
| `GET` | `/api/resumes` | List all resume versions for authenticated user | ✅ |
| `GET` | `/api/resumes/:id` | Fetch specific resume version details & text | ✅ |
| `DELETE` | `/api/resumes/:id` | Delete a resume version (owner only) | ✅ |

### Target Job Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/jobs` | Submit job posting; AI extracts structured requirements | ✅ |
| `GET` | `/api/jobs` | List all saved job postings for authenticated user | ✅ |
| `GET` | `/api/jobs/:id` | Fetch specific job and structured requirements | ✅ |
| `DELETE` | `/api/jobs/:id` | Delete a saved job posting (owner only) | ✅ |

### Evaluation & Report Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/interview/` | Generate evaluation report (reusable IDs or one-shot upload) | ✅ |
| `GET` | `/api/interview/` | Fetch all evaluation reports for authenticated user | ✅ |
| `GET` | `/api/interview/report/:interviewId` | Fetch report details with matches & populated entities | ✅ |
| `POST` | `/api/interview/resume/pdf/:interviewReportId` | Generate tailored resume PDF (owner only) | ✅ |

> **Note:** All protected endpoints accept authentication via HTTP-only cookie or `Authorization: Bearer <token>` header.

---

## 🧮 Deterministic Scoring Engine

Unlike standard generative AI wrappers where the LLM invents an arbitrary score, **Rizzume's backend owns the scoring computation completely**:

1. **Requirement Weighting**:
   - `critical`: multiplier `4.0`
   - `high`: multiplier `3.0`
   - `medium`: multiplier `2.0`
   - `low`: multiplier `1.0`

2. **Status Multipliers**:
   - `matched`: `1.0`
   - `partial`: `0.5`
   - `missing`: `0.0`

3. **Critical Skill Penalty**:
   - For every missing critical requirement, a penalty deduction of **10 points** is subtracted from the weighted score.
   - If **all** critical requirements are missing, the final score is strictly capped at **40/100**.

4. **Zero-Hallucination Evidence Grounding**:
   - For every `matched` or `partial` requirement, the AI pipeline must quote verbatim text from the candidate's resume (`verbatimQuote`).
   - If no supporting quote exists in the resume, the status must strictly be `missing` or `partial` with null/empty quote.
   - Prompts enforce boundary isolation tags (`<SYSTEM_INSTRUCTIONS>`, `<UNTRUSTED_JOB_DESCRIPTION>`, `<UNTRUSTED_RESUME>`) and outputs are strictly validated via Zod schemas.

---

## 🧠 AI Analysis Pipeline

```
[Target Job Description] ─────────► AI Requirement Extraction (Zod Validated)
                                                │
                                                ▼ Structured Requirements List
[Resume PDF / Upload] ────────────► Evidence Analysis Pipeline
                                    - Verbatim citation matching
                                    - Matched / Partial / Missing status
                                    - Prompt injection boundary isolation
                                                │
                                                ▼ Structured Evidence Matches
                              Backend Deterministic Scoring Engine
                              - Weighted importance calculation
                              - Critical missing deductions & caps
                                                │
                                                ▼
                                    Persisted Evaluation Report
                                    - Deterministic Score & Breakdown
                                    - Reusable Resume & Job Links
```

---

## 🎨 Frontend Architecture

The frontend follows a **feature-based architecture** with each feature being self-contained:

```
features/
  auth/       → Login, Register, Protected Routes, Auth Context
  interview/  → Home, Interview Analysis, Interview Context
```

Global state is managed via **React Context API** with custom hooks (`useAuth`, `useInterview`) providing clean abstractions over the contexts.

---

## 🔮 Future Enhancements

Here's what's planned for upcoming versions of Rizzume:

- 📈 **Resume Score Dashboard** — Visual scoring breakdown across categories like skills match, tone, structure, and ATS compatibility
- 🧪 **Mock Interview Mode** — AI-generated interview questions tailored to the job description with answer evaluation
- 📧 **Cover Letter Generator** — Auto-generate personalized cover letters from resume + JD input
- 🔗 **LinkedIn Profile Analyzer** — Paste your LinkedIn URL and get profile optimization tips
- 📂 **Report History & Comparison** — Compare multiple reports side-by-side to track improvement over time
- 🎨 **Resume Templates** — Choose from multiple professional templates to export your resume as a PDF
- 📱 **Mobile Responsive UI** — Fully optimized experience across all screen sizes and devices
- 🔔 **Email Notifications** — Get your report delivered to your inbox after analysis
- 🌙 **Dark Mode** — Full dark/light theme toggle across the entire application

> 💡 Have an idea? Open a [GitHub Issue](https://github.com/sanskarchourasiya445/Rizzume-AiReportAndResumeGenerator/issues) or submit a feature request — contributions are always welcome!

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add some amazing feature'`
4. **Push** to the branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

Please make sure your code follows the existing project structure and conventions.

---

## 👨‍💻 Author

**Sanskar Chourasiya**

[![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/sanskarchourasiya445)

---

<div align="center">


Made with ❤️ and a lot of ☕

</div>
