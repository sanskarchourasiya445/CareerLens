const express = require("express")
const cookieParser = require("cookie-parser")
const cors = require("cors")
const { notFoundHandler, errorHandler } = require("./middlewares/error.middleware")

const app = express()

app.use(express.json())
app.use(cookieParser())

const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
    process.env.FRONTEND_URL
].filter(Boolean)

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true)
        }
        return callback(null, true) // permissive for local development
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