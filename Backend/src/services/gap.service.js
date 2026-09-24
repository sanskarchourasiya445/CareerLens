/**
 * @file gap.service.js
 * @description Single source of truth for candidate-vs-job skill gap analysis in Rizzume Phase 3.
 * Pure deterministic mathematical calculation and canonical skill identity comparison.
 * Strictly NO AI, NO Gemini calls, NO network calls, NO embeddings, NO database queries.
 */

const { normalizeSkill, getSkillMetadata } = require("./skillNormalizer");

// Deterministic importance weights
const IMPORTANCE_WEIGHTS = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1
};

// Deterministic gap factors
const GAP_FACTORS = {
    missing: 1.0,
    partial: 0.5,
    matched: 0.0
};

// Priority sort hierarchy
const PRIORITY_ORDER = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1
};

/**
 * Calculate the frequency multiplier for target jobs.
 * Formula: M_freq = 1 + min(1, 0.25 * (frequency - 1))
 *
 * 1 job  -> 1.00
 * 2 jobs -> 1.25
 * 3 jobs -> 1.50
 * 4 jobs -> 1.75
 * 5+ jobs -> 2.00
 *
 * @param {number} frequency Number of distinct jobs requiring this skill
 * @returns {number} Multiplier between 1.00 and 2.00
 */
function calculateFrequencyMultiplier(frequency) {
    if (!frequency || frequency < 1) {
        return 1.0;
    }
    return 1 + Math.min(1, 0.25 * (frequency - 1));
}

/**
 * Determine candidate skill status respecting multi-resume evidence provenance.
 * Rule: A skill with isGrounded === false cannot support demonstrated status.
 * If at least one valid grounded evidence item exists, demonstrated status is supported.
 *
 * @param {Object} candidateSkill Skill entry from CareerProfile
 * @returns {"demonstrated" | "partial" | "missing"}
 */
function evaluateCandidateSkillStatus(candidateSkill) {
    if (!candidateSkill) {
        return "missing";
    }

    const declaredStatus = candidateSkill.status || "unverified";
    const evidenceList = Array.isArray(candidateSkill.evidence) ? candidateSkill.evidence : [];
    const hasGroundedEvidence = evidenceList.some(e => e && e.isGrounded === true);

    if (declaredStatus === "demonstrated") {
        // Must have at least one grounded evidence quote to be considered demonstrated
        return hasGroundedEvidence ? "demonstrated" : "missing";
    }

    if (declaredStatus === "partial") {
        return hasGroundedEvidence ? "partial" : "missing";
    }

    // "unverified" or unknown status without verified grounded evidence is treated as missing
    return "missing";
}

/**
 * Determine deterministic gap priority band based on formula output.
 *
 * Critical: GapScore >= 4.0 OR (maxImportance === "critical" AND gapFactor > 0)
 * High:     2.5 <= GapScore < 4.0
 * Medium:   1.0 <= GapScore < 2.5
 * Low:      0 < GapScore < 1.0
 * Matched:  GapScore === 0
 *
 * @param {number} gapScore
 * @param {string} maxImportance
 * @param {number} gapFactor
 * @returns {"critical" | "high" | "medium" | "low" | "matched"}
 */
function determinePriorityBand(gapScore, maxImportance, gapFactor) {
    if (gapFactor === 0.0 || gapScore === 0) {
        return "matched";
    }

    // Critical missing or high-impact gap
    if (gapScore >= 4.0 || (maxImportance === "critical" && gapFactor > 0)) {
        return "critical";
    }

    if (gapScore >= 2.5) {
        return "high";
    }

    if (gapScore >= 1.0) {
        return "medium";
    }

    if (gapScore > 0) {
        return "low";
    }

    return "matched";
}

/**
 * Construct deterministic explanation for a gap item.
 *
 * @param {string} canonicalSkill
 * @param {string} maxImportance
 * @param {number} frequency
 * @param {"missing" | "partial"} gapStatus
 * @returns {string}
 */
