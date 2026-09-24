const mongoose = require("mongoose");

const skillEvidenceSchema = new mongoose.Schema({
    verbatimQuote: {
        type: String,
        required: [true, "Verbatim quote is required for skill evidence"],
        trim: true
    },
    sourceResumeVersion: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ResumeVersion",
        required: [true, "Source ResumeVersion reference is required"]
    },
    isGrounded: {
        type: Boolean,
        default: true
    },
    verifiedAt: {
        type: Date,
        default: Date.now
    }
}, {
    _id: false
});

const candidateSkillSchema = new mongoose.Schema({
    canonicalName: {
        type: String,
        required: [true, "Canonical skill name is required"],
        trim: true
    },
    displayName: {
        type: String,
        required: [true, "Display skill name is required"],
        trim: true
    },
    category: {
        type: String,
        enum: [
            "technology",
            "programming_language",
            "framework",
            "database",
            "tool",
            "cloud",
            "domain",
            "soft_skill",
            "experience",
            "education",
            "other"
        ],
        default: "technology"
    },
    status: {
        type: String,
        enum: ["demonstrated", "partial", "unverified"],
        default: "unverified"
    },
    evidence: [skillEvidenceSchema]
}, {
    _id: false
});

const careerProfileSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: [true, "User reference is required"],
        unique: true,
        index: true
    },
    headline: {
        type: String,
        trim: true,
        maxlength: 150,
        default: ""
    },
    targetRole: {
        type: String,
        trim: true,
        maxlength: 100,
        default: "Full Stack Engineer"
    },
    targetRoles: [{
        type: String,
        trim: true
    }],
    experienceLevel: {
        type: String,
        enum: ["entry", "mid", "senior", "lead", "principal"]
    },
    preferredDomains: [{
        type: String,
        trim: true
    }],
    skills: [candidateSkillSchema],
    careerGoals: [{
        type: String,
        trim: true
    }]
}, {
    timestamps: true
});

const careerProfileModel = mongoose.model("CareerProfile", careerProfileSchema);

module.exports = careerProfileModel;
