const express = require("express")
const cookieParser = require("cookie-parser")
const cors = require("cors")
const { notFoundHandler, errorHandler } = require("./middlewares/error.middleware")

const app = express()

app.use(express.json())
app.use(cookieParser())

const getConfiguredOrigins = () => {
    const raw = [];
    if (process.env.FRONTEND_URL) {
        raw.push(process.env.FRONTEND_URL);
    }
    if (process.env.ALLOWED_ORIGINS) {
        raw.push(...process.env.ALLOWED_ORIGINS.split(","));
    }
    return raw.map(o => o.trim().replace(/\/+$/, "")).filter(Boolean);
};

const defaultDevOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
];

const isAllowedDevOrigin = (origin) => {
    const normalized = origin.replace(/\/+$/, "");
    if (defaultDevOrigins.includes(normalized)) return true;
    return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized);
};

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
        if (!origin) {
            return callback(null, true);
        }

        const normalizedOrigin = origin.replace(/\/+$/, "");
        const configured = getConfiguredOrigins();
        if (configured.includes(normalizedOrigin)) {
            return callback(null, true);
        }

        // In development/test environments, restrict local origins to known dev ports/loopback
        if (process.env.NODE_ENV !== "production" && isAllowedDevOrigin(normalizedOrigin)) {
            return callback(null, true);
        }

        // Reject arbitrary origins
        return callback(null, false);
    },
    credentials: true
}))

/* require all the routes here */
const authRouter = require("./routes/auth.routes")
const interviewRouter = require("./routes/interview.routes")
const resumeRouter = require("./routes/resume.routes")
const jobRouter = require("./routes/job.routes")
const careerRouter = require("./routes/career.routes")
const roadmapRouter = require("./routes/roadmap.routes")

/* using all the routes here */
app.use("/api/auth", authRouter)
app.use("/api/interview", interviewRouter)
app.use("/api/resumes", resumeRouter)
app.use("/api/jobs", jobRouter)
app.use("/api/career", careerRouter)
app.use("/api/roadmaps", roadmapRouter)

/* 404 and global error handlers */
app.use(notFoundHandler)
app.use(errorHandler)

module.exports = app