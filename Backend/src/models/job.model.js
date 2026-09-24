const mongoose = require("mongoose");

const structuredRequirementSchema = new mongoose.Schema({
    requirement: {
        type: String,
        required: [true, "Requirement description is required"],
        trim: true
    },
    category: {
        type: String,
        enum: ["required_skill", "preferred_skill", "technology", "experience", "education", "domain"],
        default: "required_skill",
        required: [true, "Requirement category is required"]
    },
    importance: {
        type: String,
        enum: ["critical", "high", "medium", "low"],
        default: "high",
        required: [true, "Requirement importance is required"]
    },
    weight: {
        type: Number,
        min: 1,
        max: 5,
        default: 3
    }
}, {
    _id: false
});

const jobSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: [true, "User reference is required"],
        index: true
    },
    title: {
        type: String,
        required: [true, "Job title is required"],
        trim: true,
        maxlength: 150
    },
    company: {
        type: String,
        trim: true,
        default: "Target Company",
        maxlength: 100
    },
    rawDescription: {
        type: String,
        required: [true, "Raw job description is required"]
    },
    structuredRequirements: [structuredRequirementSchema],
    // Phase 3 Job Tracking additions
    status: {
        type: String,
        enum: ["saved", "applied", "interviewing", "offer", "rejected", "archived"],
        default: "saved",
        index: true
    },
    applicationDate: {
        type: Date
    },
    notes: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    sourceUrl: {
        type: String,
        trim: true,
        maxlength: 300
    },
    targetRole: {
        type: String,
        trim: true,
        maxlength: 100
    }
}, {
    timestamps: true
});

jobSchema.index({ user: 1, status: 1 });
jobSchema.index({ user: 1, createdAt: -1 });

const jobModel = mongoose.model("Job", jobSchema);

module.exports = jobModel;
