/**
 * @file roadmap.routes.js
 * @description Routes for LearningRoadmap endpoints in Rizzume Phase 3.
 */

const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const roadmapController = require("../controllers/roadmap.controller");

const roadmapRouter = express.Router();

/**
 * @route POST /api/roadmaps
 * @description Generate and persist a new LearningRoadmap snapshot
 * @access Private
 */
roadmapRouter.post("/", authMiddleware.authUser, roadmapController.createRoadmapController);

/**
 * @route GET /api/roadmaps
 * @description Retrieve all learning roadmaps for the authenticated user
 * @access Private
 */
roadmapRouter.get("/", authMiddleware.authUser, roadmapController.getAllRoadmapsController);

/**
 * @route GET /api/roadmaps/:id
 * @description Retrieve specific learning roadmap by ID (owner checked)
 * @access Private
 */
roadmapRouter.get("/:id", authMiddleware.authUser, roadmapController.getRoadmapByIdController);

/**
 * @route PATCH /api/roadmaps/:id/items/:itemId
 * @description Update progress status or hours of a specific roadmap item
 * @access Private
 */
roadmapRouter.patch("/:id/items/:itemId", authMiddleware.authUser, roadmapController.updateRoadmapItemController);

module.exports = roadmapRouter;
