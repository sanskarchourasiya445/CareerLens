import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Phase 3 Slice 5 — Frontend Contracts & Logic Suite", () => {
    const appRoutesPath = path.resolve(__dirname, "../src/app.routes.jsx");
    const appRoutesContent = fs.readFileSync(appRoutesPath, "utf-8");

    describe("1. Route Architecture & Preserved Flows", () => {
        it("should define all required Career Intelligence and Auth routes", () => {
            const requiredRoutes = [
                "/login",
                "/register",
                "/",
                "/jobs",
                "/gaps",
                "/roadmap",
                "/interview",
                "/interview/:interviewId"
            ];

            for (const route of requiredRoutes) {
                const regex = new RegExp(`path:\\s*["']${route.replace(":", "\\:")}["']`);
                assert.ok(
                    regex.test(appRoutesContent),
                    `Route '${route}' must be registered in app.routes.jsx`
                );
            }
        });

        it("should protect workspace routes with Protected component", () => {
            assert.ok(appRoutesContent.includes("<Protected><Dashboard /></Protected>"));
            assert.ok(appRoutesContent.includes("<Protected><JobTracker /></Protected>"));
            assert.ok(appRoutesContent.includes("<Protected><GapAnalysis /></Protected>"));
            assert.ok(appRoutesContent.includes("<Protected><LearningRoadmap /></Protected>"));
            assert.ok(appRoutesContent.includes("<Protected><Home /></Protected>"));
            assert.ok(appRoutesContent.includes("<Protected><Interview /></Protected>"));
        });
    });

    describe("2. Canonical Job Status Contract", () => {
        const jobTrackerPath = path.resolve(__dirname, "../src/features/career/pages/JobTracker.jsx");
        const jobTrackerContent = fs.readFileSync(jobTrackerPath, "utf-8");

        it("should define exactly the canonical job status enum in Job Tracker", () => {
            const canonicalExpected = ["saved", "applied", "interviewing", "offer", "rejected", "archived"];
            for (const status of canonicalExpected) {
                assert.ok(
                    jobTrackerContent.includes(`value: "${status}"`),
                    `JobTracker must include canonical status '${status}'`
                );
            }
        });

        it("must strictly reject non-canonical 'offered' status", () => {
            assert.ok(
                !jobTrackerContent.includes('value: "offered"'),
                "JobTracker must NEVER use 'offered' — only canonical 'offer'"
            );
        });
    });

    describe("3. Dashboard Null Match Score Logic", () => {
        const dashboardPath = path.resolve(__dirname, "../src/features/career/pages/Dashboard.jsx");
        const dashboardContent = fs.readFileSync(dashboardPath, "utf-8");

        it("should explicitly handle averageMatchScore === null and evaluatedJobCount === 0 without showing 0%", () => {
            assert.ok(
                dashboardContent.includes("d.averageMatchScore === null || d.evaluatedJobCount === 0"),
                "Dashboard must check for null averageMatchScore or 0 evaluated jobs"
            );
            assert.ok(
                dashboardContent.includes("No evaluated-job data yet"),
                "Dashboard must explain that there is no evaluated-job data yet"
            );
        });

        it("should format match score with evaluated job count denominator when score is present", () => {
            assert.ok(
                dashboardContent.includes("Average match: {d.averageMatchScore}% across {d.evaluatedJobCount} evaluated job"),
                "Dashboard must display the exact evaluated denominator"
            );
        });
    });

    describe("4. Gap Analysis Insufficient Data & Priority Handling", () => {
        const gapAnalysisPath = path.resolve(__dirname, "../src/features/career/pages/GapAnalysis.jsx");
        const gapAnalysisContent = fs.readFileSync(gapAnalysisPath, "utf-8");

        it("should handle status === 'insufficient_data' with explanation to track jobs", () => {
            assert.ok(
                gapAnalysisContent.includes('gapData.status === "insufficient_data"'),
                "GapAnalysis must check for status === 'insufficient_data'"
            );
            assert.ok(
                gapAnalysisContent.includes("Track a few target jobs to generate your career gap analysis"),
                "GapAnalysis must present the approved insufficient data explanation"
            );
        });

        it("should support filtering across Critical, High, Medium, Low, and Matched priorities", () => {
            assert.ok(gapAnalysisContent.includes('filterPriority === "critical"'));
            assert.ok(gapAnalysisContent.includes('filterPriority === "high"'));
            assert.ok(gapAnalysisContent.includes('filterPriority === "medium"'));
            assert.ok(gapAnalysisContent.includes('filterPriority === "low"'));
            assert.ok(gapAnalysisContent.includes('filterPriority === "matched"'));
        });
    });

    describe("5. Learning Roadmap Lifecycle & Deterministic Immutability", () => {
        const roadmapPath = path.resolve(__dirname, "../src/features/career/pages/LearningRoadmap.jsx");
        const roadmapContent = fs.readFileSync(roadmapPath, "utf-8");

        it("should support the 4 approved milestone progress statuses", () => {
            const expectedStatuses = ["not_started", "in_progress", "completed", "skipped"];
            for (const status of expectedStatuses) {
                assert.ok(
                    roadmapContent.includes(`value: "${status}"`),
                    `Roadmap must support item status '${status}'`
                );
            }
        });

        it("should present deterministic metadata (reason, gapStatus, priority) as read-only text", () => {
            assert.ok(
                roadmapContent.includes("{item.reason}"),
                "Deterministic reason must be displayed as text"
            );
            assert.ok(
                !roadmapContent.includes('name="canonicalSkill"'),
                "Deterministic canonicalSkill must NOT be an editable form input"
            );
            assert.ok(
                !roadmapContent.includes('name="gapScore"'),
                "Deterministic gapScore must NOT be an editable form input"
            );
        });

        it("must strictly use 'skipped' for item status and reject 'archived' on items", () => {
            assert.ok(roadmapContent.includes('value: "skipped"'), "Roadmap item status must include 'skipped'");
            assert.ok(!roadmapContent.includes('value: "archived"'), "Roadmap item status must NOT include 'archived'");
        });
    });

    describe("6. API Service Architecture", () => {
        const careerApiPath = path.resolve(__dirname, "../src/services/careerApi.js");
        const jobsApiPath = path.resolve(__dirname, "../src/services/jobsApi.js");
        const roadmapApiPath = path.resolve(__dirname, "../src/services/roadmapApi.js");

        it("should provide clean careerApi methods", () => {
            const content = fs.readFileSync(careerApiPath, "utf-8");
            assert.ok(content.includes("export async function getDashboard"));
            assert.ok(content.includes("export async function getGaps"));
            assert.ok(content.includes("export async function getProfile"));
            assert.ok(content.includes("export async function updateProfile"));
        });

        it("should provide clean jobsApi methods", () => {
            const content = fs.readFileSync(jobsApiPath, "utf-8");
            assert.ok(content.includes("export async function getJobs"));
            assert.ok(content.includes("export async function createJob"));
            assert.ok(content.includes("export async function updateJob"));
            assert.ok(content.includes("export async function deleteJob"));
        });

        it("should provide clean roadmapApi methods", () => {
            const content = fs.readFileSync(roadmapApiPath, "utf-8");
            assert.ok(content.includes("export async function getRoadmaps"));
            assert.ok(content.includes("export async function getRoadmapById"));
            assert.ok(content.includes("export async function createRoadmap"));
            assert.ok(content.includes("export async function updateRoadmapItem"));
        });
    });
});
