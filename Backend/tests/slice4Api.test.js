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

describe("Phase 3 Slice 4 — REST API Endpoints & State Management Suite", () => {
    let userA;
    let userACookie;
    let userB;
    let userBCookie;
    let resumeA;

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
                username: "usera_slice4",
                email: "usera_slice4@example.com",
                password: "Password123!"
            });
        userACookie = resA.headers["set-cookie"];
        userA = await userModel.findOne({ email: "usera_slice4@example.com" });

        // Register User B
        const resB = await request(app)
            .post("/api/auth/register")
            .send({
                username: "userb_slice4",
                email: "userb_slice4@example.com",
                password: "Password123!"
            });
        userBCookie = resB.headers["set-cookie"];
        userB = await userModel.findOne({ email: "userb_slice4@example.com" });

        // Resume for User A
        resumeA = await resumeVersionModel.create({
            user: userA._id,
            title: "User A Resume",
            originalFilename: "resume_a.pdf",
            fileSize: 1024,
            extractedText: "Experienced React and Node.js developer with 4 years building APIs.",
            readableCharCount: 65
        });
    });

    describe("1. Career Profile API (/api/career/profile)", () => {
        it("should return empty default profile representation when user has no profile yet", async () => {
            const res = await request(app)
                .get("/api/career/profile")
                .set("Cookie", userACookie);

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.strictEqual(res.body.profile.targetRole, "Full Stack Engineer");
            assert.strictEqual(res.body.profile.experienceLevel, null);
            assert.deepStrictEqual(res.body.profile.skills, []);
        });

        it("should create/update profile and retrieve it for authenticated user", async () => {
            const putRes = await request(app)
                .put("/api/career/profile")
                .set("Cookie", userACookie)
                .send({
                    headline: "Staff Cloud Architect",
                    targetRole: "Cloud Platform Architect",
                    experienceLevel: "lead",
                    preferredDomains: ["Cloud Infrastructure", "FinTech"],
                    skills: [
                        {
                            canonicalName: "React",
                            displayName: "React.js",
                            category: "framework",
                            status: "demonstrated",
                            evidence: [{
                                verbatimQuote: "Experienced React developer",
                                sourceResumeVersion: resumeA._id,
                                isGrounded: true
                            }]
                        }
                    ],
                    careerGoals: ["Architect multi-region systems"]
                });

            assert.strictEqual(putRes.status, 200);
            assert.strictEqual(putRes.body.success, true);
            assert.strictEqual(putRes.body.profile.headline, "Staff Cloud Architect");
            assert.strictEqual(putRes.body.profile.targetRole, "Cloud Platform Architect");
            assert.strictEqual(putRes.body.profile.experienceLevel, "lead");
            assert.strictEqual(putRes.body.profile.skills.length, 1);

            // Fetch profile
            const getRes = await request(app)
                .get("/api/career/profile")
                .set("Cookie", userACookie);

            assert.strictEqual(getRes.status, 200);
            assert.strictEqual(getRes.body.profile.targetRole, "Cloud Platform Architect");
            assert.strictEqual(getRes.body.profile.skills[0].canonicalName, "React");
        });

        it("should isolate profiles across users (User B cannot see or overwrite User A profile)", async () => {
            await careerProfileModel.create({
                user: userA._id,
                headline: "User A Headline",
                targetRole: "Architect A"
            });

            const userBGet = await request(app)
                .get("/api/career/profile")
                .set("Cookie", userBCookie);

            assert.strictEqual(userBGet.status, 200);
            assert.notStrictEqual(userBGet.body.profile.headline, "User A Headline");
            assert.strictEqual(userBGet.body.profile.targetRole, "Full Stack Engineer"); // Default representation
        });

        it("should reject unauthenticated requests with 401", async () => {
            const res = await request(app).get("/api/career/profile");
            assert.strictEqual(res.status, 401);
            assert.strictEqual(res.body.success, false);
        });
    });

    describe("2. Job Tracking API (PATCH /api/jobs/:id)", () => {
        it("should update job tracking status, dates, notes, and metadata", async () => {
            const job = await jobModel.create({
                user: userA._id,
                title: "Software Engineer",
                company: "Startup Co",
                rawDescription: "Node.js and MongoDB backend engineer role.",
                structuredRequirements: [{ requirement: "Node.js", category: "required_skill", importance: "high", weight: 3 }]
            });

            const patchRes = await request(app)
                .patch(`/api/jobs/${job._id}`)
                .set("Cookie", userACookie)
                .send({
                    status: "applied",
                    applicationDate: "2026-03-20T10:00:00Z",
                    notes: "Applied through referral.",
                    sourceUrl: "https://startup.com/careers/123",
                    targetRole: "Senior Backend Engineer"
                });

            assert.strictEqual(patchRes.status, 200);
            assert.strictEqual(patchRes.body.success, true);
            assert.strictEqual(patchRes.body.job.status, "applied");
            assert.strictEqual(patchRes.body.job.notes, "Applied through referral.");
            assert.strictEqual(patchRes.body.job.sourceUrl, "https://startup.com/careers/123");
            assert.strictEqual(patchRes.body.job.targetRole, "Senior Backend Engineer");
        });

        it("should accept all canonical job statuses (saved, applied, interviewing, offer, rejected, archived)", async () => {
            const job = await jobModel.create({
                user: userA._id,
                title: "Engineer",
                company: "Co",
                rawDescription: "Job description for testing.",
                structuredRequirements: []
            });

            const canonicalStatuses = ["saved", "applied", "interviewing", "offer", "rejected", "archived"];
            for (const status of canonicalStatuses) {
                const res = await request(app)
                    .patch(`/api/jobs/${job._id}`)
                    .set("Cookie", userACookie)
                    .send({ status });

                assert.strictEqual(res.status, 200);
                assert.strictEqual(res.body.success, true);
                assert.strictEqual(res.body.job.status, status);
            }
        });

        it("should reject invalid job status with 400 (specifically non-canonical 'offered')", async () => {
            const job = await jobModel.create({
                user: userA._id,
                title: "Engineer",
                company: "Co",
                rawDescription: "Job description for testing.",
                structuredRequirements: []
            });

            // Test non-canonical 'offered' (canonical is 'offer')
            const resOffered = await request(app)
                .patch(`/api/jobs/${job._id}`)
                .set("Cookie", userACookie)
                .send({ status: "offered" });

            assert.strictEqual(resOffered.status, 400);
            assert.strictEqual(resOffered.body.success, false);
            assert.ok(resOffered.body.message.includes("Must be one of: saved, applied, interviewing, offer, rejected, archived"));

            // Test completely invalid status
            const resInvalid = await request(app)
                .patch(`/api/jobs/${job._id}`)
                .set("Cookie", userACookie)
                .send({ status: "invalid_status_value" });

            assert.strictEqual(resInvalid.status, 400);
            assert.strictEqual(resInvalid.body.success, false);
        });

        it("should prevent IDOR: return 404 when User B attempts to PATCH User A's job", async () => {
            const jobA = await jobModel.create({
                user: userA._id,
                title: "User A Secret Role",
                company: "Company A",
                rawDescription: "Confidential JD content.",
                structuredRequirements: []
            });

            const res = await request(app)
                .patch(`/api/jobs/${jobA._id}`)
                .set("Cookie", userBCookie)
                .send({ status: "archived" });

            assert.strictEqual(res.status, 404);
            assert.strictEqual(res.body.message, "Job not found.");

            // Verify unchanged in DB
            const unchanged = await jobModel.findById(jobA._id);
            assert.strictEqual(unchanged.status, "saved");
        });
    });

    describe("3. Career Gaps API (GET /api/career/gaps)", () => {
        it("should return insufficient_data when user has 0 jobs", async () => {
            const res = await request(app)
                .get("/api/career/gaps")
                .set("Cookie", userACookie);

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.status, "insufficient_data");
            assert.deepStrictEqual(res.body.gaps, []);
        });

        it("should return deterministic gap analysis output comparing profile against user jobs", async () => {
            await careerProfileModel.create({
                user: userA._id,
                targetRole: "Full Stack Engineer",
                skills: [
                    {
                        canonicalName: "React",
                        displayName: "React",
                        status: "demonstrated",
                        evidence: [{ verbatimQuote: "Experienced React developer", sourceResumeVersion: resumeA._id, isGrounded: true }]
                    }
                ]
            });

            await jobModel.create({
                user: userA._id,
                title: "Full Stack Engineer",
                company: "Tech Corp",
                rawDescription: "React and Docker experience required.",
                structuredRequirements: [
                    { requirement: "React", category: "required_skill", importance: "critical", weight: 4 },
                    { requirement: "Docker", category: "required_skill", importance: "high", weight: 3 }
                ]
            });

            const res = await request(app)
                .get("/api/career/gaps")
                .set("Cookie", userACookie);

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.status, "analyzed");
            // React is demonstrated -> in matchedSkills, excluded from gaps
            assert.strictEqual(res.body.matchedSkills.length, 1);
            assert.strictEqual(res.body.matchedSkills[0].canonicalSkill, "React");

            // Docker is missing -> in gaps
            assert.strictEqual(res.body.gaps.length, 1);
            assert.strictEqual(res.body.gaps[0].canonicalSkill, "Docker");
            assert.strictEqual(res.body.gaps[0].gapStatus, "missing");
            assert.strictEqual(res.body.gaps[0].priority, "high");
        });

        it("should isolate gaps across users (User B does not see User A's gaps)", async () => {
            // User A has jobs and gaps
            await jobModel.create({
                user: userA._id,
                title: "Job A",
                company: "Co A",
                rawDescription: "JD A",
                structuredRequirements: [{ requirement: "Kubernetes", category: "required_skill", importance: "critical", weight: 4 }]
            });

            // User B has 0 jobs
            const resB = await request(app)
                .get("/api/career/gaps")
                .set("Cookie", userBCookie);

            assert.strictEqual(resB.status, 200);
            assert.strictEqual(resB.body.status, "insufficient_data");
            assert.strictEqual(resB.body.gaps.length, 0);
        });
    });

    describe("4. Career Dashboard API (GET /api/career/dashboard)", () => {
        it("should calculate exact deterministic dashboard metrics and match score denominator", async () => {
            // Setup User A: 5 tracked jobs
            const job1 = await jobModel.create({ user: userA._id, title: "Job 1", status: "applied", rawDescription: "JD", structuredRequirements: [] });
            const job2 = await jobModel.create({ user: userA._id, title: "Job 2", status: "interviewing", rawDescription: "JD", structuredRequirements: [] });
            const job3 = await jobModel.create({ user: userA._id, title: "Job 3", status: "saved", rawDescription: "JD", structuredRequirements: [] });
            const job4 = await jobModel.create({ user: userA._id, title: "Job 4", status: "saved", rawDescription: "JD", structuredRequirements: [] });
            const job5 = await jobModel.create({ user: userA._id, title: "Job 5", status: "rejected", rawDescription: "JD", structuredRequirements: [] });

            // 3 jobs evaluated with deterministic scores: 80, 70, 90
            await interviewReportModel.create({ user: userA._id, job: job1._id, title: "Report 1", jobDescription: "JD", deterministicScore: 80 });
            await interviewReportModel.create({ user: userA._id, job: job2._id, title: "Report 2", jobDescription: "JD", deterministicScore: 70 });
            await interviewReportModel.create({ user: userA._id, job: job3._id, title: "Report 3", jobDescription: "JD", deterministicScore: 90 });

            // Profile with 2 demonstrated skills
            await careerProfileModel.create({
                user: userA._id,
                targetRole: "Lead Architect",
                skills: [
                    { canonicalName: "React", displayName: "React", status: "demonstrated", evidence: [{ verbatimQuote: "React", sourceResumeVersion: resumeA._id, isGrounded: true }] },
                    { canonicalName: "Node.js", displayName: "Node.js", status: "demonstrated", evidence: [{ verbatimQuote: "Node", sourceResumeVersion: resumeA._id, isGrounded: true }] },
                    { canonicalName: "AWS", displayName: "AWS", status: "unverified" } // Unverified must not count as demonstrated
                ]
            });

            // Active roadmap with 2 items, 1 completed
            await learningRoadmapModel.create({
                user: userA._id,
                title: "Roadmap",
                targetRole: "Lead Architect",
                status: "active",
                items: [
                    { canonicalSkill: "Docker", displayName: "Docker", priority: "high", gapStatus: "missing", reason: "Req", targetOutcome: "Goal", status: "completed" },
                    { canonicalSkill: "K8s", displayName: "K8s", priority: "critical", gapStatus: "missing", reason: "Req", targetOutcome: "Goal", status: "in_progress" }
                ]
            });

            const res = await request(app)
                .get("/api/career/dashboard")
                .set("Cookie", userACookie);

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            const d = res.body.dashboard;

            assert.strictEqual(d.targetRole, "Lead Architect");
            assert.strictEqual(d.totalTrackedJobs, 5);
            assert.strictEqual(d.activePipelineCount, 2, "applied (1) + interviewing (1) = 2");
            assert.strictEqual(d.demonstratedSkillCount, 2, "React + Node.js = 2 (AWS unverified excluded)");
            assert.strictEqual(d.roadmapProgress.totalItems, 2);
            assert.strictEqual(d.roadmapProgress.completedItems, 1);
            assert.strictEqual(d.roadmapProgress.percentComplete, 50);

            // Average match score: (80 + 70 + 90) / 3 = 80
            assert.strictEqual(d.averageMatchScore, 80);
            assert.strictEqual(d.evaluatedJobCount, 3);
        });

        it("should return averageMatchScore = null and evaluatedJobCount = 0 when no jobs have been evaluated", async () => {
            await jobModel.create({ user: userA._id, title: "Job 1", status: "saved", rawDescription: "JD", structuredRequirements: [] });

            const res = await request(app)
                .get("/api/career/dashboard")
                .set("Cookie", userACookie);

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.dashboard.averageMatchScore, null);
            assert.strictEqual(res.body.dashboard.evaluatedJobCount, 0);
            assert.strictEqual(res.body.dashboard.totalTrackedJobs, 1);
        });
    });

    describe("5. Roadmaps API (/api/roadmaps)", () => {
        let jobA;

        beforeEach(async () => {
            jobA = await jobModel.create({
                user: userA._id,
                title: "Platform Engineer",
                company: "Cloud Corp",
                rawDescription: "Docker and Kubernetes experience required.",
                structuredRequirements: [
                    { requirement: "Docker", category: "required_skill", importance: "high", weight: 3 },
                    { requirement: "Kubernetes", category: "required_skill", importance: "critical", weight: 4 }
                ]
            });
        });

        it("POST /api/roadmaps: should generate and persist a snapshot roadmap", async () => {
            const res = await request(app)
                .post("/api/roadmaps")
                .set("Cookie", userACookie)
                .send({
                    targetRole: "Senior Platform Engineer",
                    title: "Custom Platform Roadmap"
                });

            assert.strictEqual(res.status, 201);
            assert.strictEqual(res.body.success, true);
            assert.ok(res.body.roadmap._id);
            assert.strictEqual(res.body.roadmap.title, "Custom Platform Roadmap");
            assert.strictEqual(res.body.roadmap.items.length, 2);
        });

        it("POST /api/roadmaps: should return 400 when user has zero target jobs", async () => {
            const res = await request(app)
                .post("/api/roadmaps")
                .set("Cookie", userBCookie) // User B has 0 jobs
                .send({ targetRole: "DevOps" });

            assert.strictEqual(res.status, 400);
            assert.strictEqual(res.body.success, false);
            assert.ok(res.body.message.includes("At least one target job is required"));
        });

        it("GET /api/roadmaps: should list only the authenticated user's roadmaps", async () => {
            await learningRoadmapModel.create({
                user: userA._id,
                title: "Roadmap A",
                targetRole: "Role A",
                items: []
            });

            const resA = await request(app)
                .get("/api/roadmaps")
                .set("Cookie", userACookie);

            assert.strictEqual(resA.status, 200);
            assert.strictEqual(resA.body.roadmaps.length, 1);

            const resB = await request(app)
                .get("/api/roadmaps")
                .set("Cookie", userBCookie);

            assert.strictEqual(resB.status, 200);
            assert.strictEqual(resB.body.roadmaps.length, 0);
        });

        it("GET /api/roadmaps/:id: should prevent IDOR (return 404 for other user's roadmap)", async () => {
            const roadmapA = await learningRoadmapModel.create({
                user: userA._id,
                title: "Secret Roadmap A",
                targetRole: "Role A",
                items: []
            });

            const resB = await request(app)
                .get(`/api/roadmaps/${roadmapA._id}`)
                .set("Cookie", userBCookie);

            assert.strictEqual(resB.status, 404);
            assert.strictEqual(resB.body.message, "Roadmap not found.");
        });

        it("PATCH /api/roadmaps/:id/items/:itemId: should update status and manage completedAt correctly", async () => {
            const roadmap = await learningRoadmapModel.create({
                user: userA._id,
                title: "Roadmap Test",
                targetRole: "Role A",
                items: [
                    {
                        canonicalSkill: "Docker",
                        displayName: "Docker",
                        priority: "high",
                        gapStatus: "missing",
                        gapScore: 3.0,
                        jobFrequency: 1,
                        reason: "Target job requirement",
                        targetOutcome: "Master Docker",
                        status: "not_started"
                    }
                ]
            });

            const itemId = roadmap.items[0]._id;

            // 1. Mark as completed -> should set completedAt
            const completeRes = await request(app)
                .patch(`/api/roadmaps/${roadmap._id}/items/${itemId}`)
                .set("Cookie", userACookie)
                .send({ status: "completed" });

            assert.strictEqual(completeRes.status, 200);
            assert.strictEqual(completeRes.body.item.status, "completed");
            assert.ok(completeRes.body.item.completedAt);

            // 2. Revert to in_progress -> should clear completedAt
            const revertRes = await request(app)
                .patch(`/api/roadmaps/${roadmap._id}/items/${itemId}`)
                .set("Cookie", userACookie)
                .send({ status: "in_progress" });

            assert.strictEqual(revertRes.status, 200);
            assert.strictEqual(revertRes.body.item.status, "in_progress");
            assert.strictEqual(revertRes.body.item.completedAt, undefined);

            // 3. Mark as skipped -> should succeed and keep completedAt cleared
            const skipRes = await request(app)
                .patch(`/api/roadmaps/${roadmap._id}/items/${itemId}`)
                .set("Cookie", userACookie)
                .send({ status: "skipped" });

            assert.strictEqual(skipRes.status, 200);
            assert.strictEqual(skipRes.body.item.status, "skipped");
            assert.strictEqual(skipRes.body.item.completedAt, undefined);

            // 4. Reject non-item status 'archived' with 400 (canonical item statuses: not_started, in_progress, completed, skipped)
            const rejectArchivedRes = await request(app)
                .patch(`/api/roadmaps/${roadmap._id}/items/${itemId}`)
                .set("Cookie", userACookie)
                .send({ status: "archived" });

            assert.strictEqual(rejectArchivedRes.status, 400);
            assert.strictEqual(rejectArchivedRes.body.success, false);
            assert.ok(rejectArchivedRes.body.message.includes("Must be one of: not_started, in_progress, completed, skipped"));
        });

        it("PATCH /api/roadmaps/:id/items/:itemId: should REJECT modification of deterministic metadata", async () => {
            const roadmap = await learningRoadmapModel.create({
                user: userA._id,
                title: "Roadmap Test",
                targetRole: "Role A",
                items: [
                    {
                        canonicalSkill: "Docker",
                        displayName: "Docker",
                        priority: "high",
                        gapStatus: "missing",
                        gapScore: 3.0,
                        jobFrequency: 1,
                        reason: "Target job requirement",
                        targetOutcome: "Master Docker",
                        status: "not_started"
                    }
                ]
            });

            const itemId = roadmap.items[0]._id;

            // Attempt to modify deterministic metadata (e.g. gapScore or canonicalSkill)
            const res = await request(app)
                .patch(`/api/roadmaps/${roadmap._id}/items/${itemId}`)
                .set("Cookie", userACookie)
                .send({
                    canonicalSkill: "Kubernetes",
                    gapScore: 99.0
                });

            assert.strictEqual(res.status, 400);
            assert.strictEqual(res.body.success, false);
            assert.ok(res.body.message.includes("Modification of deterministic metadata"));

            // Verify unchanged in DB
            const unchanged = await learningRoadmapModel.findById(roadmap._id);
            assert.strictEqual(unchanged.items[0].canonicalSkill, "Docker");
            assert.strictEqual(unchanged.items[0].gapScore, 3.0);
        });

        it("PATCH /api/roadmaps/:id/items/:itemId: should prevent IDOR (return 404 for other user's roadmap item)", async () => {
            const roadmapA = await learningRoadmapModel.create({
                user: userA._id,
                title: "Roadmap A",
                targetRole: "Role A",
                items: [{
                    canonicalSkill: "Docker",
                    displayName: "Docker",
                    priority: "high",
                    gapStatus: "missing",
                    reason: "Req",
                    targetOutcome: "Goal"
                }]
            });

            const itemId = roadmapA.items[0]._id;

            const resB = await request(app)
                .patch(`/api/roadmaps/${roadmapA._id}/items/${itemId}`)
                .set("Cookie", userBCookie)
                .send({ status: "completed" });

            assert.strictEqual(resB.status, 404);
            assert.strictEqual(resB.body.message, "Roadmap not found.");
        });
    });
});
