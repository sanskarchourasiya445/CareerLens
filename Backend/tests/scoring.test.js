const { describe, it } = require("node:test");
const assert = require("node:assert");
const { calculateDeterministicScore, verifyAndGroundEvidence } = require("../src/services/scoring.service");

describe("Deterministic Scoring Service Unit Tests", () => {

    it("should return 100 for all matched requirements", () => {
        const matches = [
            { requirement: "React", category: "required_skill", importance: "critical", status: "matched" },
            { requirement: "Node.js", category: "required_skill", importance: "high", status: "matched" },
            { requirement: "TypeScript", category: "technology", importance: "medium", status: "matched" },
            { requirement: "5 years experience", category: "experience", importance: "high", status: "matched" }
        ];

        const result = calculateDeterministicScore(matches);
        assert.strictEqual(result.score, 100);
        assert.strictEqual(result.summary.matchedCount, 4);
        assert.strictEqual(result.summary.missingCount, 0);
        assert.strictEqual(result.summary.partialCount, 0);
    });

    it("should return 0 for all missing requirements", () => {
        const matches = [
            { requirement: "React", category: "required_skill", importance: "critical", status: "missing" },
            { requirement: "Node.js", category: "required_skill", importance: "high", status: "missing" },
            { requirement: "Docker", category: "technology", importance: "low", status: "missing" }
        ];

        const result = calculateDeterministicScore(matches);
        assert.strictEqual(result.score, 0);
        assert.strictEqual(result.summary.matchedCount, 0);
        assert.strictEqual(result.summary.missingCount, 3);
    });

    it("should return 50 for all partial requirements with no critical missing", () => {
        const matches = [
            { requirement: "Node.js", category: "required_skill", importance: "high", status: "partial" },
            { requirement: "TypeScript", category: "technology", importance: "medium", status: "partial" }
        ];

        const result = calculateDeterministicScore(matches);
        assert.strictEqual(result.score, 50);
        assert.strictEqual(result.summary.partialCount, 2);
    });

    it("should produce deterministic repeatable scores for identical inputs across runs", () => {
        const matches = [
            { requirement: "React", category: "required_skill", importance: "critical", status: "matched" },
            { requirement: "GraphQL", category: "preferred_skill", importance: "medium", status: "partial" },
            { requirement: "Kubernetes", category: "technology", importance: "low", status: "missing" },
            { requirement: "CS Degree", category: "education", importance: "low", status: "matched" }
        ];

        const run1 = calculateDeterministicScore(matches);
        const run2 = calculateDeterministicScore(matches);
        const run3 = calculateDeterministicScore(matches);

        assert.strictEqual(run1.score, run2.score);
        assert.strictEqual(run2.score, run3.score);
        assert.strictEqual(run1.breakdown.totalPossibleWeight, run2.breakdown.totalPossibleWeight);
        assert.strictEqual(run1.breakdown.totalEarnedWeight, run2.breakdown.totalEarnedWeight);
    });

    it("should apply penalty and cap when critical requirements are missing", () => {
        // Candidate has preferred skills and minor technologies, but lacks the critical core skill
        const matches = [
            { requirement: "Core Java Architecture", category: "required_skill", importance: "critical", status: "missing" },
            { requirement: "Git", category: "technology", importance: "low", status: "matched" },
            { requirement: "Jira", category: "preferred_skill", importance: "low", status: "matched" }
        ];

        const result = calculateDeterministicScore(matches);
        // Due to missing critical skill, score is heavily reduced and capped <= 40
        assert.ok(result.score <= 40, `Expected score <= 40, got ${result.score}`);
        assert.ok(result.breakdown.criticalPenaltyApplied >= 10);
    });

    it("should weigh critical requirements more heavily than low-importance requirements", () => {
        // Candidate A matches critical (weight 4) and misses low (weight 1)
        const candidateA = [
            { requirement: "React", category: "required_skill", importance: "critical", status: "matched" },
            { requirement: "Figma", category: "preferred_skill", importance: "low", status: "missing" }
        ];

        // Candidate B matches low (weight 1) and misses critical (weight 4)
        const candidateB = [
            { requirement: "React", category: "required_skill", importance: "critical", status: "missing" },
            { requirement: "Figma", category: "preferred_skill", importance: "low", status: "matched" }
        ];

        const scoreA = calculateDeterministicScore(candidateA);
        const scoreB = calculateDeterministicScore(candidateB);

        assert.ok(scoreA.score > scoreB.score, `Expected candidate A (${scoreA.score}) > candidate B (${scoreB.score})`);
        assert.ok(scoreA.score >= 70);
        assert.ok(scoreB.score <= 30);
    });

    it("should handle empty or null requirement list gracefully without throwing", () => {
        const emptyResult = calculateDeterministicScore([]);
        assert.strictEqual(emptyResult.score, 0);

        const nullResult = calculateDeterministicScore(null);
        assert.strictEqual(nullResult.score, 0);
    });

    it("should confirm and ground valid verbatim quotes present in candidate text", () => {
        const resumeText = "Experienced senior engineer with 6 years of React, Node.js, and MongoDB development.";
        const matches = [
            {
                requirement: "React and Node.js",
                status: "matched",
                evidence: "6 years of React, Node.js, and MongoDB development",
                explanation: "Explicitly demonstrated in resume."
            }
        ];

        const verified = verifyAndGroundEvidence(matches, resumeText, "");
        assert.strictEqual(verified.length, 1);
        assert.strictEqual(verified[0].isGrounded, true);
        assert.strictEqual(verified[0].status, "matched");
    });

    it("should detect fabricated or ungrounded quotes, sanitize evidence and demote status", () => {
        const resumeText = "Frontend developer skilled exclusively in HTML and CSS design.";
        const matches = [
            {
                requirement: "Rust Systems Programming",
                status: "matched",
                evidence: "10 years building distributed consensus in Rust and C++",
                explanation: "Candidate claims extensive systems background."
            }
        ];

        const verified = verifyAndGroundEvidence(matches, resumeText, "");
        assert.strictEqual(verified.length, 1);
        assert.strictEqual(verified[0].isGrounded, false);
        // Demoted because no matching keywords exist in resume text
        assert.strictEqual(verified[0].status, "missing");
        assert.match(verified[0].evidence, /Unverified Citation/);
        assert.match(verified[0].explanation, /Note: Cited evidence could not be verified/);
    });
});
