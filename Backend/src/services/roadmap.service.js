/**
 * @file roadmap.service.js
 * @description Orchestrates the deterministic LearningRoadmap generation pipeline for Rizzume Phase 3.
 * Pipeline:
 *   CareerProfile + Jobs + Grounded Evidence
 *   -> Deterministic Canonical Gap Analysis (gap.service.js)
 *   -> Deterministic Roadmap Inputs & Grounding Context
 *   -> AI Generates Learning Content Only (learning objectives, practice ideas, target outcomes)
 *   -> Strict Zod Validation
 *   -> Deterministic Grounded Fallback if AI Fails
 *   -> Persist LearningRoadmap Snapshot
 */

const learningRoadmapModel = require("../models/learningRoadmap.model");
const { analyzeSkillGaps, evaluateCandidateSkillStatus } = require("./gap.service");
const { normalizeSkill, areSkillsEqual } = require("./skillNormalizer");
const { generateAIRoadmapContent } = require("./ai.service");

/**
 * Generate a complete, high-quality, deterministic fallback roadmap item.
 * Guarantees that:
 * 1. Deterministic gap properties (canonicalSkill, priority, gapScore, etc.) are strictly preserved.
 * 2. Practice ideas bridge from verified demonstrated skills if available.
 * 3. Never claims candidate knows any unverified or missing skills.
 *
 * @param {Object} params
 * @param {Object} params.gap Deterministic gap item from gap.service
 * @param {Array<string>} params.demonstratedSkills List of canonical names of verified candidate skills
 * @param {string} params.targetRole Target role title
 * @returns {Object} Complete roadmap item matching roadmapItemSchema
 */
function generateFallbackRoadmapItem({ gap, demonstratedSkills = [], targetRole = "Target Role" }) {
    const canonical = gap.canonicalSkill;
    const isPartial = gap.gapStatus === "partial";
    const importance = gap.maxImportance || "high";

    const targetOutcome = isPartial
        ? `Deepen existing knowledge of ${canonical} into production-grade proficiency for ${targetRole}.`
        : `Master foundational and advanced concepts of ${canonical} to fulfill ${importance} requirements for ${targetRole}.`;

    const learningObjectives = [
        `Master core principles, runtime mechanics, and architecture of ${canonical}.`,
        `Implement industry best practices, performance optimization, and security patterns in ${canonical}.`,
        `Learn testing, debugging, and deployment workflows for ${canonical}.`
    ];

    let practiceIdeas;
    if (demonstratedSkills.length >= 2) {
        practiceIdeas = [
            `Build and integrate a ${canonical} module into an existing application leveraging ${demonstratedSkills[0]} and ${demonstratedSkills[1]}.`,
            `Develop an end-to-end practical solution combining ${demonstratedSkills[0]} with ${canonical} to demonstrate production readiness.`
        ];
    } else if (demonstratedSkills.length === 1) {
        practiceIdeas = [
            `Build and integrate a ${canonical} module into a project utilizing demonstrated ${demonstratedSkills[0]} skills.`,
            `Develop a full-stack proof-of-concept connecting ${demonstratedSkills[0]} and ${canonical}.`
        ];
    } else {
        practiceIdeas = [
            `Construct a standalone proof-of-concept application demonstrating core features and architecture of ${canonical}.`,
            `Design and execute a comprehensive test suite and deployment pipeline for a ${canonical} service.`
        ];
    }

    const estimatedHours = gap.priority === "critical" ? 20 : gap.priority === "high" ? 15 : gap.priority === "medium" ? 10 : 5;

    return {
        canonicalSkill: gap.canonicalSkill,
        displayName: gap.displayName || gap.canonicalSkill,
        category: gap.category || "technology",
        priority: gap.priority,
        gapStatus: gap.gapStatus,
        gapScore: gap.gapScore,
        jobFrequency: gap.jobFrequency,
        reason: gap.reason,
        targetOutcome,
        learningObjectives,
        practiceIdeas,
        estimatedHours,
        status: "not_started"
    };
}

/**
 * Generate learning content for prioritized gaps.
 * Tries AI generation first with Zod validation. If AI throws, returns invalid schema,
 * or is missing any item, applies deterministic fallback seamlessly.
 *
 * @param {Object} params
 * @param {string} params.targetRole
 * @param {Array<string>} params.demonstratedSkills
 * @param {Array<Object>} params.gaps
 * @returns {Promise<Array<Object>>} Assembled roadmap items
 */
