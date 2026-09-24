const mongoose = require("mongoose");
const pdfParse = require("pdf-parse");
const { generateInterviewReport, generateEvidenceAnalysis, generateResumePdf } = require("../services/ai.service");
const { calculateDeterministicScore, verifyAndGroundEvidence } = require("../services/scoring.service");
const interviewReportModel = require("../models/interviewReport.model");
const resumeVersionModel = require("../models/resumeVersion.model");
const jobModel = require("../models/job.model");
const { syncVerifiedEvidenceToCareerProfile } = require("../services/evidenceSync.service");
const { AppError } = require("../middlewares/error.middleware");

/**
 * Validate that the buffer begins with PDF magic bytes (%PDF)
 */
function isValidPdfBuffer(buffer) {
    if (!buffer || buffer.length < 4) return false;
    return buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
}

/**
 * Normalize extracted text by removing null bytes, control characters, and trimming whitespace
 */
function normalizeExtractedText(text) {
    if (typeof text !== "string") return "";
    return text
        .replace(/\r\n/g, "\n")
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

/**
 * @description Master controller to generate or evaluate career interview intelligence report.
 * Supports both:
 * 1. Reusable flow: { resumeVersionId, jobId }
 * 2. One-shot flow: upload PDF resume + raw jobDescription
 */
async function generateInterViewReportController(req, res, next) {
    let createdResumeVersion = null;
    let createdJob = null;

    try {
        const { resumeVersionId, jobId, selfDescription, jobDescription } = req.body;

        // ─────────────────────────────────────────────────────────────────────
        // 1. Reusable Flow (Existing ResumeVersion + Existing Job)
        // ─────────────────────────────────────────────────────────────────────
        if (resumeVersionId && jobId) {
            if (!mongoose.Types.ObjectId.isValid(resumeVersionId) || !mongoose.Types.ObjectId.isValid(jobId)) {
                return res.status(404).json({
                    success: false,
                    message: "Specified resume version or job not found."
                });
            }

            const [resumeVersion, job] = await Promise.all([
                resumeVersionModel.findOne({ _id: resumeVersionId, user: req.user.id }),
                jobModel.findOne({ _id: jobId, user: req.user.id })
            ]);

            if (!resumeVersion || !job) {
                return res.status(404).json({
                    success: false,
                    message: "Specified resume version or job not found."
                });
            }

            const evidenceData = await generateEvidenceAnalysis({
                structuredRequirements: job.structuredRequirements,
                resume: resumeVersion.extractedText,
                selfDescription: selfDescription || "",
                jobTitle: job.title
            });

            // Verify evidence grounding against candidate's actual text
            const verifiedMatches = verifyAndGroundEvidence(
                evidenceData.requirementMatches,
                resumeVersion.extractedText,
                selfDescription
            );

            const scoreResult = calculateDeterministicScore(verifiedMatches);

            const interviewReport = await interviewReportModel.create({
                user: req.user.id,
                resumeVersion: resumeVersion._id,
                job: job._id,
                title: job.title,
                jobDescription: job.rawDescription,
                resume: resumeVersion.extractedText,
                selfDescription: selfDescription || "",
                deterministicScore: scoreResult.score,
                matchScore: scoreResult.score,
                scoreBreakdown: scoreResult.breakdown,
                scoreExplanation: evidenceData.scoreExplanation,
                requirementMatches: verifiedMatches,
                technicalQuestions: evidenceData.technicalQuestions,
                behavioralQuestions: evidenceData.behavioralQuestions,
                skillGaps: evidenceData.skillGaps,
                preparationPlan: evidenceData.preparationPlan
            });

            // Synchronize verified grounded evidence to candidate's CareerProfile non-destructively
            await syncVerifiedEvidenceToCareerProfile({
                userId: req.user.id,
                resumeVersionId: resumeVersion._id,
                verifiedMatches
            }).catch(err => {
                console.error("CareerProfile evidence sync error (reusable):", err.message);
            });

            return res.status(201).json({
                success: true,
                message: "Career intelligence analysis generated successfully.",
                interviewReport
            });
        }

        // ─────────────────────────────────────────────────────────────────────
        // 2. One-Shot Flow (Upload Resume + Enter Job Description)
        // ─────────────────────────────────────────────────────────────────────
        if (!jobDescription || String(jobDescription).trim().length < 10) {
            return res.status(400).json({
                success: false,
                message: "A valid job description is required (minimum 10 characters)."
            });
        }

        let extractedResumeText = "";

        if (req.file) {
            if (!isValidPdfBuffer(req.file.buffer)) {
                return res.status(400).json({
                    success: false,
                    message: "The uploaded file is not a valid PDF document. Please upload an authentic .pdf file."
                });
            }

            try {
                const parsed = await (new pdfParse.PDFParse(Uint8Array.from(req.file.buffer))).getText();
                extractedResumeText = normalizeExtractedText(parsed.text);
            } catch (parseError) {
                return res.status(400).json({
                    success: false,
                    message: "Failed to extract text from the PDF file. The file may be corrupt or encrypted."
                });
            }
        }

        const trimmedSelfDesc = selfDescription ? String(selfDescription).trim() : "";
        const readableResumeCharCount = extractedResumeText.replace(/\s+/g, "").length;

        if (req.file && readableResumeCharCount < 50) {
            return res.status(400).json({
                success: false,
                message: "The uploaded PDF contains no readable text or is a scanned image (minimum 50 readable characters required). Please provide a text-based PDF or describe your experience in the self-description field."
            });
        }

        if (!req.file && trimmedSelfDesc.length < 10) {
            return res.status(400).json({
                success: false,
                message: "Please provide either a readable resume PDF (minimum 50 characters) or a self-description (minimum 10 characters)."
            });
        }

        // Run full AI pipeline
        const aiAnalysis = await generateInterviewReport({
            resume: extractedResumeText,
            selfDescription: trimmedSelfDesc,
            jobDescription: String(jobDescription).trim()
        });

        // Persist reusable ResumeVersion if a file was uploaded
        if (req.file && extractedResumeText) {
            const count = await resumeVersionModel.countDocuments({ user: req.user.id });
            createdResumeVersion = await resumeVersionModel.create({
                user: req.user.id,
                title: `${req.file.originalname.replace(/\.[^/.]+$/, "")} (v${count + 1})`,
                originalFilename: req.file.originalname,
                fileSize: req.file.size,
                mimeType: req.file.mimetype || "application/pdf",
                extractedText: extractedResumeText,
                readableCharCount: readableResumeCharCount,
                metadata: {
                    wordCount: extractedResumeText.split(/\s+/).filter(Boolean).length,
                    versionNumber: count + 1
                }
            });
        }

        // Persist reusable Job
        const requirementsForJob = (aiAnalysis.requirementMatches || []).map(m => ({
            requirement: m.requirement,
            category: m.category,
            importance: m.importance,
            weight: m.importance === "critical" ? 5 : m.importance === "high" ? 4 : m.importance === "medium" ? 3 : 2
        }));

        createdJob = await jobModel.create({
            user: req.user.id,
            title: aiAnalysis.title || "Target Role",
            company: "Target Company",
            rawDescription: String(jobDescription).trim(),
            structuredRequirements: requirementsForJob
        });

        // Verify evidence grounding against candidate's actual text if requirementMatches are present
        let finalScore;
        let scoreBreakdown;
        let verifiedMatches = [];

        if (!aiAnalysis.isLegacyFallback && aiAnalysis.requirementMatches && aiAnalysis.requirementMatches.length > 0) {
            verifiedMatches = verifyAndGroundEvidence(
                aiAnalysis.requirementMatches,
                extractedResumeText,
                trimmedSelfDesc
            );
            const deterministicScoring = calculateDeterministicScore(verifiedMatches);
            finalScore = deterministicScoring.score;
            scoreBreakdown = deterministicScoring.breakdown;
        } else {
            // Legacy report format fallback (e.g. Phase 1 test mocks / legacy reports)
            finalScore = typeof aiAnalysis.matchScore === "number" ? aiAnalysis.matchScore : 0;
            scoreBreakdown = aiAnalysis.scoreBreakdown || {
                totalPossibleWeight: 0,
                totalEarnedWeight: 0,
                rawPercentage: finalScore,
                criticalPenaltyApplied: 0,
                categories: {}
            };
            verifiedMatches = aiAnalysis.requirementMatches || [];
        }

        const interviewReport = await interviewReportModel.create({
            user: req.user.id,
            resumeVersion: createdResumeVersion ? createdResumeVersion._id : undefined,
            job: createdJob ? createdJob._id : undefined,
            resume: extractedResumeText,
            selfDescription: trimmedSelfDesc,
            jobDescription: String(jobDescription).trim(),
            ...aiAnalysis,
            requirementMatches: verifiedMatches,
            matchScore: finalScore,
            deterministicScore: finalScore,
            scoreBreakdown
        });

        // Synchronize verified grounded evidence to candidate's CareerProfile non-destructively
        if (createdResumeVersion) {
            await syncVerifiedEvidenceToCareerProfile({
                userId: req.user.id,
                resumeVersionId: createdResumeVersion._id,
                verifiedMatches
            }).catch(err => {
                console.error("CareerProfile evidence sync error (one-shot):", err.message);
            });
        }

        return res.status(201).json({
            success: true,
            message: "Interview report generated successfully.",
            interviewReport
        });

    } catch (error) {
        // Rollback / cleanup newly created entities on failure to prevent orphaned records
        if (createdResumeVersion) {
            await resumeVersionModel.findByIdAndDelete(createdResumeVersion._id).catch(() => {});
        }
        if (createdJob) {
            await jobModel.findByIdAndDelete(createdJob._id).catch(() => {});
        }
        return next(error);
    }
}

/**
 * @description Controller to get interview report by interviewId (Strict user ownership check).
 */
async function getInterviewReportByIdController(req, res, next) {
    try {
        const { interviewId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(interviewId)) {
            return res.status(404).json({
                success: false,
                message: "Interview report not found."
            });
        }

        const interviewReport = await interviewReportModel.findOne({
            _id: interviewId,
            user: req.user.id
        }).populate("resumeVersion", "title originalFilename fileSize createdAt")
          .populate("job", "title company createdAt");

        if (!interviewReport) {
            return res.status(404).json({
                success: false,
                message: "Interview report not found."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Interview report fetched successfully.",
            interviewReport
        });

    } catch (error) {
        return next(error);
    }
}

/** 
 * @description Controller to get all interview reports of logged in user.
 */
async function getAllInterviewReportsController(req, res, next) {
    try {
        const interviewReports = await interviewReportModel
            .find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .select("-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -preparationPlan")
            .populate("resumeVersion", "title originalFilename")
            .populate("job", "title company");

        return res.status(200).json({
            success: true,
            message: "Interview reports fetched successfully.",
            interviewReports
        });

    } catch (error) {
        return next(error);
    }
}

/**
 * @description Controller to generate resume PDF (Strict user ownership check to prevent IDOR).
 */
async function generateResumePdfController(req, res, next) {
    try {
        const { interviewReportId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(interviewReportId)) {
            return res.status(404).json({
                success: false,
                message: "Interview report not found."
            });
        }

        const interviewReport = await interviewReportModel.findOne({
            _id: interviewReportId,
            user: req.user.id
        });

        if (!interviewReport) {
            return res.status(404).json({
                success: false,
                message: "Interview report not found."
            });
        }

        const { resume, jobDescription, selfDescription } = interviewReport;

        const pdfBuffer = await generateResumePdf({ resume, jobDescription, selfDescription });

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename=resume_${interviewReportId}.pdf`,
            "Content-Length": pdfBuffer.length
        });

        return res.send(pdfBuffer);

    } catch (error) {
        return next(error);
    }
}

module.exports = {
    generateInterViewReportController,
    getInterviewReportByIdController,
    getAllInterviewReportsController,
    generateResumePdfController
};