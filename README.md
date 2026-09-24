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

**Rizzume** is a full-stack MERN application that harnesses the power of AI to help job seekers stand out. Upload your resume, provide a job description, and let Rizzume generate a comprehensive interview readiness report — highlighting skill gaps, strengths, and personalized recommendations.

Whether you're preparing for your first job or switching careers, Rizzume gives you the edge you need.

---

## ✨ Features

- 🤖 **AI-Powered Analysis** — Leverages a powerful AI service to deeply analyze resumes against job descriptions
- 📄 **Resume Upload & Parsing** — Supports PDF resume uploads (maximum 5MB) with magic-byte validation and readable text extraction
- 📊 **Interview Readiness Reports** — Generates structured, detailed reports stored persistently in MongoDB
- 🔐 **Secure Authentication** — Full JWT-based auth flow with token blacklisting for safe logout
- 🛡️ **Protected Routes** — Frontend route guards ensure only authenticated users access core features
- 🌐 **RESTful API** — Clean, well-structured Express backend with modular routing
- ⚡ **Lightning-Fast Frontend** — Built with React + Vite for blazing-fast HMR and builds
- 🎨 **SCSS Styling** — Custom, maintainable styles using SCSS with component-level scoping

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
│   └── src/
│       ├── app.js                    # Express app configuration
│       │
│       ├── config/
│       │   └── database.js           # MongoDB connection setup
│       │
│       ├── controllers/
│       │   ├── auth.controller.js    # Register, login, logout logic
│       │   └── interview.controller.js # Report generation & retrieval
│       │
│       ├── middlewares/
│       │   ├── auth.middleware.js    # JWT verification middleware
│       │   └── file.middleware.js    # Multer file upload handling
│       │
│       ├── models/
│       │   ├── user.model.js         # User schema
│       │   ├── interviewReport.model.js # AI-generated report schema
│       │   └── blacklist.model.js    # Invalidated JWT tokens
│       │
│       ├── routes/
│       │   ├── auth.routes.js        # /api/auth/* endpoints
│       │   └── interview.routes.js   # /api/interview/* endpoints
│       │
│       └── services/
│           └── ai.service.js         # Core AI analysis logic
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
            └── interview/            # Interview feature
                ├── interview.context.jsx     # Interview state provider
                ├── hooks/useInterview.js     # Interview hook
                ├── pages/            # Home & Interview pages
                └── services/interview.api.js # Interview API calls
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

### Interview Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/interview/` | Upload resume PDF (max 5MB) / self-description + JD → AI report | ✅ |
| `GET` | `/api/interview/` | Fetch all reports for authenticated user | ✅ |
| `GET` | `/api/interview/report/:interviewId` | Fetch a specific report by ID (owner only) | ✅ |
| `POST` | `/api/interview/resume/pdf/:interviewReportId` | Generate tailored resume PDF (owner only) | ✅ |

> **Note:** All protected endpoints accept authentication via HTTP-only cookie or `Authorization: Bearer <token>` header.

---

## 🔒 Authentication Flow

```
User Registers / Logs In
        ↓
Backend validates credentials
        ↓
JWT Token issued → set as HTTP-only cookie
        ↓
Protected routes verified via auth.middleware.js
        ↓
On logout → token added to blacklist.model.js (24h TTL)
```

---

## 🧠 AI Analysis Flow

```
User uploads Resume (PDF only, max 5MB) + Job Description
        ↓
file.middleware.js validates MIME & size; controller checks %PDF magic bytes & readable text
        ↓
interview.controller.js passes data to ai.service.js
        ↓
AI Service analyzes: skills match, gaps, questions, prep plan
        ↓
Structured report saved to interviewReport.model.js (associated with user)
        ↓
Report returned to frontend for display
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
