/**
 * @file scoring.service.js
 * @description Pure, deterministic career match scoring service.
 * AI models provide semantic interpretation and evidence extraction;
 * this backend service owns all mathematical evaluation and business weighting.
 */

const IMPORTANCE_WEIGHTS = Object.freeze({
    critical: 4,
    high: 3,
    medium: 2,
    low: 1
});

const STATUS_SCORES = Object.freeze({
    matched: 1.0,
    partial: 0.5,
    missing: 0.0
});

const CATEGORY_WEIGHTS = Object.freeze({
    required_skill: 1.0,
    experience: 1.0,
    domain: 0.9,
    technology: 0.8,
    preferred_skill: 0.7,
    education: 0.6
});

/**
 * Calculates a deterministic match score from structured requirement matches.
 * 
 * Mathematical Formula:
 * 1. For each requirement:
 *    itemMaxWeight = IMPORTANCE_WEIGHT[importance] * CATEGORY_WEIGHT[category]
 *    itemEarnedWeight = itemMaxWeight * STATUS_SCORE[status]
 * 2. rawPercentage = (sum(itemEarnedWeight) / sum(itemMaxWeight)) * 100
 * 3. Penalties:
 *    - Each missing critical requirement deducts 10 points.
 *    - If 100% of critical requirements are missing, the score is capped at 40.
 * 4. Final score is clamped to [0, 100] and rounded to an integer.
 *
 * @param {Array<Object>} requirementMatches - Array of validated requirement match objects.
 * @returns {Object} Score result with breakdown and summary statistics.
 */
function calculateDeterministicScore(requirementMatches = []) {
    if (!Array.isArray(requirementMatches) || requirementMatches.length === 0) {
        return {
            score: 0,
            breakdown: {
                totalPossibleWeight: 0,
                totalEarnedWeight: 0,
                rawPercentage: 0,
                criticalPenaltyApplied: 0,
                categories: {}
            },
            summary: {
                matchedCount: 0,
                partialCount: 0,
                missingCount: 0,
                totalCount: 0
            },
            formula: "Deterministic weighted sum: StatusScore * ImportanceWeight * CategoryWeight"
        };
    }

    let totalPossibleWeight = 0;
    let totalEarnedWeight = 0;
    let matchedCount = 0;
    let partialCount = 0;
    let missingCount = 0;

    let criticalCount = 0;
    let criticalMissingCount = 0;

    const categoryStats = {};

    for (const item of requirementMatches) {
        const category = item.category || "required_skill";
        const importance = item.importance || "medium";
        const status = item.status || "missing";

        const importanceMultiplier = IMPORTANCE_WEIGHTS[importance] !== undefined
            ? IMPORTANCE_WEIGHTS[importance]
            : IMPORTANCE_WEIGHTS.medium;

        const categoryMultiplier = CATEGORY_WEIGHTS[category] !== undefined
            ? CATEGORY_WEIGHTS[category]
            : 1.0;

        const statusFactor = STATUS_SCORES[status] !== undefined
            ? STATUS_SCORES[status]
            : STATUS_SCORES.missing;

        const itemMaxWeight = importanceMultiplier * categoryMultiplier;
        const itemEarnedWeight = itemMaxWeight * statusFactor;

        totalPossibleWeight += itemMaxWeight;
        totalEarnedWeight += itemEarnedWeight;

        if (status === "matched") matchedCount++;
        else if (status === "partial") partialCount++;
        else missingCount++;

        if (importance === "critical") {
            criticalCount++;
            if (status === "missing") {
                criticalMissingCount++;
            }
        }

        if (!categoryStats[category]) {
            categoryStats[category] = { earned: 0, total: 0, count: 0 };
        }
        categoryStats[category].earned += itemEarnedWeight;
        categoryStats[category].total += itemMaxWeight;
        categoryStats[category].count += 1;
    }

    const rawPercentage = totalPossibleWeight > 0
        ? (totalEarnedWeight / totalPossibleWeight) * 100
        : 0;

    let adjustedScore = rawPercentage;
    let criticalPenaltyApplied = 0;

    // Apply critical missing penalty
    if (criticalMissingCount > 0) {
        criticalPenaltyApplied = criticalMissingCount * 10;
        adjustedScore = Math.max(0, adjustedScore - criticalPenaltyApplied);

        // If all critical requirements are missing, cap at 40
        if (criticalCount > 0 && criticalMissingCount === criticalCount) {
            adjustedScore = Math.min(adjustedScore, 40);
        }
    }

    const finalScore = Math.max(0, Math.min(100, Math.round(adjustedScore)));

    return {
        score: finalScore,
        breakdown: {
            totalPossibleWeight: Number(totalPossibleWeight.toFixed(2)),
            totalEarnedWeight: Number(totalEarnedWeight.toFixed(2)),
            rawPercentage: Number(rawPercentage.toFixed(2)),
            criticalPenaltyApplied,
            categories: categoryStats
        },
        summary: {
            matchedCount,
            partialCount,
            missingCount,
            totalCount: requirementMatches.length
        },
        formula: "Deterministic weighted sum: StatusScore * ImportanceWeight * CategoryWeight"
    };
}

