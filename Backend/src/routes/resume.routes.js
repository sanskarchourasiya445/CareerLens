const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const upload = require("../middlewares/file.middleware");
const resumeController = require("../controllers/resume.controller");

const resumeRouter = express.Router();

/**
 * @route POST /api/resumes
 * @description Upload resume PDF and create a new reusable ResumeVersion
 * @access Private
 */
resumeRouter.post(
    "/",
    authMiddleware.authUser,
    upload.single("resume"),
    resumeController.createResumeVersionController
);

/**
 * @route GET /api/resumes
 * @description Get all resume versions owned by current user
 * @access Private
 */
resumeRouter.get("/", authMiddleware.authUser, resumeController.getAllResumeVersionsController);

/**
 * @route GET /api/resumes/:id
 * @description Get specific resume version by ID
 * @access Private
 */
resumeRouter.get("/:id", authMiddleware.authUser, resumeController.getResumeVersionByIdController);

/**
 * @route DELETE /api/resumes/:id
 * @description Delete specific resume version by ID
 * @access Private
 */
resumeRouter.delete("/:id", authMiddleware.authUser, resumeController.deleteResumeVersionByIdController);

module.exports = resumeRouter;
