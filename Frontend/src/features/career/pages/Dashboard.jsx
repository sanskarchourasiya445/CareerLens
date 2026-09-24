import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import WorkspaceNav from "../../../components/WorkspaceNav";
import { getDashboard, getGaps } from "../../../services/careerApi";
import { getJobs } from "../../../services/jobsApi";
import "../style/workspace.scss";

const Dashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dashboard, setDashboard] = useState(null);
    const [criticalGaps, setCriticalGaps] = useState([]);
    const [recentJobs, setRecentJobs] = useState([]);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [dashRes, gapsRes, jobsRes] = await Promise.allSettled([
                getDashboard(),
                getGaps(),
                getJobs()
            ]);

            if (dashRes.status === "fulfilled" && dashRes.value.dashboard) {
                setDashboard(dashRes.value.dashboard);
            } else if (dashRes.status === "rejected") {
                throw new Error(dashRes.reason.message || "Failed to load dashboard metrics.");
            }

            if (gapsRes.status === "fulfilled" && gapsRes.value.gaps) {
                const crit = gapsRes.value.gaps.filter(g => g.priority === "critical").slice(0, 3);
                setCriticalGaps(crit);
            }

            if (jobsRes.status === "fulfilled" && jobsRes.value.jobs) {
                setRecentJobs(jobsRes.value.jobs.slice(0, 4));
            }
        } catch (err) {
            setError(err.message || "Unable to load career dashboard.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const d = dashboard || {
        targetRole: "Target Role",
        totalTrackedJobs: 0,
        activePipelineCount: 0,
        demonstratedSkillCount: 0,
        criticalGapCount: 0,
        roadmapProgress: { totalItems: 0, completedItems: 0, percentComplete: 0 },
        averageMatchScore: null,
        evaluatedJobCount: 0
    };

    return (
        <div className="workspace-page">
            <WorkspaceNav />

            <main className="workspace-container">
                {/* Primary Career Context */}
                <div className="career-context-banner">
                    <div className="career-context-info">
                        <span className="context-eyebrow">CAREER COMMAND CENTER</span>
                        <h1 className="context-role">{d.targetRole || "Software Engineer"}</h1>
                        <p className="context-description">
                            Persistent intelligence workspace driven by deterministic requirement matching,
                            grounded resume evidence, and actionable skill roadmaps.
                        </p>
                    </div>

                    <div className="career-context-actions">
                        <button
                            type="button"
                            className="btn-action btn-action--primary"
                            onClick={() => navigate("/interview")}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                            Analyze Resume
                        </button>
                        <button
                            type="button"
                            className="btn-action btn-action--secondary"
                            onClick={() => navigate("/jobs")}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            Track Target Job
                        </button>
                    </div>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="workspace-alert workspace-alert--error">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        <div className="alert-content">
                            <strong>Failed to load career intelligence data</strong>
                            <p>{error}</p>
                        </div>
                        <button type="button" className="retry-btn" onClick={loadData}>Retry</button>
                    </div>
                )}

                {/* Loading State */}
                {loading ? (
                    <div className="workspace-loading-grid">
                        <div className="loading-card skeleton" />
                        <div className="loading-card skeleton" />
                        <div className="loading-card skeleton" />
                        <div className="loading-card skeleton" />
                    </div>
                ) : (
                    <>
                        {/* Compact Metrics Row */}
                        <div className="metrics-grid">
                            <Link to="/jobs" className="metric-card">
                                <div className="metric-header">
                                    <span className="metric-label">Tracked Jobs</span>
                                    <svg className="metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                                </div>
                                <div className="metric-value">{d.totalTrackedJobs}</div>
                                <span className="metric-footer">Target role pipeline &rarr;</span>
                            </Link>

                            <Link to="/jobs" className="metric-card">
                                <div className="metric-header">
                                    <span className="metric-label">Active Pipeline</span>
                                    <svg className="metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                                </div>
                                <div className="metric-value metric-value--active">{d.activePipelineCount}</div>
                                <span className="metric-footer">Applied + Interviewing &rarr;</span>
                            </Link>

                            <div className="metric-card">
                                <div className="metric-header">
                                    <span className="metric-label">Demonstrated Skills</span>
                                    <svg className="metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                </div>
                                <div className="metric-value metric-value--success">{d.demonstratedSkillCount}</div>
                                <span className="metric-footer">Verified with grounded citations</span>
                            </div>

                            <Link to="/gaps" className="metric-card">
                                <div className="metric-header">
                                    <span className="metric-label">Critical Gaps</span>
                                    <svg className="metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                </div>
                                <div className={`metric-value ${d.criticalGapCount > 0 ? "metric-value--danger" : ""}`}>
                                    {d.criticalGapCount}
                                </div>
                                <span className="metric-footer">High priority across jobs &rarr;</span>
                            </Link>
                        </div>

                        {/* Intelligence Grid */}
                        <div className="intelligence-grid">
                            {/* Match Performance Section */}
                            <div className="intel-card">
                                <div className="intel-card__header">
                                    <div className="title-with-icon">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/></svg>
                                        <h3>Match Performance</h3>
                                    </div>
                                    <span className="intel-tag">Deterministic Score</span>
                                </div>

                                <div className="intel-card__content">
                                    {d.averageMatchScore === null || d.evaluatedJobCount === 0 ? (
                                        <div className="empty-intel-box">
                                            <p className="empty-intel-text">
                                                No evaluated-job data yet. Run an analysis in the <strong>Interview Evaluator</strong> to calculate your deterministic baseline score.
                                            </p>
                                            <button
                                                type="button"
                                                className="btn-action btn-action--outline"
                                                onClick={() => navigate("/interview")}
                                            >
                                                Start Evaluation &rarr;
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="score-summary-box">
                                            <div className="score-display">
                                                <span className={`score-number ${d.averageMatchScore >= 80 ? "score--high" : d.averageMatchScore >= 60 ? "score--mid" : "score--low"}`}>
                                                    {d.averageMatchScore}%
                                                </span>
                                                <span className="score-context">
                                                    Average match: {d.averageMatchScore}% across {d.evaluatedJobCount} evaluated job{d.evaluatedJobCount === 1 ? "" : "s"}
                                                </span>
                                            </div>
                                            <p className="score-footnote">
                                                Calculated mathematically from verified requirements in your latest evaluated reports.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Roadmap Progress Section */}
                            <div className="intel-card">
                                <div className="intel-card__header">
                                    <div className="title-with-icon">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
                                        <h3>Roadmap Progress</h3>
                                    </div>
                                    <Link to="/roadmap" className="intel-link">View Full &rarr;</Link>
                                </div>

                                <div className="intel-card__content">
                                    {d.roadmapProgress.totalItems === 0 ? (
                                        <div className="empty-intel-box">
                                            <p className="empty-intel-text">
                                                No active roadmap snapshot. Generate an actionable learning plan tailored to your deterministic skill gaps.
                                            </p>
                                            <button
                                                type="button"
                                                className="btn-action btn-action--outline"
                                                onClick={() => navigate("/roadmap")}
                                            >
                                                Generate Roadmap &rarr;
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="roadmap-summary-box">
                                            <div className="progress-bar-container">
                                                <div className="progress-bar-labels">
                                                    <span>Completion</span>
                                                    <strong>{d.roadmapProgress.percentComplete}%</strong>
                                                </div>
                                                <div className="progress-bar">
                                                    <div
                                                        className="progress-bar__fill"
                                                        style={{ width: `${d.roadmapProgress.percentComplete}%` }}
                                                    />
                                                </div>
                                                <span className="progress-detail">
                                                    {d.roadmapProgress.completedItems} of {d.roadmapProgress.totalItems} milestones completed
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Critical Gaps Preview */}
                            <div className="intel-card">
                                <div className="intel-card__header">
                                    <div className="title-with-icon">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                        <h3>Critical Skill Gaps</h3>
                                    </div>
                                    <Link to="/gaps" className="intel-link">All Gaps &rarr;</Link>
                                </div>

                                <div className="intel-card__content">
                                    {criticalGaps.length === 0 ? (
                                        <div className="empty-intel-box">
                                            <p className="empty-intel-text">
                                                {d.totalTrackedJobs === 0
                                                    ? "Track target jobs to compute your deterministic skill gaps."
                                                    : "No critical skill gaps identified across your current tracked jobs."}
                                            </p>
                                            {d.totalTrackedJobs === 0 && (
                                                <button
                                                    type="button"
                                                    className="btn-action btn-action--outline"
                                                    onClick={() => navigate("/jobs")}
                                                >
                                                    Track Target Jobs &rarr;
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="gaps-preview-list">
                                            {criticalGaps.map((gap, i) => (
                                                <div key={i} className="gap-preview-item">
                                                    <div className="gap-preview-main">
                                                        <span className="gap-preview-name">{gap.displayName || gap.canonicalSkill}</span>
                                                        <span className="gap-preview-reason">{gap.reason}</span>
                                                    </div>
                                                    <span className="badge-critical">Critical</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Recent Pipeline Jobs */}
                            <div className="intel-card">
                                <div className="intel-card__header">
                                    <div className="title-with-icon">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                                        <h3>Recent Tracked Jobs</h3>
                                    </div>
                                    <Link to="/jobs" className="intel-link">Job Tracker &rarr;</Link>
                                </div>

                                <div className="intel-card__content">
                                    {recentJobs.length === 0 ? (
                                        <div className="empty-intel-box">
                                            <p className="empty-intel-text">
                                                No tracked jobs yet. Add job descriptions to start analyzing requirements and pipeline status.
                                            </p>
                                            <button
                                                type="button"
                                                className="btn-action btn-action--outline"
                                                onClick={() => navigate("/jobs")}
                                            >
                                                Add First Job &rarr;
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="jobs-preview-list">
                                            {recentJobs.map(job => (
                                                <div key={job._id} className="job-preview-item">
                                                    <div className="job-preview-main">
                                                        <span className="job-preview-title">{job.title}</span>
                                                        <span className="job-preview-company">{job.company || "Target Company"}</span>
                                                    </div>
                                                    <span className={`status-pill status-pill--${job.status || "saved"}`}>
                                                        {job.status || "saved"}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
};

export default Dashboard;
