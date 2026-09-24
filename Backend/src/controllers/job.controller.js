const mongoose = require("mongoose");
const jobModel = require("../models/job.model");
const { extractStructuredJobRequirements } = require("../services/ai.service");
const { AppError } = require("../middlewares/error.middleware");

/**
 * @description Create a new reusable Job with structured requirements
 * @route POST /api/jobs
 * @access Private
 */
async function createJobController(req, res, next) {
    try {
        const { rawDescription, title: explicitTitle, company: explicitCompany } = req.body;

        if (!rawDescription || String(rawDescription).trim().length < 10) {
            return res.status(400).json({
                success: false,
                message: "A valid job description is required (minimum 10 characters)."
            });
        }

        const trimmedDescription = String(rawDescription).trim();

        // Extract structured requirements using Gemini
        const extracted = await extractStructuredJobRequirements({
            jobDescription: trimmedDescription
        });

        const finalTitle = explicitTitle && String(explicitTitle).trim().length > 0
            ? String(explicitTitle).trim()
            : extracted.title || "Target Role";

        const finalCompany = explicitCompany && String(explicitCompany).trim().length > 0
            ? String(explicitCompany).trim()
            : extracted.company || "Target Company";

        const job = await jobModel.create({
            user: req.user.id,
            title: finalTitle,
            company: finalCompany,
            rawDescription: trimmedDescription,
            structuredRequirements: extracted.structuredRequirements
        });

        return res.status(201).json({
            success: true,
            message: "Job created successfully with structured requirements.",
            job
        });

    } catch (error) {
        return next(error);
    }
}

/**
 * @description Get all jobs created by the authenticated user
 * @route GET /api/jobs
 * @access Private
 */
async function getAllJobsController(req, res, next) {
    try {
        const jobs = await jobModel
            .find({ user: req.user.id })
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: "Jobs fetched successfully.",
            jobs
        });

    } catch (error) {
        return next(error);
    }
}

/**
 * @description Get specific job by ID (owner check)
 * @route GET /api/jobs/:id
 * @access Private
 */
async function getJobByIdController(req, res, next) {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({
                success: false,
                message: "Job not found."
            });
        }

        const job = await jobModel.findOne({
            _id: id,
            user: req.user.id
        });

        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job not found."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Job fetched successfully.",
            job
        });

    } catch (error) {
        return next(error);
    }
}

/**
 * @description Delete specific job by ID (owner check)
 * @route DELETE /api/jobs/:id
 * @access Private
 */
async function deleteJobByIdController(req, res, next) {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({
                success: false,
                message: "Job not found."
            });
        }

        const deleted = await jobModel.findOneAndDelete({
            _id: id,
            user: req.user.id
        });

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: "Job not found."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Job deleted successfully."
        });

    } catch (error) {
        return next(error);
    }
}

/**
 * @description Update job tracking status and details (owner check)
 * @route PATCH /api/jobs/:id
 * @access Private
 */
async function updateJobController(req, res, next) {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({
                success: false,
                message: "Job not found."
            });
        }

        const job = await jobModel.findOne({
            _id: id,
            user: req.user.id
        });

        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job not found."
            });
        }

        const { status, applicationDate, notes, sourceUrl, targetRole, title, company } = req.body;

        if (status !== undefined) {
            const VALID_STATUSES = ["saved", "applied", "interviewing", "offer", "rejected", "archived"];
            if (!VALID_STATUSES.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid job status. Must be one of: ${VALID_STATUSES.join(", ")}`
                });
            }
            job.status = status;
        }

        if (applicationDate !== undefined) {
            job.applicationDate = applicationDate ? new Date(applicationDate) : null;
        }

        if (notes !== undefined) {
            job.notes = typeof notes === "string" ? notes.trim() : "";
        }

        if (sourceUrl !== undefined) {
            job.sourceUrl = typeof sourceUrl === "string" ? sourceUrl.trim() : "";
        }

        if (targetRole !== undefined) {
            job.targetRole = typeof targetRole === "string" ? targetRole.trim() : "";
        }

        if (title !== undefined && String(title).trim().length > 0) {
            job.title = String(title).trim();
        }

        if (company !== undefined && String(company).trim().length > 0) {
            job.company = String(company).trim();
        }

        await job.save();

        return res.status(200).json({
            success: true,
            message: "Job updated successfully.",
            job
        });

    } catch (error) {
        return next(error);
    }
}

module.exports = {
    createJobController,
    getAllJobsController,
    getJobByIdController,
    deleteJobByIdController,
    updateJobController
};