function generateDeterministicReason(canonicalSkill, maxImportance, frequency, gapStatus) {
    const jobPlural = frequency === 1 ? "target job" : "target jobs";
    if (gapStatus === "missing") {
        return `Required as ${maxImportance} skill by ${frequency} ${jobPlural}; missing from candidate profile.`;
    }
    return `Required as ${maxImportance} skill by ${frequency} ${jobPlural}; partially covered in candidate profile.`;
}

/**
 * Perform deterministic skill gap analysis between CareerProfile and target Jobs.
 *
 * @param {Object} params
 * @param {Object} params.careerProfile CareerProfile document or plain object
 * @param {Array<Object>} params.jobs Array of Job documents or plain objects
 * @param {string} [params.targetRole] Target role override
 * @returns {Object} Deterministic gap analysis report
 */
function analyzeSkillGaps({ careerProfile, jobs, targetRole } = {}) {
    const jobList = Array.isArray(jobs) ? jobs.filter(Boolean) : [];

    // Boundary Case: Zero target jobs
    if (jobList.length === 0) {
        return {
            status: "insufficient_data",
            message: "At least one target job is required for gap analysis.",
            targetRole: targetRole || careerProfile?.targetRole || "Not specified",
            gaps: [],
            matchedSkills: [],
            summary: {
                totalRequirements: 0,
                matchedCount: 0,
                partialCount: 0,
                missingCount: 0,
                totalJobs: 0
            }
        };
    }

    // 1. Build canonical candidate skill map
    const candidateSkillMap = new Map();
    if (careerProfile && Array.isArray(careerProfile.skills)) {
        for (const skill of careerProfile.skills) {
            if (!skill) continue;
            const canonicalName = normalizeSkill(skill.canonicalName || skill.displayName);
            if (!canonicalName) continue;

            const effectiveStatus = evaluateCandidateSkillStatus(skill);
            candidateSkillMap.set(canonicalName.toLowerCase(), {
                canonicalName,
                displayName: skill.displayName || canonicalName,
                category: skill.category || "technology",
                effectiveStatus,
                originalSkill: skill
            });
        }
    }

    // 2. Aggregate job requirements by canonical skill identity across all jobs
    // Handles duplicate canonical requirements within the same job by taking the maximum importance
    const requirementMap = new Map();

    for (const job of jobList) {
        const jobId = job._id ? job._id.toString() : (job.id || null);
        const jobTitle = job.title || "Target Role";
        const rawReqs = Array.isArray(job.structuredRequirements) ? job.structuredRequirements : [];

        // Deduplicate canonical skills *within* this single job first
        const jobCanonicalReqs = new Map();

        for (const req of rawReqs) {
            const rawName = typeof req === "string" ? req : (req.requirement || "");
            const canonicalName = normalizeSkill(rawName);
            if (!canonicalName) continue;

            const importance = (req.importance || "medium").toLowerCase();
            const weight = IMPORTANCE_WEIGHTS[importance] || req.weight || 2;
            const category = req.category || "required_skill";

            const existingInJob = jobCanonicalReqs.get(canonicalName);
            if (!existingInJob || weight > existingInJob.weight) {
                jobCanonicalReqs.set(canonicalName, {
                    canonicalName,
                    rawName,
                    importance,
                    weight,
                    category
                });
            }
        }

        // Merge this job's unique canonical requirements into the global aggregation
        for (const [canonicalName, reqData] of jobCanonicalReqs.entries()) {
            const key = canonicalName.toLowerCase();
            const existing = requirementMap.get(key);

            if (!existing) {
                const meta = getSkillMetadata(canonicalName);
                requirementMap.set(key, {
                    canonicalSkill: canonicalName,
                    displayName: reqData.rawName || canonicalName,
                    category: meta.category || "technology",
                    maxImportanceWeight: reqData.weight,
                    maxImportance: reqData.importance,
                    frequency: 1,
                    jobIds: jobId ? [jobId] : [],
                    jobTitles: [jobTitle]
                });
            } else {
                existing.frequency += 1;
                if (reqData.weight > existing.maxImportanceWeight) {
                    existing.maxImportanceWeight = reqData.weight;
                    existing.maxImportance = reqData.importance;
                }
                if (jobId && !existing.jobIds.includes(jobId)) {
                    existing.jobIds.push(jobId);
                }
                if (!existing.jobTitles.includes(jobTitle)) {
                    existing.jobTitles.push(jobTitle);
                }
            }
        }
    }

    // 3. Compare aggregated requirements against candidate profile and calculate deterministic gap scores
    const gaps = [];
    const matchedSkills = [];
    let partialCount = 0;
    let missingCount = 0;

    for (const [key, req] of requirementMap.entries()) {
        const candidateEntry = candidateSkillMap.get(key);
        const candidateStatus = candidateEntry ? candidateEntry.effectiveStatus : "missing";

        let gapStatus;
        let gapFactor;

        if (candidateStatus === "demonstrated") {
            gapStatus = "matched";
            gapFactor = GAP_FACTORS.matched; // 0.0
        } else if (candidateStatus === "partial") {
            gapStatus = "partial";
            gapFactor = GAP_FACTORS.partial; // 0.5
        } else {
            gapStatus = "missing";
            gapFactor = GAP_FACTORS.missing; // 1.0
        }

        const frequencyMultiplier = calculateFrequencyMultiplier(req.frequency);
        const rawScore = req.maxImportanceWeight * gapFactor * frequencyMultiplier;
        const gapScore = Number(rawScore.toFixed(2));
        const priority = determinePriorityBand(gapScore, req.maxImportance, gapFactor);

        if (gapFactor === 0.0) {
            matchedSkills.push({
                canonicalSkill: req.canonicalSkill,
                displayName: candidateEntry?.displayName || req.displayName,
                category: candidateEntry?.category || req.category,
                jobFrequency: req.frequency,
                maxImportance: req.maxImportance,
                jobIds: req.jobIds,
                jobTitles: req.jobTitles
            });
        } else {
            if (gapStatus === "partial") {
                partialCount++;
            } else {
                missingCount++;
            }

            gaps.push({
                canonicalSkill: req.canonicalSkill,
                displayName: req.displayName,
                category: req.category,
                priority,
                gapStatus,
                gapScore,
                jobFrequency: req.frequency,
                maxImportance: req.maxImportance,
                maxImportanceWeight: req.maxImportanceWeight,
                frequencyMultiplier,
                reason: generateDeterministicReason(req.canonicalSkill, req.maxImportance, req.frequency, gapStatus),
                targetOutcome: `Master ${req.canonicalSkill} to fulfill ${req.maxImportance} requirement for ${targetRole || "target roles"}.`,
                jobIds: req.jobIds,
                jobTitles: req.jobTitles
            });
        }
    }

    // 4. Sort gaps deterministically:
    // Priority order (critical > high > medium > low) -> gapScore desc -> jobFrequency desc -> canonicalSkill asc
    gaps.sort((a, b) => {
        const pDiff = (PRIORITY_ORDER[b.priority] || 0) - (PRIORITY_ORDER[a.priority] || 0);
        if (pDiff !== 0) return pDiff;

        const scoreDiff = b.gapScore - a.gapScore;
        if (scoreDiff !== 0) return scoreDiff;

        const freqDiff = b.jobFrequency - a.jobFrequency;
        if (freqDiff !== 0) return freqDiff;

        return a.canonicalSkill.localeCompare(b.canonicalSkill);
    });

    // Sort matched skills deterministically by frequency desc then name asc
    matchedSkills.sort((a, b) => {
        const freqDiff = b.jobFrequency - a.jobFrequency;
        if (freqDiff !== 0) return freqDiff;
        return a.canonicalSkill.localeCompare(b.canonicalSkill);
    });

    return {
        status: "analyzed",
        targetRole: targetRole || careerProfile?.targetRole || "Not specified",
        gaps,
        matchedSkills,
        summary: {
            totalRequirements: requirementMap.size,
            matchedCount: matchedSkills.length,
            partialCount,
            missingCount,
            totalJobs: jobList.length
        }
    };
}

module.exports = {
    analyzeSkillGaps,
    calculateFrequencyMultiplier,
    evaluateCandidateSkillStatus,
    determinePriorityBand,
    generateDeterministicReason,
    IMPORTANCE_WEIGHTS,
    GAP_FACTORS
};
