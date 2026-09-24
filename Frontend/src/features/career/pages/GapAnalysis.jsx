import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import WorkspaceNav from "../../../components/WorkspaceNav";
import { getGaps } from "../../../services/careerApi";
import "../style/workspace.scss";

const GapAnalysis = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [gapData, setGapData] = useState(null);
    const [filterPriority, setFilterPriority] = useState("all");

    const loadGaps = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getGaps();
            setGapData(data);
        } catch (err) {
            setError(err.message || "Failed to load career gap analysis.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadGaps();
    }, []);

    const isInsufficient = gapData && gapData.status === "insufficient_data";
    const gaps = gapData?.gaps || [];
    const matchedSkills = gapData?.matchedSkills || [];

    const filteredGaps = gaps.filter(g => {
        if (filterPriority === "all") return true;
        return g.priority === filterPriority;
    });

    const criticalCount = gaps.filter(g => g.priority === "critical").length;
    const highCount = gaps.filter(g => g.priority === "high").length;
    const medLowCount = gaps.filter(g => g.priority === "medium" || g.priority === "low").length;

    return (
        <div className="workspace-page">
            <WorkspaceNav />

            <main className="workspace-container">
                {/* Header Strip */}
                <div className="page-title-strip">
                    <div>
                        <h1 className="page-title">Career Gap Analysis</h1>
                        <p className="page-subtitle">
                            Deterministic gap engine calculating missing and partial competencies across your tracked jobs.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="btn-action btn-action--primary"
                        onClick={() => navigate("/roadmap")}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
                        Generate Roadmap
                    </button>
                </div>

                {/* Deterministic Disclaimer Banner */}
                <div className="deterministic-notice-banner">
                    <div className="notice-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                    </div>
                    <div className="notice-content">
                        <strong>Deterministic Intelligence Guarantee</strong>
                        <p>
                            Priorities and gap scores are computed deterministically via requirement weights,
                            candidate evidence grounding, and target-job frequency multipliers. Zero hallucinations.
                        </p>
                    </div>
                </div>

                {/* Main Content */}
                {loading ? (
                    <div className="workspace-loading-grid">
                        <div className="loading-card skeleton" />
                        <div className="loading-card skeleton" />
                        <div className="loading-card skeleton" />
                    </div>
                ) : error ? (
                    <div className="workspace-alert workspace-alert--error">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        <div className="alert-content">
                            <strong>Failed to load skill gaps</strong>
                            <p>{error}</p>
                        </div>
                        <button type="button" className="retry-btn" onClick={loadGaps}>Retry</button>
                    </div>
                ) : isInsufficient ? (
                    /* Insufficient Data State */
                    <div className="empty-state-card empty-state-card--insufficient">
                        <div className="empty-state-icon-box">
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                        </div>
                        <h2>Track a few target jobs to generate your career gap analysis.</h2>
                        <p>
                            The deterministic gap engine compares requirements across your active target roles against
                            your verified resume profile. Without target jobs, skill frequencies and gaps cannot be computed.
                        </p>
                        <button
                            type="button"
                            className="btn-action btn-action--primary"
                            onClick={() => navigate("/jobs")}
                        >
                            Go to Job Tracker &rarr;
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Summary Bar */}
                        <div className="gaps-summary-bar">
                            <div className="summary-item">
                                <span className="summary-item__label">Total Gaps</span>
                                <span className="summary-item__val">{gaps.length}</span>
                            </div>
                            <div className="summary-item">
                                <span className="summary-item__label">Critical Impact</span>
                                <span className="summary-item__val summary-item__val--danger">{criticalCount}</span>
                            </div>
                            <div className="summary-item">
                                <span className="summary-item__label">High Impact</span>
                                <span className="summary-item__val summary-item__val--warning">{highCount}</span>
                            </div>
                            <div className="summary-item">
                                <span className="summary-item__label">Matched Skills</span>
                                <span className="summary-item__val summary-item__val--success">{matchedSkills.length}</span>
                            </div>
                            <div className="summary-item">
                                <span className="summary-item__label">Evaluated Jobs</span>
                                <span className="summary-item__val">{gapData.totalJobsEvaluated || 0}</span>
                            </div>
                        </div>

                        {/* Priority Filter Tabs */}
                        <div className="filter-tabs">
                            <button
                                type="button"
                                className={`filter-tab ${filterPriority === "all" ? "filter-tab--active" : ""}`}
                                onClick={() => setFilterPriority("all")}
                            >
                                All Gaps ({gaps.length})
                            </button>
                            <button
                                type="button"
                                className={`filter-tab ${filterPriority === "critical" ? "filter-tab--active" : ""}`}
                                onClick={() => setFilterPriority("critical")}
                            >
                                Critical ({criticalCount})
                            </button>
                            <button
                                type="button"
                                className={`filter-tab ${filterPriority === "high" ? "filter-tab--active" : ""}`}
                                onClick={() => setFilterPriority("high")}
                            >
                                High ({highCount})
                            </button>
                            <button
                                type="button"
                                className={`filter-tab ${filterPriority === "medium" ? "filter-tab--active" : ""}`}
                                onClick={() => setFilterPriority("medium")}
                            >
                                Medium ({gaps.filter(g => g.priority === "medium").length})
                            </button>
                            <button
                                type="button"
                                className={`filter-tab ${filterPriority === "low" ? "filter-tab--active" : ""}`}
                                onClick={() => setFilterPriority("low")}
                            >
                                Low ({gaps.filter(g => g.priority === "low").length})
                            </button>
                            <button
                                type="button"
                                className={`filter-tab ${filterPriority === "matched" ? "filter-tab--active" : ""}`}
                                onClick={() => setFilterPriority("matched")}
                            >
                                Matched Skills ({matchedSkills.length})
                            </button>
                        </div>

                        {/* Gaps List / Matched Skills View */}
                        {filterPriority === "matched" ? (
                            <div className="matched-skills-section">
                                <h2 className="section-heading">Verified Matched Competencies</h2>
                                <p className="section-subtext">
                                    These requirements from your target jobs are satisfied by grounded citations in your resume.
                                </p>

                                {matchedSkills.length === 0 ? (
                                    <div className="empty-state-card">
                                        <p>No fully matched skills yet. Upload an updated resume in the Evaluator to ground your skills.</p>
                                    </div>
                                ) : (
                                    <div className="matched-grid">
                                        {matchedSkills.map((m, idx) => (
                                            <div key={idx} className="matched-card">
                                                <div className="matched-card__header">
                                                    <span className="skill-name">{m.displayName || m.canonicalSkill}</span>
                                                    <span className="badge-matched">✓ Matched</span>
                                                </div>
                                                <span className="matched-frequency">
                                                    Required in {m.jobFrequency} of {gapData.totalJobsEvaluated} target jobs
                                                </span>
                                                {m.evidence && m.evidence.length > 0 && (
                                                    <blockquote className="evidence-quote">
                                                        "{m.evidence[0].verbatimQuote}"
                                                    </blockquote>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : filteredGaps.length === 0 ? (
                            <div className="empty-state-card">
                                <h3>No {filterPriority !== "all" ? `${filterPriority} ` : ""}skill gaps found</h3>
                                <p>Great job! There are no competencies matching this filter priority across your tracked jobs.</p>
                            </div>
                        ) : (
                            <div className="gaps-table-view">
                                {filteredGaps.map((gap, idx) => (
                                    <div key={idx} className={`gap-item-card gap-item-card--${gap.priority}`}>
                                        <div className="gap-item-card__main">
                                            <div className="gap-title-group">
                                                <h3 className="gap-skill-name">
                                                    {gap.displayName || gap.canonicalSkill}
                                                </h3>
                                                {gap.displayName !== gap.canonicalSkill && (
                                                    <span className="gap-canonical-tag">({gap.canonicalSkill})</span>
                                                )}
                                                <span className="gap-category-tag">{gap.category}</span>
                                            </div>

                                            <p className="gap-reason-text">{gap.reason}</p>

                                            {gap.gapStatus === "partial" && gap.evidence && gap.evidence.length > 0 && (
                                                <div className="partial-evidence-box">
                                                    <span className="evidence-label">Partial grounding evidence:</span>
                                                    <blockquote className="evidence-quote">
                                                        "{gap.evidence[0].verbatimQuote}"
                                                    </blockquote>
                                                </div>
                                            )}
                                        </div>

                                        <div className="gap-item-card__meta">
                                            <div className="meta-badges">
                                                <span className={`priority-badge priority-badge--${gap.priority}`}>
                                                    {gap.priority}
                                                </span>
                                                <span className={`gap-status-badge gap-status-badge--${gap.gapStatus}`}>
                                                    {gap.gapStatus}
                                                </span>
                                            </div>

                                            <div className="meta-stats">
                                                <div className="stat-row">
                                                    <span className="stat-label">Gap Score:</span>
                                                    <strong className="stat-value">{gap.gapScore}</strong>
                                                </div>
                                                <div className="stat-row">
                                                    <span className="stat-label">Frequency:</span>
                                                    <span className="stat-value">
                                                        {gap.jobFrequency} / {gapData.totalJobsEvaluated} jobs
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
};

export default GapAnalysis;
