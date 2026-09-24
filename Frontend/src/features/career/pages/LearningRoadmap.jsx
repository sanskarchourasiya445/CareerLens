import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import WorkspaceNav from "../../../components/WorkspaceNav";
import { getRoadmaps, getRoadmapById, createRoadmap, updateRoadmapItem } from "../../../services/roadmapApi";
import "../style/workspace.scss";

const STATUS_OPTIONS = [
    { value: "not_started", label: "Not Started" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "skipped", label: "Skipped" }
];

const LearningRoadmap = () => {
    const navigate = useNavigate();
    const [roadmaps, setRoadmaps] = useState([]);
    const [selectedRoadmap, setSelectedRoadmap] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Generation State
    const [showGenModal, setShowGenModal] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [genTargetRole, setGenTargetRole] = useState("");
    const [genTitle, setGenTitle] = useState("");
    const [genError, setGenError] = useState(null);

    // Item Status Update State
    const [updatingItemId, setUpdatingItemId] = useState(null);

    const loadRoadmapsList = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getRoadmaps();
            const list = data.roadmaps || [];
            setRoadmaps(list);
            if (list.length > 0) {
                // Select active or first roadmap
                const active = list.find(r => r.status === "active") || list[0];
                setSelectedRoadmap(active);
                setGenTargetRole(active.targetRole || "");
            }
        } catch (err) {
            setError(err.message || "Failed to load learning roadmaps.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRoadmapsList();
    }, []);

    const handleSelectRoadmap = async (roadmapId) => {
        setLoading(true);
        try {
            const res = await getRoadmapById(roadmapId);
            if (res.roadmap) {
                setSelectedRoadmap(res.roadmap);
            }
        } catch (err) {
            alert(err.message || "Failed to switch roadmap.");
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (itemId, newStatus) => {
        if (!selectedRoadmap) return;
        setUpdatingItemId(itemId);
        try {
            const res = await updateRoadmapItem(selectedRoadmap._id, itemId, { status: newStatus });
            if (res.roadmap) {
                setSelectedRoadmap(res.roadmap);
                setRoadmaps(prev => prev.map(r => (r._id === res.roadmap._id ? res.roadmap : r)));
            } else if (res.item) {
                setSelectedRoadmap(prev => {
                    if (!prev) return prev;
                    const nextItems = prev.items.map(it => (it._id === itemId ? { ...it, ...res.item } : it));
                    return { ...prev, items: nextItems };
                });
            }
        } catch (err) {
            alert(err.message || "Failed to update milestone status.");
        } finally {
            setUpdatingItemId(null);
        }
    };

    const handleGenerate = async (e) => {
        e.preventDefault();
        setGenerating(true);
        setGenError(null);
        try {
            const res = await createRoadmap({
                targetRole: genTargetRole.trim() || undefined,
                title: genTitle.trim() || undefined
            });

            if (res.roadmap) {
                setSelectedRoadmap(res.roadmap);
                setRoadmaps(prev => [res.roadmap, ...prev]);
                setShowGenModal(false);
                setGenTitle("");
            }
        } catch (err) {
            setGenError(err.message || "Failed to generate learning roadmap.");
        } finally {
            setGenerating(false);
        }
    };

    const items = selectedRoadmap?.items || [];
    const completedCount = items.filter(i => i.status === "completed").length;
    const percentComplete = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

    return (
        <div className="workspace-page">
            <WorkspaceNav />

            <main className="workspace-container">
                {/* Header Strip */}
                <div className="page-title-strip">
                    <div>
                        <h1 className="page-title">Learning Roadmap</h1>
                        <p className="page-subtitle">
                            Deterministic gap priorities bridged with AI-generated learning objectives and practical milestones.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="btn-action btn-action--primary"
                        onClick={() => setShowGenModal(true)}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
                        Generate New Roadmap
                    </button>
                </div>

                {/* History Selector if multiple roadmaps */}
                {roadmaps.length > 1 && (
                    <div className="roadmap-selector-bar">
                        <span className="selector-label">Roadmap Snapshot:</span>
                        <select
                            value={selectedRoadmap?._id || ""}
                            onChange={(e) => handleSelectRoadmap(e.target.value)}
                            className="roadmap-select"
                        >
                            {roadmaps.map(r => (
                                <option key={r._id} value={r._id}>
                                    {r.title} ({r.targetRole}) — {new Date(r.createdAt).toLocaleDateString()} {r.status === "active" ? "[Active]" : ""}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Main Content Area */}
                {loading ? (
                    <div className="workspace-loading-grid">
                        <div className="loading-card skeleton" />
                        <div className="loading-card skeleton" />
                    </div>
                ) : error ? (
                    <div className="workspace-alert workspace-alert--error">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        <div className="alert-content">
                            <strong>Failed to load roadmap data</strong>
                            <p>{error}</p>
                        </div>
                        <button type="button" className="retry-btn" onClick={loadRoadmapsList}>Retry</button>
                    </div>
                ) : !selectedRoadmap || items.length === 0 ? (
                    <div className="empty-state-card">
                        <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
                        <h3>No learning roadmap generated yet</h3>
                        <p>
                            Generate a customized learning plan tailored to the deterministic skill gaps across your tracked jobs.
                        </p>
                        <button
                            type="button"
                            className="btn-action btn-action--primary"
                            onClick={() => setShowGenModal(true)}
                        >
                            Generate First Roadmap
                        </button>
                    </div>
                ) : (
                    <div className="roadmap-content-wrapper">
                        {/* Progress Header Card */}
                        <div className="roadmap-header-card">
                            <div className="roadmap-header-info">
                                <div className="title-and-badge">
                                    <h2 className="roadmap-title">{selectedRoadmap.title}</h2>
                                    <span className="badge-active">Snapshot Active</span>
                                </div>
                                <p className="roadmap-sub">
                                    Target Role: <strong>{selectedRoadmap.targetRole}</strong> &bull; Generated on {new Date(selectedRoadmap.createdAt).toLocaleDateString()}
                                </p>
                            </div>

                            <div className="roadmap-progress-panel">
                                <div className="progress-stats">
                                    <span className="progress-pct">{percentComplete}% Complete</span>
                                    <span className="progress-count">{completedCount} of {items.length} milestones finished</span>
                                </div>
                                <div className="progress-bar">
                                    <div className="progress-bar__fill" style={{ width: `${percentComplete}%` }} />
                                </div>
                            </div>
                        </div>

                        {/* Milestones List */}
                        <div className="roadmap-milestones-list">
                            {items.map((item, idx) => (
                                <div
                                    key={item._id || idx}
                                    className={`roadmap-item-card roadmap-item-card--${item.priority} roadmap-item-card--${item.status}`}
                                >
                                    {/* Milestone Header */}
                                    <div className="milestone-top">
                                        <div className="milestone-left">
                                            <span className="milestone-number">Step {idx + 1}</span>
                                            <h3 className="milestone-skill">{item.displayName || item.canonicalSkill}</h3>
                                            <span className="milestone-category">{item.category}</span>
                                            <span className={`priority-badge priority-badge--${item.priority}`}>
                                                {item.priority}
                                            </span>
                                            <span className={`gap-status-badge gap-status-badge--${item.gapStatus}`}>
                                                {item.gapStatus}
                                            </span>
                                            {item.estimatedHours && (
                                                <span className="hours-badge">~{item.estimatedHours} hrs</span>
                                            )}
                                        </div>

                                        {/* Status Control */}
                                        <div className="milestone-status-control">
                                            <label>Progress:</label>
                                            <select
                                                value={item.status || "not_started"}
                                                onChange={(e) => handleStatusUpdate(item._id, e.target.value)}
                                                disabled={updatingItemId === item._id}
                                                className={`item-status-select item-status-select--${item.status || "not_started"}`}
                                            >
                                                {STATUS_OPTIONS.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Deterministic Gap Rationale (Read-Only) */}
                                    <div className="milestone-reason-box">
                                        <span className="reason-label">Deterministic Gap Engine Assessment:</span>
                                        <p className="reason-text">{item.reason}</p>
                                    </div>

                                    {/* Target Outcome */}
                                    <div className="milestone-section">
                                        <h4 className="section-label">Target Technical Outcome</h4>
                                        <p className="outcome-text">{item.targetOutcome}</p>
                                    </div>

                                    {/* Learning Objectives */}
                                    {item.learningObjectives && item.learningObjectives.length > 0 && (
                                        <div className="milestone-section">
                                            <h4 className="section-label">Core Learning Objectives</h4>
                                            <ul className="objectives-list">
                                                {item.learningObjectives.map((obj, i) => (
                                                    <li key={i}>{obj}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Practice Ideas */}
                                    {item.practiceIdeas && item.practiceIdeas.length > 0 && (
                                        <div className="milestone-section">
                                            <h4 className="section-label">Grounded Practice Ideas & Bridges</h4>
                                            <ul className="practice-list">
                                                {item.practiceIdeas.map((idea, i) => (
                                                    <li key={i}>{idea}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Completed Timestamp */}
                                    {item.status === "completed" && item.completedAt && (
                                        <div className="completed-timestamp">
                                            ✓ Completed on {new Date(item.completedAt).toLocaleDateString()}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            {/* Generate Roadmap Modal */}
            {showGenModal && (
                <div className="modal-backdrop" onClick={() => !generating && setShowGenModal(false)}>
                    <div className="roadmap-modal" onClick={e => e.stopPropagation()}>
                        <div className="roadmap-modal__header">
                            <h2>Generate Learning Roadmap</h2>
                            <button
                                type="button"
                                className="close-btn"
                                onClick={() => !generating && setShowGenModal(false)}
                                disabled={generating}
                            >
                                &times;
                            </button>
                        </div>

                        <form onSubmit={handleGenerate} className="roadmap-modal__form">
                            {genError && (
                                <div className="modal-alert modal-alert--error">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                    <span>{genError}</span>
                                </div>
                            )}

                            <div className="form-group">
                                <label>Target Role Title</label>
                                <input
                                    type="text"
                                    value={genTargetRole}
                                    onChange={e => setGenTargetRole(e.target.value)}
                                    placeholder="e.g. Senior Cloud Architect"
                                    disabled={generating}
                                />
                                <span className="field-hint">Defaults to your profile's target role or latest job title.</span>
                            </div>

                            <div className="form-group">
                                <label>Roadmap Snapshot Title (Optional)</label>
                                <input
                                    type="text"
                                    value={genTitle}
                                    onChange={e => setGenTitle(e.target.value)}
                                    placeholder="e.g. Q2 2026 Platform Engineer Roadmap"
                                    disabled={generating}
                                />
                            </div>

                            <div className="generation-info-box">
                                <p>
                                    <strong>How this works:</strong> The deterministic gap engine calculates missing and partial skills across your tracked jobs.
                                    AI generates practical learning objectives and practice projects bridging your verified demonstrated skills.
                                </p>
                            </div>

                            {generating && (
                                <div className="generating-status">
                                    <span className="spinner" />
                                    <div className="generating-text">
                                        <strong>Synthesizing Career Roadmap...</strong>
                                        <p>Analyzing deterministic skill gaps and generating grounded learning objectives.</p>
                                    </div>
                                </div>
                            )}

                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => setShowGenModal(false)}
                                    disabled={generating}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    disabled={generating}
                                >
                                    {generating ? "Generating..." : "Generate Roadmap"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LearningRoadmap;