async function generateRoadmapContent({ targetRole, demonstratedSkills = [], gaps = [] }) {
    if (!gaps || gaps.length === 0) {
        return [];
    }

    let aiContentMap = new Map();

    try {
        const aiResponse = await generateAIRoadmapContent({
            targetRole,
            demonstratedSkills,
            gaps
        });

        if (aiResponse && Array.isArray(aiResponse.items)) {
            for (const item of aiResponse.items) {
                if (item && item.canonicalSkill) {
                    const normKey = normalizeSkill(item.canonicalSkill).toLowerCase();
                    aiContentMap.set(normKey, item);
                }
            }
        }
    } catch (aiError) {
        // Deterministic fallback: log failure and proceed with fallback templates
        console.warn(`[RoadmapService] AI roadmap content generation failed (${aiError.message}). Using deterministic fallback.`);
    }

    // Merge deterministic gap properties with AI or fallback content
    const assembledItems = gaps.map(gap => {
        const normKey = normalizeSkill(gap.canonicalSkill).toLowerCase();
        const aiItem = aiContentMap.get(normKey);

        const fallbackItem = generateFallbackRoadmapItem({
            gap,
            demonstratedSkills,
            targetRole
        });

        // AI is only allowed to supply targetOutcome, learningObjectives, practiceIdeas, estimatedHours
        // All deterministic properties (canonicalSkill, priority, gapStatus, gapScore, jobFrequency, reason)
        // strictly originate from the gap engine.
        return {
            canonicalSkill: gap.canonicalSkill,
            displayName: gap.displayName || gap.canonicalSkill,
            category: gap.category || "technology",
            priority: gap.priority,
            gapStatus: gap.gapStatus,
            gapScore: gap.gapScore,
            jobFrequency: gap.jobFrequency,
            reason: gap.reason,
            targetOutcome: (aiItem && aiItem.targetOutcome) ? aiItem.targetOutcome : fallbackItem.targetOutcome,
            learningObjectives: (aiItem && Array.isArray(aiItem.learningObjectives) && aiItem.learningObjectives.length >= 2)
                ? aiItem.learningObjectives
                : fallbackItem.learningObjectives,
            practiceIdeas: (aiItem && Array.isArray(aiItem.practiceIdeas) && aiItem.practiceIdeas.length >= 2)
                ? aiItem.practiceIdeas
                : fallbackItem.practiceIdeas,
            estimatedHours: (aiItem && typeof aiItem.estimatedHours === "number" && aiItem.estimatedHours > 0)
                ? aiItem.estimatedHours
                : fallbackItem.estimatedHours,
            status: "not_started"
        };
    });

    return assembledItems;
}

/**
 * End-to-end LearningRoadmap snapshot creation pipeline.
 *
 * @param {Object} params
 * @param {string} params.userId User ObjectId or string
 * @param {Object} params.careerProfile CareerProfile document or plain object
 * @param {Array<Object>} params.jobs Target Job documents or plain objects
 * @param {string} [params.targetRole] Target role override
 * @param {string} [params.title] Custom roadmap title
 * @param {boolean} [params.persist=true] Whether to save snapshot to MongoDB
 * @returns {Promise<Object>} Snapshot result object
 */
async function generateLearningRoadmap({ userId, careerProfile, jobs, targetRole, title, persist = true } = {}) {
    const effectiveTargetRole = targetRole || careerProfile?.targetRole || "Software Engineer";

    // 1. Run deterministic gap engine
    const gapAnalysis = analyzeSkillGaps({
        careerProfile,
        jobs,
        targetRole: effectiveTargetRole
    });

    if (gapAnalysis.status === "insufficient_data") {
        return {
            status: "insufficient_data",
            message: "At least one target job is required for learning roadmap generation.",
            roadmap: null
        };
    }

    // 2. Extract verified demonstrated skills for grounding context
    const demonstratedSkills = [];
    const sourceResumeVersionIdSet = new Set();

    if (careerProfile && Array.isArray(careerProfile.skills)) {
        for (const skill of careerProfile.skills) {
            if (!skill) continue;
            const effectiveStatus = evaluateCandidateSkillStatus(skill);
            if (effectiveStatus === "demonstrated") {
                const canonical = normalizeSkill(skill.canonicalName || skill.displayName);
                if (canonical && !demonstratedSkills.includes(canonical)) {
                    demonstratedSkills.push(canonical);
                }
            }

            // Collect referenced resume IDs from grounded evidence
            if (Array.isArray(skill.evidence)) {
                for (const ev of skill.evidence) {
                    if (ev && ev.isGrounded && ev.sourceResumeVersion) {
                        sourceResumeVersionIdSet.add(ev.sourceResumeVersion.toString());
                    }
                }
            }
        }
    }

    // 3. Extract source job IDs
    const sourceJobIds = Array.isArray(jobs)
        ? jobs.map(j => j?._id || j?.id).filter(Boolean)
        : [];

    const sourceResumeVersionIds = Array.from(sourceResumeVersionIdSet);

    // 4. Generate learning content for gaps
    const roadmapItems = await generateRoadmapContent({
        targetRole: effectiveTargetRole,
        demonstratedSkills,
        gaps: gapAnalysis.gaps
    });

    const roadmapData = {
        user: userId,
        title: title || `Roadmap to ${effectiveTargetRole}`,
        targetRole: effectiveTargetRole,
        sourceJobIds,
        sourceResumeVersionIds,
        items: roadmapItems,
        status: "active"
    };

    // 5. Persist as snapshot if requested
    if (persist && userId) {
        const savedRoadmap = await learningRoadmapModel.create(roadmapData);
        return {
            status: "success",
            gapAnalysisSummary: gapAnalysis.summary,
            roadmap: savedRoadmap
        };
    }

    return {
        status: "success",
        gapAnalysisSummary: gapAnalysis.summary,
        roadmap: roadmapData
    };
}

module.exports = {
    generateLearningRoadmap,
    generateRoadmapContent,
    generateFallbackRoadmapItem
};
