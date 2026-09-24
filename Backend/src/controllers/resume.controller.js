const mongoose = require("mongoose");
const pdfParse = require("pdf-parse");
const resumeVersionModel = require("../models/resumeVersion.model");
const { AppError } = require("../middlewares/error.middleware");

function isValidPdfBuffer(buffer) {
    if (!buffer || buffer.length < 4) return false;
    return buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
}

function normalizeExtractedText(text) {
    if (typeof text !== "string") return "";
    return text
        .replace(/\r\n/g, "\n")
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

/**
 * @description Upload and create a new reusable ResumeVersion
 * @route POST /api/resumes
 * @access Private
 */
async function createResumeVersionController(req, res, next) {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "A resume PDF file is required."
            });
        }

        if (!isValidPdfBuffer(req.file.buffer)) {
            return res.status(400).json({
                success: false,
                message: "The uploaded file is not a valid PDF document. Please upload an authentic .pdf file."
            });
        }

        let extractedText = "";
        try {
            const parsed = await (new pdfParse.PDFParse(Uint8Array.from(req.file.buffer))).getText();
            extractedText = normalizeExtractedText(parsed.text);
        } catch (parseError) {
            return res.status(400).json({
                success: false,
                message: "Failed to extract text from the PDF file. The file may be corrupt or encrypted."
            });
        }

        const readableCharCount = extractedText.replace(/\s+/g, "").length;
        if (readableCharCount < 50) {
            return res.status(400).json({
                success: false,
                message: "The uploaded PDF contains no readable text or is a scanned image (minimum 50 readable characters required). Please provide a text-based PDF."
            });
        }

        // Count previous versions to increment version number
        const existingCount = await resumeVersionModel.countDocuments({ user: req.user.id });
        const versionNumber = existingCount + 1;

        const title = req.body.title && String(req.body.title).trim().length > 0
            ? String(req.body.title).trim()
            : `${req.file.originalname.replace(/\.[^/.]+$/, "")} (v${versionNumber})`;

        const wordCount = extractedText.split(/\s+/).filter(Boolean).length;

        const resumeVersion = await resumeVersionModel.create({
            user: req.user.id,
            title,
            originalFilename: req.file.originalname,
            fileSize: req.file.size,
            mimeType: req.file.mimetype || "application/pdf",
            extractedText,
            readableCharCount,
            metadata: {
                wordCount,
                versionNumber
            }
        });

        return res.status(201).json({
            success: true,
            message: "Resume version created successfully.",
            resumeVersion
        });

    } catch (error) {
        return next(error);
    }
}

/**
 * @description Get all resume versions owned by the authenticated user
 * @route GET /api/resumes
 * @access Private
 */
async function getAllResumeVersionsController(req, res, next) {
    try {
        const resumeVersions = await resumeVersionModel
            .find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .select("-extractedText"); // Exclude heavy text payload in list view

        return res.status(200).json({
            success: true,
            message: "Resume versions fetched successfully.",
            resumeVersions
        });

    } catch (error) {
        return next(error);
    }
}

/**
 * @description Get specific resume version by ID (with full text)
 * @route GET /api/resumes/:id
 * @access Private
 */
async function getResumeVersionByIdController(req, res, next) {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({
                success: false,
                message: "Resume version not found."
            });
        }

        const resumeVersion = await resumeVersionModel.findOne({
            _id: id,
            user: req.user.id
        });

        if (!resumeVersion) {
            return res.status(404).json({
                success: false,
                message: "Resume version not found."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Resume version fetched successfully.",
            resumeVersion
        });

    } catch (error) {
        return next(error);
    }
}

/**
 * @description Delete specific resume version by ID
 * @route DELETE /api/resumes/:id
 * @access Private
 */
async function deleteResumeVersionByIdController(req, res, next) {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({
                success: false,
                message: "Resume version not found."
            });
        }

        const deleted = await resumeVersionModel.findOneAndDelete({
            _id: id,
            user: req.user.id
        });

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: "Resume version not found."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Resume version deleted successfully."
        });

    } catch (error) {
        return next(error);
    }
}

module.exports = {
    createResumeVersionController,
    getAllResumeVersionsController,
    getResumeVersionByIdController,
    deleteResumeVersionByIdController
};