/**
 * Normalizes text for evidence grounding verification by stripping punctuation
 * and collapsing consecutive whitespace.
 */
function normalizeForGrounding(text) {
    if (!text || typeof text !== "string") return "";
    return text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Deterministically checks whether the AI-provided evidence citation actually appears
 * within the candidate's resume or self-description text.
 * 
 * If the AI marks a requirement as "matched" or "partial" but cites evidence that does
 * not exist in the candidate text, the citation is flagged as ungrounded/fabricated,
 * the evidence string is sanitized, and the status is demoted to prevent ungrounded score inflation.
 *
 * @param {Array<Object>} requirementMatches - Matches returned from AI analysis
 * @param {string} candidateResumeText - Extracted text from resume
 * @param {string} [candidateSelfDescription=""] - Optional self description text
 * @returns {Array<Object>} Verified and sanitized requirement matches
 */
function verifyAndGroundEvidence(requirementMatches = [], candidateResumeText = "", candidateSelfDescription = "") {
    if (!Array.isArray(requirementMatches)) return [];

    const normalizedSourceText = normalizeForGrounding(
        `${candidateResumeText || ""} ${candidateSelfDescription || ""}`
    );

    return requirementMatches.map(match => {
        // Missing requirements are not expected to have a resume citation
        if (!match || match.status === "missing") {
            return {
                ...match,
                isGrounded: true
            };
        }

        const rawEvidence = match.evidence || "";
        const normalizedEvidence = normalizeForGrounding(rawEvidence);

        // If the evidence text is empty or simply states no evidence was found
        if (!normalizedEvidence || normalizedEvidence.includes("no supporting evidence") || normalizedEvidence.length < 3) {
            return {
                ...match,
                status: "missing",
                evidence: "No supporting evidence found in resume",
                isGrounded: false
            };
        }

        // 1. Direct substring check
        const isDirectSubstring = normalizedSourceText.includes(normalizedEvidence);

        // 2. Sliding window check for longer quotes that may have minor formatting differences
        let isSubsequenceFound = false;
        if (!isDirectSubstring && normalizedEvidence.length > 25) {
            const sampleChunk = normalizedEvidence.slice(0, 25);
            if (normalizedSourceText.includes(sampleChunk)) {
                isSubsequenceFound = true;
            }
        }

        if (isDirectSubstring || isSubsequenceFound) {
            return {
                ...match,
                isGrounded: true
            };
        }

        // The quote was fabricated or not found in the candidate's text
        // Determine demotion: if any significant word exists, demote to 'partial', otherwise 'missing'
        const significantWords = normalizedEvidence.split(" ").filter(w => w.length > 3);
        const hasKeywordMatch = significantWords.length > 0 && significantWords.some(w => normalizedSourceText.includes(w));
        const demotedStatus = hasKeywordMatch ? "partial" : "missing";

        return {
            ...match,
            status: demotedStatus,
            isGrounded: false,
            evidence: `[Unverified Citation: quote not found in submitted text] ${rawEvidence}`,
            explanation: `${match.explanation || ""} (Note: Cited evidence could not be verified in candidate document.)`.trim()
        };
    });
}

module.exports = {
    calculateDeterministicScore,
    verifyAndGroundEvidence,
    normalizeForGrounding,
    IMPORTANCE_WEIGHTS,
    STATUS_SCORES,
    CATEGORY_WEIGHTS
};
