const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const jobController = require("../controllers/job.controller");

const jobRouter = express.Router();

/**
 * @route POST /api/jobs
 * @description Create a new Job with AI-extracted structured requirements
 * @access Private
 */
jobRouter.post("/", authMiddleware.authUser, jobController.createJobController);

/**
 * @route GET /api/jobs
 * @description Get all jobs for authenticated user
 * @access Private
 */
jobRouter.get("/", authMiddleware.authUser, jobController.getAllJobsController);

/**
 * @route GET /api/jobs/:id
 * @description Get specific job by ID
 * @access Private
 */
jobRouter.get("/:id", authMiddleware.authUser, jobController.getJobByIdController);

/**
 * @route PATCH /api/jobs/:id
 * @description Update job tracking status and details
 * @access Private
 */
jobRouter.patch("/:id", authMiddleware.authUser, jobController.updateJobController);

/**
 * @route DELETE /api/jobs/:id
 * @description Delete specific job by ID
 * @access Private
 */
jobRouter.delete("/:id", authMiddleware.authUser, jobController.deleteJobByIdController);

module.exports = jobRouter;
