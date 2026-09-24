const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
const { connectTestDB, clearTestDB, disconnectTestDB } = require("./setup");
const userModel = require("../src/models/user.model");
const jobModel = require("../src/models/job.model");
const resumeVersionModel = require("../src/models/resumeVersion.model");
const careerProfileModel = require("../src/models/careerProfile.model");
const learningRoadmapModel = require("../src/models/learningRoadmap.model");
const {
    generateLearningRoadmap,
    generateRoadmapContent,
    generateFallbackRoadmapItem
} = require("../src/services/roadmap.service");
const { ai } = require("../src/services/ai.service");

describe("Phase 3 Slice 3 — AI Roadmap Generation & Grounding Integration Suite", () => {
    let testUser;
    let testResume;

    before(async () => {
        await connectTestDB();
    });

    after(async () => {
        await disconnectTestDB();
    });

    beforeEach(async () => {
        await clearTestDB();
        testUser = await userModel.create({
            username: "roadmap_tester",
            email: "roadmap_tester@example.com",
            password: "HashedPassword123!"
        });

        testResume = await resumeVersionModel.create({
            user: testUser._id,
            title: "Software Engineer Resume",
            originalFilename: "resume.pdf",
            fileSize: 1024,
            extractedText: "Experienced with React and Node.js backend development.",
            readableCharCount: 65
        });
    });

    describe("End-to-End Roadmap Generation & Persistence", () => {
        it("1. should validate AI response and persist a LearningRoadmap snapshot to MongoDB", async () => {
            const profile = await careerProfileModel.create({
                user: testUser._id,
                targetRole: "Senior Full Stack Engineer",
                skills: [
                    {
                        canonicalName: "React",
                        displayName: "React.js",
                        status: "demonstrated",
                        evidence: [{ verbatimQuote: "Experienced with React", sourceResumeVersion: testResume._id, isGrounded: true }]
                    },
                    {
                        canonicalName: "Node.js",
                        displayName: "Node.js",
                        status: "demonstrated",
                        evidence: [{ verbatimQuote: "Node.js backend development", sourceResumeVersion: testResume._id, isGrounded: true }]
                    }
                ]
            });

            const job = await jobModel.create({
                user: testUser._id,
                title: "Cloud Full Stack Lead",
                rawDescription: "Requires React, Node.js, and Docker containerization.",
                structuredRequirements: [
                    { requirement: "React", category: "required_skill", importance: "critical", weight: 4 },
                    { requirement: "Node.js", category: "required_skill", importance: "high", weight: 3 },
                    { requirement: "Docker", category: "required_skill", importance: "critical", weight: 4 }
                ]
            });

            const result = await generateLearningRoadmap({
                userId: testUser._id,
                careerProfile: profile,
                jobs: [job],
                targetRole: "Cloud Full Stack Lead"
            });

            assert.strictEqual(result.status, "success");
            assert.ok(result.roadmap._id, "Expected roadmap to be persisted with MongoDB _id");

            // Verify in DB directly
            const persisted = await learningRoadmapModel.findById(result.roadmap._id);
            assert.ok(persisted, "Roadmap should exist in MongoDB");
            assert.strictEqual(persisted.user.toString(), testUser._id.toString());
            assert.strictEqual(persisted.targetRole, "Cloud Full Stack Lead");
            assert.strictEqual(persisted.status, "active");
            assert.strictEqual(persisted.items.length, 1);

            const dockerItem = persisted.items[0];
            assert.strictEqual(dockerItem.canonicalSkill, "Docker");
            assert.strictEqual(dockerItem.priority, "critical");
            assert.strictEqual(dockerItem.gapStatus, "missing");
            assert.strictEqual(dockerItem.gapScore, 4.0);
            assert.strictEqual(dockerItem.jobFrequency, 1);
            assert.strictEqual(dockerItem.status, "not_started");
            assert.ok(dockerItem.learningObjectives.length >= 2);
            assert.ok(dockerItem.practiceIdeas.length >= 2);
        });

        it("2. should trigger deterministic fallback when AI response is malformed non-JSON", async () => {
            const profile = {
                skills: [{
                    canonicalName: "React",
                    status: "demonstrated",
                    evidence: [{ verbatimQuote: "React quote", sourceResumeVersion: testResume._id, isGrounded: true }]
                }]
            };

            const job = {
                _id: new mongoose.Types.ObjectId(),
                title: "DevOps Engineer",
                structuredRequirements: [
                    { requirement: "Docker", category: "required_skill", importance: "high", weight: 3 }
                ]
            };

            const result = await generateLearningRoadmap({
                userId: testUser._id,
                careerProfile: profile,
                jobs: [job],
                targetRole: "DevOps Engineer SIMULATE_MALFORMED_AI_RESPONSE",
                persist: true
            });

            assert.strictEqual(result.status, "success");
            assert.strictEqual(result.roadmap.items.length, 1);

            const item = result.roadmap.items[0];
            // Deterministic fallback content should be present
            assert.strictEqual(item.canonicalSkill, "Docker");
            assert.ok(item.targetOutcome.includes("Docker"));
            assert.strictEqual(item.learningObjectives.length, 3);
            assert.strictEqual(item.practiceIdeas.length, 2);
            // Practice idea should be grounded in demonstrated skill "React"
            assert.ok(item.practiceIdeas[0].includes("React"));
        });

        it("3. should trigger deterministic fallback when AI response is missing required fields", async () => {
            const profile = { skills: [] };
            const job = {
                _id: new mongoose.Types.ObjectId(),
                title: "DevOps Engineer",
                structuredRequirements: [
                    { requirement: "Docker", category: "required_skill", importance: "medium", weight: 2 }
                ]
            };

            const result = await generateLearningRoadmap({
                userId: testUser._id,
                careerProfile: profile,
                jobs: [job],
                targetRole: "DevOps Engineer SIMULATE_MISSING_FIELDS_AI_RESPONSE",
                persist: true
            });

            assert.strictEqual(result.status, "success");
            const item = result.roadmap.items[0];
            assert.strictEqual(item.canonicalSkill, "Docker");
            assert.ok(item.targetOutcome.length >= 10);
            assert.strictEqual(item.learningObjectives.length, 3);
            assert.strictEqual(item.practiceIdeas.length, 2);
        });

        it("4. should trigger deterministic fallback when AI response violates Zod schema", async () => {
            const profile = { skills: [] };
            const job = {
                _id: new mongoose.Types.ObjectId(),
                title: "DevOps Engineer",
                structuredRequirements: [
                    { requirement: "Docker", category: "required_skill", importance: "high", weight: 3 }
                ]
            };

            const result = await generateLearningRoadmap({
                userId: testUser._id,
                careerProfile: profile,
                jobs: [job],
                targetRole: "DevOps Engineer SIMULATE_INVALID_SCHEMA_RESPONSE",
                persist: true
            });

            assert.strictEqual(result.status, "success");
            const item = result.roadmap.items[0];
            assert.strictEqual(item.canonicalSkill, "Docker");
            assert.ok(item.targetOutcome.length >= 10);
            assert.strictEqual(item.learningObjectives.length, 3);
        });

        it("5. should ground practice ideas in candidate's demonstrated skills", () => {
            const gap = {
                canonicalSkill: "Kubernetes",
                displayName: "Kubernetes",
                category: "tool",
                priority: "critical",
                gapStatus: "missing",
                gapScore: 4.0,
                jobFrequency: 1,
                reason: "Job requirement",
                maxImportance: "critical"
            };

            const demonstratedSkills = ["React", "Node.js"];
            const fallbackItem = generateFallbackRoadmapItem({
                gap,
                demonstratedSkills,
                targetRole: "Full Stack Engineer"
            });

            assert.strictEqual(fallbackItem.practiceIdeas.length, 2);
            assert.ok(fallbackItem.practiceIdeas[0].includes("React"));
            assert.ok(fallbackItem.practiceIdeas[0].includes("Node.js"));
            assert.ok(fallbackItem.practiceIdeas[0].includes("Kubernetes"));
        });

        it("6. should NEVER represent unverified/missing skills as demonstrated", () => {
            const gap = {
                canonicalSkill: "AWS",
                displayName: "AWS",
                category: "cloud",
                priority: "high",
                gapStatus: "missing",
                gapScore: 3.0,
                jobFrequency: 1,
                reason: "Job requirement",
                maxImportance: "high"
            };

            // Empty demonstrated skills: candidate has NO demonstrated skills
            const fallbackItem = generateFallbackRoadmapItem({
                gap,
                demonstratedSkills: [],
                targetRole: "Cloud Engineer"
            });

            assert.strictEqual(fallbackItem.practiceIdeas.length, 2);
            // Must not mention React, Node, or any unverified skills
            assert.ok(!fallbackItem.practiceIdeas[0].includes("React"));
            assert.ok(!fallbackItem.practiceIdeas[0].includes("Node.js"));
            assert.ok(fallbackItem.practiceIdeas[0].includes("standalone proof-of-concept"));
        });

        it("7. should strictly preserve deterministic gap scores, priorities, and frequency from gap engine", async () => {
            const profile = { skills: [] }; // All missing
            const job1 = {
                _id: new mongoose.Types.ObjectId(),
                title: "Job 1",
                structuredRequirements: [
                    { requirement: "Kubernetes", category: "required_skill", importance: "critical", weight: 4 }
                ]
            };
            const job2 = {
                _id: new mongoose.Types.ObjectId(),
                title: "Job 2",
                structuredRequirements: [
                    { requirement: "K8s", category: "required_skill", importance: "high", weight: 3 }
                ]
            };

            // Kubernetes in 2 jobs -> freq mult = 1.25, max importance = critical (4), missing (1.0)
            // GapScore = 4 * 1.0 * 1.25 = 5.0
            const result = await generateLearningRoadmap({
                userId: testUser._id,
                careerProfile: profile,
                jobs: [job1, job2],
                targetRole: "Platform Lead",
                persist: false
            });

            assert.strictEqual(result.roadmap.items.length, 1);
            const k8sItem = result.roadmap.items[0];
            assert.strictEqual(k8sItem.canonicalSkill, "Kubernetes");
            assert.strictEqual(k8sItem.priority, "critical");
            assert.strictEqual(k8sItem.gapScore, 5.0);
            assert.strictEqual(k8sItem.jobFrequency, 2);
            assert.strictEqual(k8sItem.gapStatus, "missing");
        });

        it("8. should gracefully survive complete Gemini failure (throw) via deterministic fallback", async () => {
            const profile = { skills: [] };
            const job = {
                _id: new mongoose.Types.ObjectId(),
                title: "Backend Engineer",
                structuredRequirements: [
                    { requirement: "Docker", category: "required_skill", importance: "high", weight: 3 }
                ]
            };

            const result = await generateLearningRoadmap({
                userId: testUser._id,
                careerProfile: profile,
                jobs: [job],
                targetRole: "Backend Engineer SIMULATE_AI_THROW_ERROR",
                persist: false
            });

            assert.strictEqual(result.status, "success");
            assert.strictEqual(result.roadmap.items.length, 1);
            assert.strictEqual(result.roadmap.items[0].canonicalSkill, "Docker");
            assert.ok(result.roadmap.items[0].targetOutcome.includes("Docker"));
        });

        it("9. should return insufficient_data and empty roadmap when zero jobs are provided", async () => {
            const profile = { skills: [] };
            const result = await generateLearningRoadmap({
                userId: testUser._id,
                careerProfile: profile,
                jobs: []
            });

            assert.strictEqual(result.status, "insufficient_data");
            assert.strictEqual(result.roadmap, null);
        });

        it("10. should PREVENT AI from overriding deterministic gap metadata when AI returns mismatched canonical skill", async () => {
            const profile = { skills: [] };
            const job = await jobModel.create({
                user: testUser._id,
                title: "DevOps Lead",
                rawDescription: "Requires Docker containerization.",
                structuredRequirements: [
                    { requirement: "Docker", category: "required_skill", importance: "high", weight: 3 }
                ]
            });

            // Gap engine calculates: Docker, priority: high, gapStatus: missing, gapScore: 3.0, jobFrequency: 1
            // AI simulation returns: canonicalSkill: "Kubernetes"
            const result = await generateLearningRoadmap({
                userId: testUser._id,
                careerProfile: profile,
                jobs: [job],
                targetRole: "DevOps Lead SIMULATE_AI_MISMATCHED_CANONICAL_SKILL",
                persist: true
            });

            assert.strictEqual(result.status, "success");
            assert.strictEqual(result.roadmap.items.length, 1);

            const persistedItem = result.roadmap.items[0];

            // 1. Canonical skill MUST be Docker from deterministic gap engine, NOT Kubernetes from AI
            assert.strictEqual(persistedItem.canonicalSkill, "Docker");
            assert.notStrictEqual(persistedItem.canonicalSkill, "Kubernetes");

            // 2. All deterministic metadata MUST remain strictly intact
            assert.strictEqual(persistedItem.displayName, "Docker");
            assert.strictEqual(persistedItem.category, "tool");
            assert.strictEqual(persistedItem.priority, "high");
            assert.strictEqual(persistedItem.gapStatus, "missing");
            assert.strictEqual(persistedItem.gapScore, 3.0);
            assert.strictEqual(persistedItem.jobFrequency, 1);
            assert.strictEqual(persistedItem.reason, "Required as high skill by 1 target job; missing from candidate profile.");

            // 3. Fallback content applied for Docker (AI's Kubernetes was ignored)
            assert.ok(persistedItem.targetOutcome.includes("Docker"));
            assert.ok(!persistedItem.targetOutcome.includes("Kubernetes"));
            assert.ok(persistedItem.learningObjectives.some(obj => obj.includes("Docker")));
            assert.ok(persistedItem.learningObjectives.every(obj => !obj.includes("Kubernetes")));
        });
    });
});
