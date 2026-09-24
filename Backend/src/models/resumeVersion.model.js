const mongoose = require("mongoose");

const resumeVersionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: [true, "User reference is required"],
        index: true
    },
    title: {
        type: String,
        required: [true, "Resume title is required"],
        trim: true,
        maxlength: 120
    },
    originalFilename: {
        type: String,
        required: [true, "Original filename is required"],
        trim: true
    },
    fileSize: {
        type: Number,
        required: [true, "File size is required"]
    },
    mimeType: {
        type: String,
        default: "application/pdf"
    },
    extractedText: {
        type: String,
        required: [true, "Extracted text is required"]
    },
    readableCharCount: {
        type: Number,
        required: [true, "Readable character count is required"]
    },
    metadata: {
        wordCount: { type: Number, default: 0 },
        detectedSkillsCount: { type: Number, default: 0 },
        versionNumber: { type: Number, default: 1 }
    }
}, {
    timestamps: true
});

const resumeVersionModel = mongoose.model("ResumeVersion", resumeVersionSchema);

module.exports = resumeVersionModel;
