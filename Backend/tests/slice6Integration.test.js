const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../src/app");
const { connectTestDB, clearTestDB, disconnectTestDB } = require("./setup");
const userModel = require("../src/models/user.model");
const jobModel = require("../src/models/job.model");
const careerProfileModel = require("../src/models/careerProfile.model");
const learningRoadmapModel = require("../src/models/learningRoadmap.model");
const interviewReportModel = require("../src/models/interviewReport.model");
const resumeVersionModel = require("../src/models/resumeVersion.model");
const { syncVerifiedEvidenceToCareerProfile } = require("../src/services/evidenceSync.service");

describe("Phase 3 Slice 6 — Full Integration, Security & Product QA Suite", () => {
    let userA;
    let userACookie;
    let userB;
    let userBCookie;
    let resumeA;
    let jobA;

    before(async () => {
        await connectTestDB();
    });

    after(async () => {
        await disconnectTestDB();
    });

    beforeEach(async () => {
        await clearTestDB();

        // Register User A
        const resA = await request(app)
            .post("/api/auth/register")
            .send({
                username: "alice_slice6",
                email: "alice_slice6@example.com",
                password: "Password123!"
            });
        userACookie = resA.headers["set-cookie"];
        userA = await userModel.findOne({ email: "alice_slice6@example.com" });

        // Register User B
        const resB = await request(app)
            .post("/api/auth/register")
            .send({
                username: "bob_slice6",
                email: "bob_slice6@example.com",
                password: "Password123!"
            });
        userBCookie = resB.headers["set-cookie"];
        userB = await userModel.findOne({ email: "bob_slice6@example.com" });

        // Base resume for User A
        resumeA = await resumeVersionModel.create({
            user: userA._id,
            title: "Alice Resume v1",
            originalFilename: "alice_resume.pdf",
            fileSize: 1024,
            mimeType: "application/pdf",
            extractedText: "Experienced software engineer with 5 years in React, TypeScript, and Docker containerization.",
            readableCharCount: 88,
            metadata: { wordCount: 14, versionNumber: 1 }
        });

        // Base target job for User A
        jobA = await jobModel.create({
            user: userA._id,
            title: "Senior Full Stack Engineer",
            company: "Acme Corp",
            status: "applied",
            rawDescription: "We need React, TypeScript, Docker, and PostgreSQL expertise.",
            structuredRequirements: [
                { requirement: "React", category: "required_skill", importance: "critical", weight: 4 },
                { requirement: "TypeScript", category: "required_skill", importance: "high", weight: 3 },
                { requirement: "Docker", category: "required_skill", importance: "medium", weight: 2 },
                { requirement: "PostgreSQL", category: "required_skill", importance: "critical", weight: 4 }
            ]
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Full Integration Flow
    // ─────────────────────────────────────────────────────────────────────────
    describe("1. Full Integration Pipeline: Resume -> Report -> Profile -> Gaps -> Roadmap -> Dashboard", () => {
        it("should execute the complete career intelligence lifecycle deterministically", async () => {
            // Step 1: Simulate grounded interview evaluation report
            const verifiedMatches = [
                {
                    requirement: "React",
                    status: "matched",
                    isGrounded: true,
                    evidence: "5 years in React",
                    evidenceQuote: "5 years in React",
                    explanation: "Candidate demonstrated 5 years in React",
                    importance: "critical"
                },
                {
                    requirement: "TypeScript",
                    status: "matched",
                    isGrounded: true,
                    evidence: "TypeScript, and Docker containerization",
                    evidenceQuote: "TypeScript, and Docker containerization",
                    explanation: "Candidate has experience with TypeScript",
                    importance: "high"
                },
                {
                    requirement: "PostgreSQL",
                    status: "missing",
                    isGrounded: false,
                    evidence: "No mention of PostgreSQL in resume",
                    evidenceQuote: "",
                    explanation: "Skill is absent from candidate documentation",
                    importance: "critical"
                }
            ];

            const report = await interviewReportModel.create({
                user: userA._id,
                resumeVersion: resumeA._id,
                job: jobA._id,
                title: jobA.title,
                jobDescription: jobA.rawDescription,
                resume: resumeA.extractedText,
                selfDescription: "",
                matchScore: 70,
                deterministicScore: 70,
                scoreBreakdown: {
                    totalPossibleWeight: 11,
                    totalEarnedWeight: 7,
                    rawPercentage: 63.6,
                    criticalPenaltyApplied: 0,
                    categories: {}
                },
                requirementMatches: verifiedMatches
            });

            assert.ok(report._id);

            // Step 2: Evidence syncs into CareerProfile
            const profile = await syncVerifiedEvidenceToCareerProfile({
                userId: userA._id,
                resumeVersionId: resumeA._id,
                verifiedMatches
            });

            assert.strictEqual(profile.skills.length, 2);
            const reactSkill = profile.skills.find(s => s.canonicalName === "React");
            assert.ok(reactSkill);
            assert.strictEqual(reactSkill.status, "demonstrated");
            assert.strictEqual(reactSkill.evidence.length, 1);
            assert.strictEqual(reactSkill.evidence[0].isGrounded, true);
            assert.strictEqual(reactSkill.evidence[0].verbatimQuote, "5 years in React");
            assert.strictEqual(reactSkill.evidence[0].sourceResumeVersion.toString(), resumeA._id.toString());

            // PostgreSQL was missing so it must NOT be in candidate skills
            const psqlSkill = profile.skills.find(s => s.canonicalName === "PostgreSQL");
            assert.strictEqual(psqlSkill, undefined);

            // Step 3: GET /api/career/gaps evaluates candidate profile against target job
            const gapsRes = await request(app)
                .get("/api/career/gaps")
                .set("Cookie", userACookie);

            assert.strictEqual(gapsRes.status, 200);
            assert.strictEqual(gapsRes.body.status, "analyzed");
            // React & TypeScript are matched
            assert.strictEqual(gapsRes.body.matchedSkills.length, 2);
            // PostgreSQL and Docker are gaps
            const gaps = gapsRes.body.gaps;
            assert.strictEqual(gaps.length, 2);
            const psqlGap = gaps.find(g => g.canonicalSkill === "PostgreSQL");
            assert.ok(psqlGap);
            assert.strictEqual(psqlGap.priority, "critical");
            assert.strictEqual(psqlGap.gapStatus, "missing");

            // Step 4: POST /api/roadmaps generates snapshot roadmap from deterministic gaps
            const roadmapRes = await request(app)
                .post("/api/roadmaps")
                .set("Cookie", userACookie)
                .send({ title: "Alice Q4 Plan" });

            assert.strictEqual(roadmapRes.status, 201);
            const roadmap = roadmapRes.body.roadmap;
            assert.ok(roadmap._id);
            assert.strictEqual(roadmap.items.length, 2);

            // Step 5: PATCH /api/roadmaps/:id/items/:itemId updates item status
            const itemId = roadmap.items[0]._id;
            const patchItemRes = await request(app)
                .patch(`/api/roadmaps/${roadmap._id}/items/${itemId}`)
                .set("Cookie", userACookie)
                .send({ status: "completed" });

            assert.strictEqual(patchItemRes.status, 200);
            assert.strictEqual(patchItemRes.body.item.status, "completed");
            assert.ok(patchItemRes.body.item.completedAt);
            assert.ok(patchItemRes.body.roadmap);

            // Step 6: GET /api/career/dashboard reflects entire consolidated state
            const dashRes = await request(app)
                .get("/api/career/dashboard")
                .set("Cookie", userACookie);

            assert.strictEqual(dashRes.status, 200);
            const d = dashRes.body.dashboard;
            assert.strictEqual(d.totalTrackedJobs, 1);
            assert.strictEqual(d.activePipelineCount, 1); // jobA status is "applied"
            assert.strictEqual(d.demonstratedSkillCount, 2); // React & TypeScript
            assert.strictEqual(d.criticalGapCount, 1); // PostgreSQL
            assert.strictEqual(d.roadmapProgress.totalItems, 2);
            assert.strictEqual(d.roadmapProgress.completedItems, 1);
            assert.strictEqual(d.roadmapProgress.percentComplete, 50);
            assert.strictEqual(d.averageMatchScore, 70);
            assert.strictEqual(d.evaluatedJobCount, 1);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Strict User Scoping & IDOR Security Audit
    // ─────────────────────────────────────────────────────────────────────────
    describe("2. Security Audit & IDOR Protection Across All Entities", () => {
        it("should prevent User B from reading, updating, or deleting User A's Job", async () => {
            // GET
            const getRes = await request(app)
                .get(`/api/jobs/${jobA._id}`)
                .set("Cookie", userBCookie);
            assert.strictEqual(getRes.status, 404);
            assert.strictEqual(getRes.body.message, "Job not found.");

            // PATCH
            const patchRes = await request(app)
                .patch(`/api/jobs/${jobA._id}`)
                .set("Cookie", userBCookie)
                .send({ status: "offer" });
            assert.strictEqual(patchRes.status, 404);
            assert.strictEqual(patchRes.body.message, "Job not found.");

            // DELETE
            const deleteRes = await request(app)
                .delete(`/api/jobs/${jobA._id}`)
                .set("Cookie", userBCookie);
            assert.strictEqual(deleteRes.status, 404);
            assert.strictEqual(deleteRes.body.message, "Job not found.");

            // Verify unchanged in DB
            const verifyJob = await jobModel.findById(jobA._id);
            assert.strictEqual(verifyJob.status, "applied");
        });

        it("should prevent User B from reading or mutating User A's Roadmap", async () => {
            const roadmapA = await learningRoadmapModel.create({
                user: userA._id,
                title: "Secret Roadmap",
                targetRole: "Full Stack Engineer",
                items: [{
                    canonicalSkill: "Docker",
                    displayName: "Docker",
                    priority: "high",
                    gapStatus: "missing",
                    gapScore: 3.0,
                    jobFrequency: 1,
                    reason: "Required skill",
                    targetOutcome: "Master Docker",
                    status: "not_started"
                }]
            });

            // GET
            const getRes = await request(app)
                .get(`/api/roadmaps/${roadmapA._id}`)
                .set("Cookie", userBCookie);
            assert.strictEqual(getRes.status, 404);
            assert.strictEqual(getRes.body.message, "Roadmap not found.");

            // PATCH item
            const itemId = roadmapA.items[0]._id;
            const patchRes = await request(app)
                .patch(`/api/roadmaps/${roadmapA._id}/items/${itemId}`)
                .set("Cookie", userBCookie)
                .send({ status: "completed" });
            assert.strictEqual(patchRes.status, 404);
            assert.strictEqual(patchRes.body.message, "Roadmap not found.");

            // Verify unchanged in DB
            const verifyRoadmap = await learningRoadmapModel.findById(roadmapA._id);
            assert.strictEqual(verifyRoadmap.items[0].status, "not_started");
        });

        it("should prevent User B from reading User A's InterviewReport or generating PDF", async () => {
            const reportA = await interviewReportModel.create({
                user: userA._id,
                title: "Secret Interview Report",
                jobDescription: "Confidential JD",
                resume: "Confidential resume text",
                matchScore: 85
            });

            // GET
            const getRes = await request(app)
                .get(`/api/interview/report/${reportA._id}`)
                .set("Cookie", userBCookie);
            assert.strictEqual(getRes.status, 404);
            assert.strictEqual(getRes.body.message, "Interview report not found.");

            // PDF
            const pdfRes = await request(app)
                .post(`/api/interview/resume/pdf/${reportA._id}`)
                .set("Cookie", userBCookie);
            assert.strictEqual(pdfRes.status, 404);
            assert.strictEqual(pdfRes.body.message, "Interview report not found.");
        });

        it("should prevent User B from reading or deleting User A's ResumeVersion", async () => {
            // GET
            const getRes = await request(app)
                .get(`/api/resumes/${resumeA._id}`)
                .set("Cookie", userBCookie);
            assert.strictEqual(getRes.status, 404);
            assert.strictEqual(getRes.body.message, "Resume version not found.");

            // DELETE
            const delRes = await request(app)
                .delete(`/api/resumes/${resumeA._id}`)
                .set("Cookie", userBCookie);
            assert.strictEqual(delRes.status, 404);
            assert.strictEqual(delRes.body.message, "Resume version not found.");

            // Verify still exists in DB
            const verifyResume = await resumeVersionModel.findById(resumeA._id);
            assert.ok(verifyResume);
        });

        it("should strictly isolate CareerProfile between users", async () => {
            // User A updates profile
            await request(app)
                .put("/api/career/profile")
                .set("Cookie", userACookie)
                .send({
                    targetRole: "Staff AI Engineer",
                    headline: "Alice Staff Profile"
                });

            // User B reads profile -> gets own empty default, not Alice's
            const resB = await request(app)
                .get("/api/career/profile")
                .set("Cookie", userBCookie);

            assert.strictEqual(resB.status, 200);
            assert.strictEqual(resB.body.profile.targetRole, "Full Stack Engineer");
            assert.strictEqual(resB.body.profile.headline, "");
            assert.strictEqual(resB.body.profile.user.toString(), userB._id.toString());
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Boundary & Error Envelope QA
    // ─────────────────────────────────────────────────────────────────────────
    describe("3. Boundary Cases & Error Envelope Handling", () => {
        it("should return clean 404 on malformed ObjectIds across all endpoints", async () => {
            const badId = "not-a-valid-id";

            const resJob = await request(app).get(`/api/jobs/${badId}`).set("Cookie", userACookie);
            assert.strictEqual(resJob.status, 404);
            assert.strictEqual(resJob.body.success, false);

            const resRoadmap = await request(app).get(`/api/roadmaps/${badId}`).set("Cookie", userACookie);
            assert.strictEqual(resRoadmap.status, 404);
            assert.strictEqual(resRoadmap.body.success, false);

            const resResume = await request(app).get(`/api/resumes/${badId}`).set("Cookie", userACookie);
            assert.strictEqual(resResume.status, 404);
            assert.strictEqual(resResume.body.success, false);

            const resInterview = await request(app).get(`/api/interview/report/${badId}`).set("Cookie", userACookie);
            assert.strictEqual(resInterview.status, 404);
            assert.strictEqual(resInterview.body.success, false);
        });

        it("should reject unauthenticated requests with 401 across Phase 3 endpoints", async () => {
            const res1 = await request(app).get("/api/career/profile");
            assert.strictEqual(res1.status, 401);

            const res2 = await request(app).get("/api/career/dashboard");
            assert.strictEqual(res2.status, 401);

            const res3 = await request(app).get("/api/career/gaps");
            assert.strictEqual(res3.status, 401);

            const res4 = await request(app).get("/api/jobs");
            assert.strictEqual(res4.status, 401);

            const res5 = await request(app).get("/api/roadmaps");
            assert.strictEqual(res5.status, 401);
        });

        it("should enforce canonical status enum for Jobs (reject non-canonical status)", async () => {
            const res = await request(app)
                .patch(`/api/jobs/${jobA._id}`)
                .set("Cookie", userACookie)
                .send({ status: "pending" }); // non-canonical

            assert.strictEqual(res.status, 400);
            assert.strictEqual(res.body.success, false);
            assert.ok(res.body.message.includes("Invalid job status"));
        });

        it("should reject tampering with deterministic fields in roadmap item patch", async () => {
            const roadmap = await learningRoadmapModel.create({
                user: userA._id,
                title: "Test Roadmap",
                targetRole: "Full Stack Engineer",
                items: [{
                    canonicalSkill: "Docker",
                    displayName: "Docker",
                    priority: "high",
                    gapStatus: "missing",
                    gapScore: 3.0,
                    jobFrequency: 1,
                    reason: "Required skill",
                    targetOutcome: "Master Docker",
                    status: "not_started"
                }]
            });

            const itemId = roadmap.items[0]._id;

            const res = await request(app)
                .patch(`/api/roadmaps/${roadmap._id}/items/${itemId}`)
                .set("Cookie", userACookie)
                .send({ canonicalSkill: "Kubernetes", priority: "low" });

            assert.strictEqual(res.status, 400);
            assert.strictEqual(res.body.success, false);
            assert.ok(res.body.message.includes("Modification of deterministic metadata"));
        });

        it("should handle zero jobs in dashboard by reporting 0 counts and null averageMatchScore", async () => {
            // User B has 0 jobs and 0 reports
            const res = await request(app)
                .get("/api/career/dashboard")
                .set("Cookie", userBCookie);

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.dashboard.totalTrackedJobs, 0);
            assert.strictEqual(res.body.dashboard.activePipelineCount, 0);
            assert.strictEqual(res.body.dashboard.demonstratedSkillCount, 0);
            assert.strictEqual(res.body.dashboard.criticalGapCount, 0);
            assert.strictEqual(res.body.dashboard.roadmapProgress.totalItems, 0);
            assert.strictEqual(res.body.dashboard.averageMatchScore, null);
            assert.strictEqual(res.body.dashboard.evaluatedJobCount, 0);
        });
    });
});
