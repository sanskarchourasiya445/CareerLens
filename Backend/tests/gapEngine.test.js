const { describe, it } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
const {
    analyzeSkillGaps,
    calculateFrequencyMultiplier,
    determinePriorityBand
} = require("../src/services/gap.service");

describe("Phase 3 Slice 2 — Deterministic Gap Engine Suite", () => {
    describe("Mathematical Formula & Multipliers", () => {
        it("should calculate exact frequency multipliers up to the 5+ job cap", () => {
            assert.strictEqual(calculateFrequencyMultiplier(0), 1.00);
            assert.strictEqual(calculateFrequencyMultiplier(1), 1.00);
            assert.strictEqual(calculateFrequencyMultiplier(2), 1.25);
            assert.strictEqual(calculateFrequencyMultiplier(3), 1.50);
            assert.strictEqual(calculateFrequencyMultiplier(4), 1.75);
            assert.strictEqual(calculateFrequencyMultiplier(5), 2.00);
            assert.strictEqual(calculateFrequencyMultiplier(6), 2.00, "Should cap at 2.00 for >5 jobs");
            assert.strictEqual(calculateFrequencyMultiplier(10), 2.00, "Should cap at 2.00 for 10 jobs");
        });

        it("should evaluate exact mathematical boundaries for priority bands", () => {
            // GapScore >= 4.0 -> critical
            assert.strictEqual(determinePriorityBand(4.0, "high", 1.0), "critical");
            assert.strictEqual(determinePriorityBand(4.5, "high", 1.0), "critical");

            // Critical missing skill: even if score is below 4.0, maxImportance = critical AND gapFactor > 0 forces critical!
            assert.strictEqual(determinePriorityBand(2.0, "critical", 0.5), "critical");
            assert.strictEqual(determinePriorityBand(1.0, "critical", 0.5), "critical");

            // 3.99 vs 4.0 boundary (non-critical importance)
            assert.strictEqual(determinePriorityBand(3.99, "high", 1.0), "high");
            assert.strictEqual(determinePriorityBand(4.0, "high", 1.0), "critical");

            // 2.5 boundary
            assert.strictEqual(determinePriorityBand(2.49, "medium", 1.0), "medium");
            assert.strictEqual(determinePriorityBand(2.50, "medium", 1.0), "high");

            // 1.0 boundary
            assert.strictEqual(determinePriorityBand(0.99, "low", 1.0), "low");
            assert.strictEqual(determinePriorityBand(1.00, "low", 1.0), "medium");

            // 0 (matched)
            assert.strictEqual(determinePriorityBand(0, "critical", 0.0), "matched");
        });
    });

    describe("Boundary Cases: Zero Jobs & Empty Requirements", () => {
        it("should return insufficient_data with empty gaps when zero jobs are provided", () => {
            const profile = { skills: [] };
            const result = analyzeSkillGaps({ careerProfile: profile, jobs: [] });

            assert.strictEqual(result.status, "insufficient_data");
            assert.strictEqual(result.gaps.length, 0);
            assert.strictEqual(result.matchedSkills.length, 0);
            assert.strictEqual(result.summary.totalRequirements, 0);
            assert.strictEqual(result.summary.totalJobs, 0);
        });

        it("should handle null/undefined job list gracefully", () => {
            const result = analyzeSkillGaps({ careerProfile: null, jobs: null });
            assert.strictEqual(result.status, "insufficient_data");
            assert.strictEqual(result.gaps.length, 0);
        });
    });

    describe("Canonical Skill Matching & Multi-Job Aggregation", () => {
        it("should canonicalize React variants across jobs and match against candidate React", () => {
            const resumeId = new mongoose.Types.ObjectId();
            const profile = {
                targetRole: "Senior Frontend Lead",
                skills: [
                    {
                        canonicalName: "React",
                        displayName: "React",
                        status: "demonstrated",
                        evidence: [{ verbatimQuote: "5 years React development", sourceResumeVersion: resumeId, isGrounded: true }]
                    }
                ]
            };

            const jobs = [
                {
                    _id: new mongoose.Types.ObjectId(),
                    title: "Frontend Engineer",
                    structuredRequirements: [
                        { requirement: "React.js", category: "required_skill", importance: "high", weight: 3 }
                    ]
                },
                {
                    _id: new mongoose.Types.ObjectId(),
                    title: "Lead UI Developer",
                    structuredRequirements: [
                        { requirement: "ReactJS", category: "required_skill", importance: "critical", weight: 4 }
                    ]
                }
            ];

            const result = analyzeSkillGaps({ careerProfile: profile, jobs });

            assert.strictEqual(result.status, "analyzed");
            // React is demonstrated, so it must be matched and excluded from gaps
            assert.strictEqual(result.gaps.length, 0, "Matched skills must NOT enter learning gaps");
            assert.strictEqual(result.matchedSkills.length, 1);
            assert.strictEqual(result.matchedSkills[0].canonicalSkill, "React");
            assert.strictEqual(result.matchedSkills[0].jobFrequency, 2);
            assert.strictEqual(result.matchedSkills[0].maxImportance, "critical");
        });

        it("should deduplicate canonical requirements within the same job and take highest importance", () => {
            const profile = { skills: [] }; // Candidate has no skills
            const jobs = [
                {
                    _id: new mongoose.Types.ObjectId(),
                    title: "Full Stack Engineer",
                    structuredRequirements: [
                        { requirement: "Node.js", category: "required_skill", importance: "medium", weight: 2 },
                        { requirement: "NodeJS", category: "required_skill", importance: "critical", weight: 4 }
                    ]
                }
            ];

            const result = analyzeSkillGaps({ careerProfile: profile, jobs });

            assert.strictEqual(result.gaps.length, 1);
            assert.strictEqual(result.gaps[0].canonicalSkill, "Node.js");
            assert.strictEqual(result.gaps[0].maxImportance, "critical");
            assert.strictEqual(result.gaps[0].jobFrequency, 1, "Duplicate within 1 job should count as frequency 1");
            assert.strictEqual(result.gaps[0].gapScore, 4.0, "Score = 4 (critical) * 1.0 (missing) * 1.0 (freq 1) = 4.0");
            assert.strictEqual(result.gaps[0].priority, "critical");
        });
    });

    describe("Evidence Grounding & Provenance", () => {
        it("should NOT treat a skill as demonstrated if all evidence is ungrounded (isGrounded: false)", () => {
            const resumeId = new mongoose.Types.ObjectId();
            const profile = {
                skills: [
                    {
                        canonicalName: "Kubernetes",
                        displayName: "Kubernetes",
                        status: "demonstrated", // Candidate claimed demonstrated
                        evidence: [
                            { verbatimQuote: "Hallucinated quote", sourceResumeVersion: resumeId, isGrounded: false }
                        ]
                    }
                ]
            };

            const jobs = [
                {
                    _id: new mongoose.Types.ObjectId(),
                    title: "DevOps Engineer",
                    structuredRequirements: [
                        { requirement: "K8s", category: "required_skill", importance: "critical", weight: 4 }
                    ]
                }
            ];

            const result = analyzeSkillGaps({ careerProfile: profile, jobs });

            // Since evidence was ungrounded, it cannot be treated as demonstrated -> treated as missing
            assert.strictEqual(result.gaps.length, 1);
            assert.strictEqual(result.gaps[0].canonicalSkill, "Kubernetes");
            assert.strictEqual(result.gaps[0].gapStatus, "missing");
            assert.strictEqual(result.gaps[0].priority, "critical");
        });

        it("should validate demonstrated status if AT LEAST ONE evidence item from any resume is grounded", () => {
            const resume1 = new mongoose.Types.ObjectId();
            const resume2 = new mongoose.Types.ObjectId();
            const profile = {
                skills: [
                    {
                        canonicalName: "Docker",
                        displayName: "Docker",
                        status: "demonstrated",
                        evidence: [
                            { verbatimQuote: "Weak ungrounded note", sourceResumeVersion: resume1, isGrounded: false },
                            { verbatimQuote: "Grounded Docker container expertise", sourceResumeVersion: resume2, isGrounded: true }
                        ]
                    }
                ]
            };

            const jobs = [
                {
                    _id: new mongoose.Types.ObjectId(),
                    title: "Platform Engineer",
                    structuredRequirements: [
                        { requirement: "Docker", category: "required_skill", importance: "high", weight: 3 }
                    ]
                }
            ];

            const result = analyzeSkillGaps({ careerProfile: profile, jobs });

            assert.strictEqual(result.gaps.length, 0);
            assert.strictEqual(result.matchedSkills.length, 1);
            assert.strictEqual(result.matchedSkills[0].canonicalSkill, "Docker");
        });
    });

    describe("Multi-Job Gap Score & Ranking Verification", () => {
        it("should calculate exact gap scores and sort priorities deterministically", () => {
            const resumeId = new mongoose.Types.ObjectId();
            const profile = {
                skills: [
                    {
                        canonicalName: "Python",
                        displayName: "Python",
                        status: "partial",
                        evidence: [{ verbatimQuote: "Basic Python scripts", sourceResumeVersion: resumeId, isGrounded: true }]
                    }
                ]
            };

            // 3 target jobs:
            // Skill A: AWS (critical, 3 jobs -> freq mult 1.5) -> missing (1.0) -> Score = 4 * 1.0 * 1.5 = 6.0 (critical)
            // Skill B: Python (high, 2 jobs -> freq mult 1.25) -> partial (0.5) -> Score = 3 * 0.5 * 1.25 = 1.88 (medium)
            // Skill C: PostgreSQL (medium, 1 job -> freq mult 1.0) -> missing (1.0) -> Score = 2 * 1.0 * 1.0 = 2.0 (medium)
            const jobs = [
                {
                    _id: new mongoose.Types.ObjectId(),
                    title: "Backend 1",
                    structuredRequirements: [
                        { requirement: "AWS", category: "required_skill", importance: "critical", weight: 4 },
                        { requirement: "Python", category: "required_skill", importance: "high", weight: 3 }
                    ]
                },
                {
                    _id: new mongoose.Types.ObjectId(),
                    title: "Backend 2",
                    structuredRequirements: [
                        { requirement: "Amazon Web Services", category: "required_skill", importance: "critical", weight: 4 },
                        { requirement: "Python 3", category: "required_skill", importance: "medium", weight: 2 },
                        { requirement: "Postgres", category: "required_skill", importance: "medium", weight: 2 }
                    ]
                },
                {
                    _id: new mongoose.Types.ObjectId(),
                    title: "Backend 3",
                    structuredRequirements: [
                        { requirement: "AWS", category: "required_skill", importance: "high", weight: 3 }
                    ]
                }
            ];

            const result = analyzeSkillGaps({ careerProfile: profile, jobs });

            assert.strictEqual(result.status, "analyzed");
            assert.strictEqual(result.gaps.length, 3);

            // 1st gap: AWS (critical, score 6.0)
            const awsGap = result.gaps[0];
            assert.strictEqual(awsGap.canonicalSkill, "AWS");
            assert.strictEqual(awsGap.priority, "critical");
            assert.strictEqual(awsGap.jobFrequency, 3);
            assert.strictEqual(awsGap.gapScore, 6.0);
            assert.strictEqual(awsGap.reason, "Required as critical skill by 3 target jobs; missing from candidate profile.");

            // 2nd gap: PostgreSQL (medium priority, score 2.0, missing)
            // 3rd gap: Python (medium priority, score 1.88, partial)
            const gapSkills = result.gaps.map(g => g.canonicalSkill);
            assert.deepStrictEqual(gapSkills, ["AWS", "PostgreSQL", "Python"]);

            const pythonGap = result.gaps.find(g => g.canonicalSkill === "Python");
            assert.strictEqual(pythonGap.gapStatus, "partial");
            assert.strictEqual(pythonGap.gapScore, 1.88);
            assert.strictEqual(pythonGap.priority, "medium");
            assert.strictEqual(pythonGap.reason, "Required as high skill by 2 target jobs; partially covered in candidate profile.");
        });
    });

    describe("CareerProfile Status to Gap Status Explicit Mapping & Evidence Rules", () => {
        const resumeId1 = new mongoose.Types.ObjectId();
        const resumeId2 = new mongoose.Types.ObjectId();
        const targetJob = {
            _id: new mongoose.Types.ObjectId(),
            title: "Software Engineer",
            structuredRequirements: [
                { requirement: "TypeScript", category: "required_skill", importance: "high", weight: 3 }
            ]
        };

        it("1. demonstrated + grounded evidence -> matched (excluded from gaps, added to matchedSkills)", () => {
            const profile = {
                skills: [{
                    canonicalName: "TypeScript",
                    status: "demonstrated",
                    evidence: [{ verbatimQuote: "Built TS backend", sourceResumeVersion: resumeId1, isGrounded: true }]
                }]
            };

            const result = analyzeSkillGaps({ careerProfile: profile, jobs: [targetJob] });
            assert.strictEqual(result.gaps.length, 0);
            assert.strictEqual(result.matchedSkills.length, 1);
            assert.strictEqual(result.matchedSkills[0].canonicalSkill, "TypeScript");
        });

        it("2. partial + grounded evidence -> partial (included in gaps with gapStatus: partial)", () => {
            const profile = {
                skills: [{
                    canonicalName: "TypeScript",
                    status: "partial",
                    evidence: [{ verbatimQuote: "Basic TS types", sourceResumeVersion: resumeId1, isGrounded: true }]
                }]
            };

            const result = analyzeSkillGaps({ careerProfile: profile, jobs: [targetJob] });
            assert.strictEqual(result.gaps.length, 1);
            assert.strictEqual(result.gaps[0].canonicalSkill, "TypeScript");
            assert.strictEqual(result.gaps[0].gapStatus, "partial");
            assert.strictEqual(result.matchedSkills.length, 0);
        });

        it("3. unverified + evidence -> missing (grounded quote alone must NOT override explicit unverified status)", () => {
            const profile = {
                skills: [{
                    canonicalName: "TypeScript",
                    status: "unverified",
                    evidence: [{ verbatimQuote: "TypeScript mentioned in hobbies", sourceResumeVersion: resumeId1, isGrounded: true }]
                }]
            };

            const result = analyzeSkillGaps({ careerProfile: profile, jobs: [targetJob] });
            assert.strictEqual(result.gaps.length, 1);
            assert.strictEqual(result.gaps[0].canonicalSkill, "TypeScript");
            assert.strictEqual(result.gaps[0].gapStatus, "missing");
            assert.strictEqual(result.matchedSkills.length, 0);
        });

        it("4. demonstrated + only ungrounded evidence -> missing", () => {
            const profile = {
                skills: [{
                    canonicalName: "TypeScript",
                    status: "demonstrated",
                    evidence: [{ verbatimQuote: "Fabricated TS quote", sourceResumeVersion: resumeId1, isGrounded: false }]
                }]
            };

            const result = analyzeSkillGaps({ careerProfile: profile, jobs: [targetJob] });
            assert.strictEqual(result.gaps.length, 1);
            assert.strictEqual(result.gaps[0].gapStatus, "missing");
            assert.strictEqual(result.matchedSkills.length, 0);
        });

        it("5. partial + only ungrounded evidence -> missing", () => {
            const profile = {
                skills: [{
                    canonicalName: "TypeScript",
                    status: "partial",
                    evidence: [{ verbatimQuote: "Unverified TS fragment", sourceResumeVersion: resumeId1, isGrounded: false }]
                }]
            };

            const result = analyzeSkillGaps({ careerProfile: profile, jobs: [targetJob] });
            assert.strictEqual(result.gaps.length, 1);
            assert.strictEqual(result.gaps[0].gapStatus, "missing");
            assert.strictEqual(result.matchedSkills.length, 0);
        });

        it("6. no candidate skill -> missing", () => {
            const profile = { skills: [] };

            const result = analyzeSkillGaps({ careerProfile: profile, jobs: [targetJob] });
            assert.strictEqual(result.gaps.length, 1);
            assert.strictEqual(result.gaps[0].gapStatus, "missing");
            assert.strictEqual(result.matchedSkills.length, 0);
        });

        it("7. multiple evidence items: one ungrounded + one grounded -> valid grounded evidence supports status", () => {
            const profile = {
                skills: [{
                    canonicalName: "TypeScript",
                    status: "demonstrated",
                    evidence: [
                        { verbatimQuote: "Bad quote v1", sourceResumeVersion: resumeId1, isGrounded: false },
                        { verbatimQuote: "Verified quote v2", sourceResumeVersion: resumeId2, isGrounded: true }
                    ]
                }]
            };

            const result = analyzeSkillGaps({ careerProfile: profile, jobs: [targetJob] });
            assert.strictEqual(result.gaps.length, 0);
            assert.strictEqual(result.matchedSkills.length, 1);
            assert.strictEqual(result.matchedSkills[0].canonicalSkill, "TypeScript");
        });

        it("8. multiple evidence items: all ungrounded -> do NOT demonstrate the skill", () => {
            const profile = {
                skills: [{
                    canonicalName: "TypeScript",
                    status: "demonstrated",
                    evidence: [
                        { verbatimQuote: "Bad quote v1", sourceResumeVersion: resumeId1, isGrounded: false },
                        { verbatimQuote: "Bad quote v2", sourceResumeVersion: resumeId2, isGrounded: false }
                    ]
                }]
            };

            const result = analyzeSkillGaps({ careerProfile: profile, jobs: [targetJob] });
            assert.strictEqual(result.gaps.length, 1);
            assert.strictEqual(result.gaps[0].gapStatus, "missing");
            assert.strictEqual(result.matchedSkills.length, 0);
        });
    });
});
