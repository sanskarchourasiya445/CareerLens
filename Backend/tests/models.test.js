const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
const { connectTestDB, clearTestDB, disconnectTestDB } = require("./setup");
const userModel = require("../src/models/user.model");
const jobModel = require("../src/models/job.model");
const resumeVersionModel = require("../src/models/resumeVersion.model");
const careerProfileModel = require("../src/models/careerProfile.model");
const learningRoadmapModel = require("../src/models/learningRoadmap.model");

describe("Phase 3 Slice 1 — Data Models & Schema Evolution Suite", () => {
    let testUser;

    before(async () => {
        await connectTestDB();
    });

    after(async () => {
        await disconnectTestDB();
    });

    beforeEach(async () => {
        await clearTestDB();
        testUser = await userModel.create({
            username: "slice1_tester",
            email: "slice1_tester@example.com",
            password: "HashedPassword123!"
        });
    });

    describe("Job Model Extension & Backward Compatibility", () => {
        it("should create a Job with default status 'saved' when tracking fields are omitted (Phase 2 compatibility)", async () => {
            const job = await jobModel.create({
                user: testUser._id,
                title: "Software Engineer",
                company: "Tech Corp",
                rawDescription: "Looking for an engineer proficient in Node.js and MongoDB.",
                structuredRequirements: [
                    { requirement: "Node.js", category: "required_skill", importance: "critical", weight: 4 }
                ]
            });

            assert.strictEqual(job.status, "saved");
            assert.strictEqual(job.applicationDate, undefined);
            assert.strictEqual(job.notes, undefined);
            assert.strictEqual(job.sourceUrl, undefined);
            assert.strictEqual(job.title, "Software Engineer");
        });

        it("should accept valid tracking fields and status transitions", async () => {
            const appliedDate = new Date("2026-03-15T10:00:00Z");
            const job = await jobModel.create({
                user: testUser._id,
                title: "Senior Backend Lead",
                company: "Cloud Systems Inc",
                rawDescription: "Distributed systems and cloud architecture role.",
                status: "applied",
                applicationDate: appliedDate,
                notes: "Referral from teammate. Applied via company careers portal.",
                sourceUrl: "https://careers.cloudsystems.com/jobs/123",
                targetRole: "Senior Backend Lead"
            });

            assert.strictEqual(job.status, "applied");
            assert.strictEqual(job.notes, "Referral from teammate. Applied via company careers portal.");
            assert.strictEqual(job.sourceUrl, "https://careers.cloudsystems.com/jobs/123");
            assert.strictEqual(job.targetRole, "Senior Backend Lead");
            assert.strictEqual(job.applicationDate.getTime(), appliedDate.getTime());
        });

        it("should accept all canonical job statuses (saved, applied, interviewing, offer, rejected, archived)", async () => {
            const canonicalStatuses = ["saved", "applied", "interviewing", "offer", "rejected", "archived"];
            for (const status of canonicalStatuses) {
                const job = await jobModel.create({
                    user: testUser._id,
                    title: `Test Job ${status}`,
                    rawDescription: "Test JD",
                    status
                });
                assert.strictEqual(job.status, status);
            }
        });

        it("should reject invalid status values outside the supported enum (including 'offered')", async () => {
            await assert.rejects(async () => {
                await jobModel.create({
                    user: testUser._id,
                    title: "DevOps Engineer",
                    rawDescription: "Docker and Kubernetes experience required.",
                    status: "invalid_status_enum_value"
                });
            }, /`invalid_status_enum_value` is not a valid enum value/);

            // Specifically verify 'offered' is rejected in favor of canonical 'offer'
            await assert.rejects(async () => {
                await jobModel.create({
                    user: testUser._id,
                    title: "Lead Engineer",
                    rawDescription: "JD",
                    status: "offered"
                });
            }, /`offered` is not a valid enum value/);
        });
    });

    describe("CareerProfile Model & Multi-Resume Evidence Provenance", () => {
        it("should successfully create a CareerProfile with grounded candidate skills", async () => {
            const resumeV1 = await resumeVersionModel.create({
                user: testUser._id,
                title: "Resume 2025",
                originalFilename: "resume_2025.pdf",
                fileSize: 1024,
                mimeType: "application/pdf",
                extractedText: "Experienced React and Node.js developer.",
                readableCharCount: 65
            });

            const profile = await careerProfileModel.create({
                user: testUser._id,
                headline: "Full Stack Engineer | React & Node Systems",
                targetRole: "Senior AI Engineer",
                experienceLevel: "senior",
                preferredDomains: ["FinTech", "Developer Tools"],
                skills: [
                    {
                        canonicalName: "React",
                        displayName: "React.js",
                        category: "technology",
                        status: "demonstrated",
                        evidence: [
                            {
                                verbatimQuote: "Experienced React and Node.js developer.",
                                sourceResumeVersion: resumeV1._id,
                                isGrounded: true
                            }
                        ]
                    }
                ],
                careerGoals: ["Master distributed consensus", "Lead an AI platform team"]
            });

            assert.strictEqual(profile.user.toString(), testUser._id.toString());
            assert.strictEqual(profile.skills.length, 1);
            assert.strictEqual(profile.skills[0].canonicalName, "React");
            assert.strictEqual(profile.skills[0].status, "demonstrated");
            assert.strictEqual(profile.skills[0].evidence.length, 1);
            assert.strictEqual(profile.skills[0].evidence[0].isGrounded, true);
        });

        it("should support multiple resume versions contributing evidence to the same canonical skill", async () => {
            const resumeV1 = await resumeVersionModel.create({
                user: testUser._id,
                title: "Resume V1",
                originalFilename: "v1.pdf",
                fileSize: 1000,
                extractedText: "Basic Docker container experience.",
                readableCharCount: 60
            });

            const resumeV2 = await resumeVersionModel.create({
                user: testUser._id,
                title: "Resume V2",
                originalFilename: "v2.pdf",
                fileSize: 1200,
                extractedText: "Production Docker Compose and multi-stage builds.",
                readableCharCount: 75
            });

            const profile = await careerProfileModel.create({
                user: testUser._id,
                targetRole: "Platform Engineer",
                skills: [
                    {
                        canonicalName: "Docker",
                        displayName: "Docker",
                        category: "technology",
                        status: "demonstrated",
                        evidence: [
                            {
                                verbatimQuote: "Basic Docker container experience.",
                                sourceResumeVersion: resumeV1._id,
                                isGrounded: false // e.g. flagged in earlier version
                            },
                            {
                                verbatimQuote: "Production Docker Compose and multi-stage builds.",
                                sourceResumeVersion: resumeV2._id,
                                isGrounded: true // grounded in newer version
                            }
                        ]
                    }
                ]
            });

            assert.strictEqual(profile.skills[0].evidence.length, 2);
            const groundedCount = profile.skills[0].evidence.filter(e => e.isGrounded).length;
            assert.strictEqual(groundedCount, 1);
        });

        it("should leave experienceLevel undefined when omitted rather than defaulting to mid", async () => {
            const profile = await careerProfileModel.create({
                user: testUser._id,
                targetRole: "Cloud Architect"
            });

            assert.strictEqual(profile.experienceLevel, undefined);
        });

        it("should accept candidate-oriented skill categories and reject job requirement categories", async () => {
            const resume = await resumeVersionModel.create({
                user: testUser._id,
                title: "Resume V1",
                originalFilename: "v1.pdf",
                fileSize: 1000,
                extractedText: "Proficient with Python, Postgres, Docker, and AWS.",
                readableCharCount: 60
            });

            // Valid candidate skill categories
            const profile = await careerProfileModel.create({
                user: testUser._id,
                skills: [
                    {
                        canonicalName: "Python",
                        displayName: "Python 3",
                        category: "programming_language",
                        status: "demonstrated",
                        evidence: [{ verbatimQuote: "Proficient with Python", sourceResumeVersion: resume._id }]
                    },
                    {
                        canonicalName: "PostgreSQL",
                        displayName: "Postgres",
                        category: "database",
                        status: "demonstrated",
                        evidence: [{ verbatimQuote: "Postgres", sourceResumeVersion: resume._id }]
                    },
                    {
                        canonicalName: "AWS",
                        displayName: "Amazon Web Services",
                        category: "cloud",
                        status: "demonstrated",
                        evidence: [{ verbatimQuote: "AWS", sourceResumeVersion: resume._id }]
                    }
                ]
            });

            assert.strictEqual(profile.skills.length, 3);
            assert.strictEqual(profile.skills[0].category, "programming_language");
            assert.strictEqual(profile.skills[1].category, "database");
            assert.strictEqual(profile.skills[2].category, "cloud");

            // Rejection of job requirement categories in CareerProfile
            await assert.rejects(async () => {
                await careerProfileModel.create({
                    user: new mongoose.Types.ObjectId(),
                    skills: [
                        {
                            canonicalName: "TypeScript",
                            displayName: "TypeScript",
                            category: "required_skill" // Invalid in CareerProfile
                        }
                    ]
                });
            }, /`required_skill` is not a valid enum value/);
        });

        it("should enforce unique user constraint on CareerProfile", async () => {
            await careerProfileModel.create({
                user: testUser._id,
                targetRole: "Engineer A"
            });

            await assert.rejects(async () => {
                await careerProfileModel.create({
                    user: testUser._id,
                    targetRole: "Engineer B"
                });
            }, /duplicate key error/);
        });
    });

    describe("LearningRoadmap Snapshot Model", () => {
        it("should support multiple sourceResumeVersionIds and optional estimatedHours", async () => {
            const resume1 = await resumeVersionModel.create({
                user: testUser._id,
                title: "Resume 1",
                originalFilename: "r1.pdf",
                fileSize: 1000,
                extractedText: "Resume 1 text content here",
                readableCharCount: 60
            });
            const resume2 = await resumeVersionModel.create({
                user: testUser._id,
                title: "Resume 2",
                originalFilename: "r2.pdf",
                fileSize: 1000,
                extractedText: "Resume 2 text content here",
                readableCharCount: 60
            });

            const roadmap = await learningRoadmapModel.create({
                user: testUser._id,
                title: "Multi-resume Roadmap",
                targetRole: "Full Stack Engineer",
                sourceResumeVersionIds: [resume1._id, resume2._id],
                items: [
                    {
                        canonicalSkill: "GraphQL",
                        displayName: "GraphQL APIs",
                        priority: "high",
                        gapStatus: "missing",
                        reason: "Target job requirement",
                        targetOutcome: "Build GraphQL schemas"
                        // estimatedHours omitted
                    }
                ]
            });

            assert.strictEqual(roadmap.sourceResumeVersionIds.length, 2);
            assert.strictEqual(roadmap.sourceResumeVersionIds[0].toString(), resume1._id.toString());
            assert.strictEqual(roadmap.sourceResumeVersionIds[1].toString(), resume2._id.toString());
            assert.strictEqual(roadmap.items[0].estimatedHours, undefined, "estimatedHours should be undefined when omitted");
        });

        it("should successfully create a persistent LearningRoadmap snapshot with actionable items", async () => {
            const roadmap = await learningRoadmapModel.create({
                user: testUser._id,
                title: "Roadmap to Senior Platform Engineer",
                targetRole: "Senior Platform Engineer",
                items: [
                    {
                        canonicalSkill: "Kubernetes",
                        displayName: "Kubernetes (K8s)",
                        priority: "critical",
                        gapStatus: "missing",
                        gapScore: 4.5,
                        jobFrequency: 2,
                        reason: "Required as critical skill by 2 target jobs; missing from candidate resume.",
                        targetOutcome: "Deploy and manage stateful workloads on Kubernetes clusters.",
                        learningObjectives: [
                            "Understand Pods, Services, and Ingress controllers",
                            "Configure ConfigMaps and Secrets securely"
                        ],
                        practiceIdeas: [
                            "Set up a local Minikube cluster running a Node.js microservice"
                        ],
                        estimatedHours: 15,
                        status: "not_started"
                    }
                ]
            });

            assert.strictEqual(roadmap.status, "active");
            assert.strictEqual(roadmap.items.length, 1);
            assert.ok(roadmap.items[0]._id, "Expected roadmap item to receive an auto-generated _id for granular patching");
            assert.strictEqual(roadmap.items[0].status, "not_started");
            assert.strictEqual(roadmap.items[0].canonicalSkill, "Kubernetes");
        });

        it("should support all canonical item statuses (not_started, in_progress, completed, skipped) and reject 'archived' on items", async () => {
            const canonicalItemStatuses = ["not_started", "in_progress", "completed", "skipped"];
            for (const itemStatus of canonicalItemStatuses) {
                const roadmap = await learningRoadmapModel.create({
                    user: testUser._id,
                    title: `Roadmap Item Status ${itemStatus}`,
                    targetRole: "DevOps Engineer",
                    items: [
                        {
                            canonicalSkill: "Terraform",
                            displayName: "Terraform",
                            priority: "high",
                            gapStatus: "missing",
                            reason: "Target job requirement",
                            targetOutcome: "Write Infrastructure as Code",
                            status: itemStatus
                        }
                    ]
                });
                assert.strictEqual(roadmap.items[0].status, itemStatus);
            }

            // 'archived' is valid for the top-level roadmap document, but NOT for individual items (must use 'skipped')
            await assert.rejects(async () => {
                await learningRoadmapModel.create({
                    user: testUser._id,
                    title: "Roadmap Item Archived Rejection",
                    targetRole: "DevOps Engineer",
                    items: [
                        {
                            canonicalSkill: "Jenkins",
                            displayName: "Jenkins",
                            priority: "low",
                            gapStatus: "partial",
                            reason: "Legacy pipeline requirement",
                            targetOutcome: "Maintain existing CI jobs",
                            status: "archived" // must be rejected on items
                        }
                    ]
                });
            }, /`archived` is not a valid enum value for path `status`/);
        });
    });
});
