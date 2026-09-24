/**
 * @file career.controller.js
 * @description Controller for CareerProfile, Career Dashboard, and Deterministic Gap endpoints in Rizzume Phase 3.
 */

const careerProfileModel = require("../models/careerProfile.model");
const jobModel = require("../models/job.model");
const learningRoadmapModel = require("../models/learningRoadmap.model");
const interviewReportModel = require("../models/interviewReport.model");
const { analyzeSkillGaps, evaluateCandidateSkillStatus } = require("../services/gap.service");

/**
 * @description Retrieve the authenticated user's 1:1 CareerProfile
 * @route GET /api/career/profile
 * @access Private
 */
async function getProfileController(req, res, next) {
    try {
        const userId = req.user.id;
        const profile = await careerProfileModel.findOne({ user: userId });

        if (!profile) {
            // Return empty/default representation rather than creating uncontrolled duplicates
            return res.status(200).json({
                success: true,
                profile: {
                    user: userId,
                    headline: "",
                    targetRole: "Full Stack Engineer",
                    targetRoles: [],
                    experienceLevel: null,
                    preferredDomains: [],
                    skills: [],
                    careerGoals: []
                }
            });
        }

        return res.status(200).json({
            success: true,
            profile
        });

    } catch (error) {
        return next(error);
    }
}

/**
 * @description Create or update the authenticated user's 1:1 CareerProfile
 * @route PUT /api/career/profile
 * @access Private
 */
async function updateProfileController(req, res, next) {
    try {
        const userId = req.user.id;
        const {
            headline,
            targetRole,
            targetRoles,
            experienceLevel,
            preferredDomains,
            skills,
            careerGoals
        } = req.body;

        const updateDoc = {};
        if (headline !== undefined) updateDoc.headline = String(headline).trim();
        if (targetRole !== undefined) updateDoc.targetRole = String(targetRole).trim();
        if (targetRoles !== undefined && Array.isArray(targetRoles)) updateDoc.targetRoles = targetRoles;
        if (experienceLevel !== undefined) updateDoc.experienceLevel = experienceLevel || undefined;
        if (preferredDomains !== undefined && Array.isArray(preferredDomains)) updateDoc.preferredDomains = preferredDomains;
        if (skills !== undefined && Array.isArray(skills)) updateDoc.skills = skills;
        if (careerGoals !== undefined && Array.isArray(careerGoals)) updateDoc.careerGoals = careerGoals;

        const profile = await careerProfileModel.findOneAndUpdate(
            { user: userId },
            { $set: updateDoc },
            { returnDocument: "after", upsert: true, runValidators: true }
        );

        return res.status(200).json({
            success: true,
            message: "Career profile updated successfully.",
            profile
        });

    } catch (error) {
        return next(error);
    }
}

/**
 * @description Retrieve deterministic dashboard intelligence metrics
 * @route GET /api/career/dashboard
 * @access Private
 */
async function getDashboardController(req, res, next) {
    try {
        const userId = req.user.id;

        // Parallel fetch of user's core entities
        const [profile, jobs, activeRoadmap, reports] = await Promise.all([
            careerProfileModel.findOne({ user: userId }),
            jobModel.find({ user: userId }),
            learningRoadmapModel.findOne({ user: userId, status: "active" }).sort({ createdAt: -1 }),
            interviewReportModel.find({
                user: userId,
                deterministicScore: { $exists: true, $ne: null }
            }).select("deterministicScore job createdAt")
        ]);

        const targetRole = profile?.targetRole || "Full Stack Engineer";
        const totalTrackedJobs = jobs.length;
        const activePipelineCount = jobs.filter(j => j.status === "applied" || j.status === "interviewing").length;

        // Demonstrated skills count (requires at least one grounded evidence item)
        const demonstratedSkillCount = (profile?.skills || []).filter(s => evaluateCandidateSkillStatus(s) === "demonstrated").length;

        // Deterministic gap analysis
        const gapAnalysis = analyzeSkillGaps({
            careerProfile: profile,
            jobs,
            targetRole
        });
        const criticalGapCount = gapAnalysis.gaps.filter(g => g.priority === "critical").length;

        // Roadmap progress
        const totalItems = activeRoadmap ? activeRoadmap.items.length : 0;
        const completedItems = activeRoadmap ? activeRoadmap.items.filter(i => i.status === "completed").length : 0;
        const percentComplete = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

        // Average match score calculation:
        // Use only valid deterministic scores; group by job taking newest evaluation
        const jobScoreMap = new Map();
        for (const report of reports) {
            if (typeof report.deterministicScore === "number" && !isNaN(report.deterministicScore)) {
                const key = report.job ? report.job.toString() : report._id.toString();
                if (!jobScoreMap.has(key) || new Date(report.createdAt) > new Date(jobScoreMap.get(key).createdAt)) {
                    jobScoreMap.set(key, { score: report.deterministicScore, createdAt: report.createdAt });
                }
            }
        }

        const evaluatedScores = Array.from(jobScoreMap.values()).map(v => v.score);
        const evaluatedJobCount = evaluatedScores.length;
        const averageMatchScore = evaluatedJobCount > 0
            ? Math.round(evaluatedScores.reduce((sum, s) => sum + s, 0) / evaluatedJobCount)
            : null;

        return res.status(200).json({
            success: true,
            dashboard: {
                targetRole,
                totalTrackedJobs,
                activePipelineCount,
                demonstratedSkillCount,
                criticalGapCount,
                roadmapProgress: {
                    totalItems,
                    completedItems,
                    percentComplete
                },
                averageMatchScore,
                evaluatedJobCount
            }
        });

    } catch (error) {
        return next(error);
    }
}

/**
 * @description Retrieve deterministic skill gap analysis for the authenticated user
 * @route GET /api/career/gaps
 * @access Private
 */
async function getGapsController(req, res, next) {
    try {
        const userId = req.user.id;

        const [profile, jobs] = await Promise.all([
            careerProfileModel.findOne({ user: userId }),
            jobModel.find({ user: userId })
        ]);

        const targetRole = profile?.targetRole || "Full Stack Engineer";
        const gapAnalysis = analyzeSkillGaps({
            careerProfile: profile,
            jobs,
            targetRole
        });

        return res.status(200).json({
            success: true,
            ...gapAnalysis
        });

    } catch (error) {
        return next(error);
    }
}

module.exports = {
    getProfileController,
    updateProfileController,
    getDashboardController,
    getGapsController
};
