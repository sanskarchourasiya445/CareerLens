/**
 * @file evidenceSync.service.js
 * @description Non-destructive synchronization of verified grounded requirement matches
 * from InterviewReports to the candidate's CareerProfile.
 */

const careerProfileModel = require("../models/careerProfile.model");
const { normalizeSkill, getSkillMetadata } = require("./skillNormalizer");

/**
 * Synchronize verified grounded evidence into the user's CareerProfile.
 * Non-destructive:
 * - Upserts new skills without deleting existing skills
 * - Upgrades skill status (unverified -> partial -> demonstrated)
 * - Appends grounded evidence quotes linked to source ResumeVersion
 * - Rejects non-grounded or missing requirements
 *
 * @param {Object} params
 * @param {string|mongoose.Types.ObjectId} params.userId
 * @param {string|mongoose.Types.ObjectId} [params.resumeVersionId]
 * @param {Array<Object>} params.verifiedMatches
 * @returns {Promise<Object|null>} Updated CareerProfile document or null
 */
async function syncVerifiedEvidenceToCareerProfile({ userId, resumeVersionId, verifiedMatches }) {
    if (!userId || !Array.isArray(verifiedMatches) || verifiedMatches.length === 0) {
        return null;
    }

    // Filter to only grounded matches with valid evidence quotes
    const groundedMatches = verifiedMatches.filter(m =>
        m &&
        (m.status === "matched" || m.status === "partial") &&
        m.isGrounded === true &&
        typeof (m.evidenceQuote || m.evidence) === "string" &&
        (m.evidenceQuote || m.evidence).trim().length > 0
    );

    if (groundedMatches.length === 0) {
        return null;
    }

    let profile = await careerProfileModel.findOne({ user: userId });

    if (!profile) {
        profile = new careerProfileModel({
            user: userId,
            targetRole: "Full Stack Engineer",
            skills: []
        });
    }

    if (!Array.isArray(profile.skills)) {
        profile.skills = [];
    }

    let profileModified = false;

    for (const match of groundedMatches) {
        const rawRequirement = match.requirement || "";
        const canonicalName = normalizeSkill(rawRequirement);
        if (!canonicalName) continue;

        const candidateStatus = match.status === "matched" ? "demonstrated" : "partial";
        const meta = getSkillMetadata(canonicalName);
        const category = meta.category || "technology";

        const existingSkillIndex = profile.skills.findIndex(
            s => s.canonicalName && s.canonicalName.toLowerCase() === canonicalName.toLowerCase()
        );

        const quoteText = (match.evidenceQuote || match.evidence || "").trim();
        const newEvidenceItem = resumeVersionId && quoteText ? {
            verbatimQuote: quoteText,
            sourceResumeVersion: resumeVersionId,
            isGrounded: true,
            verifiedAt: new Date()
        } : null;

        if (existingSkillIndex >= 0) {
            const existingSkill = profile.skills[existingSkillIndex];

            // Upgrade status if new evidence is stronger
            if (candidateStatus === "demonstrated" && existingSkill.status !== "demonstrated") {
                existingSkill.status = "demonstrated";
                profileModified = true;
            } else if (candidateStatus === "partial" && existingSkill.status === "unverified") {
                existingSkill.status = "partial";
                profileModified = true;
            }

            // Append evidence if not already present for this resume version + quote
            if (newEvidenceItem) {
                if (!Array.isArray(existingSkill.evidence)) {
                    existingSkill.evidence = [];
                }
                const alreadyCited = existingSkill.evidence.some(e =>
                    e &&
                    e.sourceResumeVersion &&
                    e.sourceResumeVersion.toString() === resumeVersionId.toString() &&
                    e.verbatimQuote === newEvidenceItem.verbatimQuote
                );

                if (!alreadyCited) {
                    existingSkill.evidence.push(newEvidenceItem);
                    profileModified = true;
                }
            }
        } else {
            // New skill discovered and grounded
            profile.skills.push({
                canonicalName,
                displayName: match.requirement || canonicalName,
                category,
                status: candidateStatus,
                evidence: newEvidenceItem ? [newEvidenceItem] : []
            });
            profileModified = true;
        }
    }

    if (profileModified || profile.isNew) {
        await profile.save();
    }

    return profile;
}

module.exports = {
    syncVerifiedEvidenceToCareerProfile
};
