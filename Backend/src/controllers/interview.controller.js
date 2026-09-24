const mongoose = require("mongoose")
const pdfParse = require("pdf-parse")
const { generateInterviewReport, generateResumePdf } = require("../services/ai.service")
const interviewReportModel = require("../models/interviewReport.model")
const { AppError } = require("../middlewares/error.middleware")

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
 * @description Controller to generate interview report based on user self description, resume and job description.
 */
async function generateInterViewReportController(req, res, next) {
    try {
        const { selfDescription, jobDescription } = req.body

        if (!jobDescription || String(jobDescription).trim().length < 10) {
            return res.status(400).json({
                success: false,
                message: "A valid job description is required (minimum 10 characters)."
            })
        }

        let extractedResumeText = ""

        if (req.file) {
            // Verify magic bytes
            if (!isValidPdfBuffer(req.file.buffer)) {
                return res.status(400).json({
                    success: false,
                    message: "The uploaded file is not a valid PDF document. Please upload an authentic .pdf file."
                })
            }

            try {
                const parsed = await (new pdfParse.PDFParse(Uint8Array.from(req.file.buffer))).getText()
                extractedResumeText = normalizeExtractedText(parsed.text)
            } catch (parseError) {
                return res.status(400).json({
                    success: false,
                    message: "Failed to extract text from the PDF file. The file may be corrupt or encrypted."
                })
            }
        }

        const trimmedSelfDesc = selfDescription ? String(selfDescription).trim() : ""

        // Validate extracted resume readable characters (ignoring whitespace)
        const readableResumeCharCount = extractedResumeText.replace(/\s+/g, "").length;

        // If a file was uploaded, ensure it has sufficient readable text (minimum 50 non-whitespace characters)
        if (req.file && readableResumeCharCount < 50) {
            return res.status(400).json({
                success: false,
                message: "The uploaded PDF contains no readable text or is a scanned image (minimum 50 readable characters required). Please provide a text-based PDF or describe your experience in the self-description field."
            });
        }

        // If no file was uploaded, require a meaningful self-description (minimum 10 characters)
        if (!req.file && trimmedSelfDesc.length < 10) {
            return res.status(400).json({
                success: false,
                message: "Please provide either a readable resume PDF (minimum 50 characters) or a self-description (minimum 10 characters)."
            });
        }

        const interViewReportByAi = await generateInterviewReport({
            resume: extractedResumeText,
            selfDescription: trimmedSelfDesc,
            jobDescription: String(jobDescription).trim()
        })

        const interviewReport = await interviewReportModel.create({
            user: req.user.id,
            resume: extractedResumeText,
            selfDescription: trimmedSelfDesc,
            jobDescription: String(jobDescription).trim(),
            ...interViewReportByAi
        })

        return res.status(201).json({
            success: true,
            message: "Interview report generated successfully.",
            interviewReport
        })

    } catch (error) {
        return next(error)
    }
}

/**
 * @description Controller to get interview report by interviewId (Strict user ownership check).
 */
async function getInterviewReportByIdController(req, res, next) {
    try {
        const { interviewId } = req.params

        if (!mongoose.Types.ObjectId.isValid(interviewId)) {
            return res.status(404).json({
                success: false,
                message: "Interview report not found."
            })
        }

        const interviewReport = await interviewReportModel.findOne({
            _id: interviewId,
            user: req.user.id
        })

        if (!interviewReport) {
            return res.status(404).json({
                success: false,
                message: "Interview report not found."
            })
        }

        return res.status(200).json({
            success: true,
            message: "Interview report fetched successfully.",
            interviewReport
        })

    } catch (error) {
        return next(error)
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
            .select("-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan")

        return res.status(200).json({
            success: true,
            message: "Interview reports fetched successfully.",
            interviewReports
        })

    } catch (error) {
        return next(error)
    }
}

/**
 * @description Controller to generate resume PDF (Strict user ownership check to prevent IDOR).
 */
async function generateResumePdfController(req, res, next) {
    try {
        const { interviewReportId } = req.params

        if (!mongoose.Types.ObjectId.isValid(interviewReportId)) {
            return res.status(404).json({
                success: false,
                message: "Interview report not found."
            })
        }

        // Enforce user ownership to prevent IDOR / BOLA
        const interviewReport = await interviewReportModel.findOne({
            _id: interviewReportId,
            user: req.user.id
        })

        if (!interviewReport) {
            return res.status(404).json({
                success: false,
                message: "Interview report not found."
            })
        }

        const { resume, jobDescription, selfDescription } = interviewReport

        const pdfBuffer = await generateResumePdf({ resume, jobDescription, selfDescription })

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename=resume_${interviewReportId}.pdf`,
            "Content-Length": pdfBuffer.length
        })

        return res.send(pdfBuffer)

    } catch (error) {
        return next(error)
    }
}

module.exports = {
    generateInterViewReportController,
    getInterviewReportByIdController,
    getAllInterviewReportsController,
    generateResumePdfController
}