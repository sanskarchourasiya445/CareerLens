const mongoose = require("mongoose");

const roadmapItemSchema = new mongoose.Schema({
    canonicalSkill: {
        type: String,
        required: [true, "Canonical skill identity is required"],
        trim: true
    },
    displayName: {
        type: String,
        required: [true, "Display skill name is required"],
        trim: true
    },
    category: {
        type: String,
        default: "technology"
    },
    priority: {
        type: String,
        enum: ["critical", "high", "medium", "low"],
        required: [true, "Item priority is required"]
    },
    gapStatus: {
        type: String,
        enum: ["missing", "partial"],
        required: [true, "Gap status is required"]
    },
    gapScore: {
        type: Number,
        min: 0,
        default: 0
    },
    jobFrequency: {
        type: Number,
        default: 1,
        min: 1
    },
    reason: {
        type: String,
        required: [true, "Deterministic rationale is required"],
        trim: true
    },
    targetOutcome: {
        type: String,
        required: [true, "Target outcome is required"],
        trim: true
    },
    learningObjectives: [{
        type: String,
        trim: true
    }],
    practiceIdeas: [{
        type: String,
        trim: true
    }],
    estimatedHours: {
        type: Number,
        min: 1
    },
    status: {
        type: String,
        enum: ["not_started", "in_progress", "completed", "skipped"],
        default: "not_started"
    },
    completedAt: {
        type: Date
    }
}, {
    _id: true // Subdocument ID allows direct item identification during PATCH
});

const learningRoadmapSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: [true, "User reference is required"],
        index: true
    },
    title: {
        type: String,
        required: [true, "Roadmap title is required"],
        trim: true,
        maxlength: 150
    },
    targetRole: {
        type: String,
        required: [true, "Target role is required"],
        trim: true,
        maxlength: 100
    },
    sourceJobIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Job"
    }],
    sourceResumeVersionIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "ResumeVersion"
    }],
    items: [roadmapItemSchema],
    status: {
        type: String,
        enum: ["active", "completed", "archived"],
        default: "active",
        index: true
    }
}, {
    timestamps: true
});

learningRoadmapSchema.index({ user: 1, status: 1 });
learningRoadmapSchema.index({ user: 1, createdAt: -1 });

const learningRoadmapModel = mongoose.model("LearningRoadmap", learningRoadmapSchema);

module.exports = learningRoadmapModel;
