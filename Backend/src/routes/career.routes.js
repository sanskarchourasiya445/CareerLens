/**
 * @file career.routes.js
 * @description Routes for CareerProfile, Career Dashboard, and Gap Analysis in Rizzume Phase 3.
 */

const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const careerController = require("../controllers/career.controller");

const careerRouter = express.Router();

/**
 * @route GET /api/career/profile
 * @description Retrieve authenticated user's CareerProfile
 * @access Private
 */
careerRouter.get("/profile", authMiddleware.authUser, careerController.getProfileController);

/**
 * @route PUT /api/career/profile
 * @description Create or update authenticated user's CareerProfile
 * @access Private
 */
careerRouter.put("/profile", authMiddleware.authUser, careerController.updateProfileController);

/**
 * @route GET /api/career/dashboard
 * @description Retrieve deterministic dashboard intelligence metrics
 * @access Private
 */
careerRouter.get("/dashboard", authMiddleware.authUser, careerController.getDashboardController);

/**
 * @route GET /api/career/gaps
 * @description Retrieve deterministic skill gap analysis report
 * @access Private
 */
careerRouter.get("/gaps", authMiddleware.authUser, careerController.getGapsController);

module.exports = careerRouter;
