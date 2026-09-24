/**
 * @file roadmap.controller.js
 * @description Controller for LearningRoadmap endpoints in Rizzume Phase 3.
 */

const mongoose = require("mongoose");
const careerProfileModel = require("../models/careerProfile.model");
const jobModel = require("../models/job.model");
const learningRoadmapModel = require("../models/learningRoadmap.model");
const { generateLearningRoadmap } = require("../services/roadmap.service");

/**
 * @description Create a new persistent LearningRoadmap snapshot for the authenticated user
 * @route POST /api/roadmaps
 * @access Private
 */
async function createRoadmapController(req, res, next) {
    try {
        const userId = req.user.id;
        const { targetRole, title } = req.body;

        const [careerProfile, jobs] = await Promise.all([
            careerProfileModel.findOne({ user: userId }),
            jobModel.find({ user: userId })
        ]);

        const result = await generateLearningRoadmap({
            userId,
            careerProfile,
            jobs,
            targetRole,
            title,
            persist: true
        });

        if (result.status === "insufficient_data") {
            return res.status(400).json({
                success: false,
                message: result.message
            });
        }

        return res.status(201).json({
            success: true,
            message: "Roadmap generated successfully.",
            roadmap: result.roadmap
        });

    } catch (error) {
        return next(error);
    }
}

/**
 * @description Retrieve all roadmaps belonging to the authenticated user
 * @route GET /api/roadmaps
 * @access Private
 */
async function getAllRoadmapsController(req, res, next) {
    try {
        const userId = req.user.id;
        const roadmaps = await learningRoadmapModel
            .find({ user: userId })
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            roadmaps
        });

    } catch (error) {
        return next(error);
    }
}

/**
 * @description Retrieve specific roadmap by ID (owner check)
 * @route GET /api/roadmaps/:id
 * @access Private
 */
async function getRoadmapByIdController(req, res, next) {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({
                success: false,
                message: "Roadmap not found."
            });
        }

        const roadmap = await learningRoadmapModel.findOne({
            _id: id,
            user: userId
        });

        if (!roadmap) {
            return res.status(404).json({
                success: false,
                message: "Roadmap not found."
            });
        }

        return res.status(200).json({
            success: true,
            roadmap
        });

    } catch (error) {
        return next(error);
    }
}

/**
 * @description Update status or hours of a specific roadmap item (owner check)
 * Strictly preserves deterministic metadata (canonicalSkill, priority, gapScore, reason, etc.)
 * @route PATCH /api/roadmaps/:id/items/:itemId
 * @access Private
 */
async function updateRoadmapItemController(req, res, next) {
    try {
        const { id, itemId } = req.params;
        const userId = req.user.id;

        if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(itemId)) {
            return res.status(404).json({
                success: false,
                message: "Roadmap or item not found."
            });
        }

        const roadmap = await learningRoadmapModel.findOne({
            _id: id,
            user: userId
        });

        if (!roadmap) {
            return res.status(404).json({
                success: false,
                message: "Roadmap not found."
            });
        }

        const item = roadmap.items.id(itemId);
        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Roadmap item not found."
            });
        }

        // Strict deterministic protection: reject any modification of deterministic fields
        const FORBIDDEN_FIELDS = [
            "canonicalSkill",
            "displayName",
            "category",
            "priority",
            "gapStatus",
            "gapScore",
            "jobFrequency",
            "reason"
        ];

        for (const field of FORBIDDEN_FIELDS) {
            if (req.body[field] !== undefined && req.body[field] !== item[field]) {
                return res.status(400).json({
                    success: false,
                    message: `Modification of deterministic metadata '${field}' is not allowed.`
                });
            }
        }

        const { status, estimatedHours } = req.body;

        if (status !== undefined) {
            const VALID_STATUSES = ["not_started", "in_progress", "completed", "skipped"];
            if (!VALID_STATUSES.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid status value. Must be one of: ${VALID_STATUSES.join(", ")}`
                });
            }

            item.status = status;
            if (status === "completed") {
                item.completedAt = new Date();
            } else {
                item.completedAt = undefined;
            }
        }

        if (estimatedHours !== undefined) {
            const numHours = Number(estimatedHours);
            if (isNaN(numHours) || numHours < 1) {
                return res.status(400).json({
                    success: false,
                    message: "estimatedHours must be a positive integer greater than or equal to 1."
                });
            }
            item.estimatedHours = numHours;
        }

        await roadmap.save();

        return res.status(200).json({
            success: true,
            message: "Roadmap item updated successfully.",
            item,
            roadmap
        });

    } catch (error) {
        return next(error);
    }
}

module.exports = {
    createRoadmapController,
    getAllRoadmapsController,
    getRoadmapByIdController,
    updateRoadmapItemController
};
