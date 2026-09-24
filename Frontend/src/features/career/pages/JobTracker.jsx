import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import WorkspaceNav from "../../../components/WorkspaceNav";
import { getJobs, createJob, updateJob, deleteJob } from "../../../services/jobsApi";
import "../style/workspace.scss";

const CANONICAL_STATUSES = [
    { value: "saved", label: "Saved" },
    { value: "applied", label: "Applied" },
    { value: "interviewing", label: "Interviewing" },
    { value: "offer", label: "Offer" },
    { value: "rejected", label: "Rejected" },
    { value: "archived", label: "Archived" }
];

const JobTracker = () => {
    const navigate = useNavigate();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [updatingId, setUpdatingId] = useState(null);

    // Filter by status tab
    const [selectedTab, setSelectedTab] = useState("all");

    // Add Job Form modal / toggle
    const [showAddModal, setShowAddModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [newJob, setNewJob] = useState({
        title: "",
        company: "",
        targetRole: "",
        rawDescription: "",
        status: "saved",
        applicationDate: "",
        sourceUrl: "",
        notes: ""
    });

    // Edit notes / details inline
    const [expandedJobId, setExpandedJobId] = useState(null);
    const [editingNotes, setEditingNotes] = useState("");

    const loadJobs = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getJobs();
            setJobs(data.jobs || []);
        } catch (err) {
            setError(err.message || "Failed to load tracked jobs.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadJobs();
    }, []);

    const handleStatusChange = async (jobId, newStatus) => {
        setUpdatingId(jobId);
        try {
            await updateJob(jobId, { status: newStatus });
            setJobs(prev => prev.map(j => (j._id === jobId ? { ...j, status: newStatus } : j)));
        } catch (err) {
            alert(err.message || "Failed to update job status.");
        } finally {
            setUpdatingId(null);
        }
    };

    const handleSaveNotes = async (jobId) => {
        setUpdatingId(jobId);
        try {
            await updateJob(jobId, { notes: editingNotes });
            setJobs(prev => prev.map(j => (j._id === jobId ? { ...j, notes: editingNotes } : j)));
            setExpandedJobId(null);
        } catch (err) {
            alert(err.message || "Failed to update job notes.");
        } finally {
            setUpdatingId(null);
        }
    };

    const handleDelete = async (jobId) => {
        if (!window.confirm("Are you sure you want to remove this job from your tracker?")) return;
        try {
            await deleteJob(jobId);
            setJobs(prev => prev.filter(j => j._id !== jobId));
        } catch (err) {
            alert(err.message || "Failed to delete job.");
        }
    };

    const handleCreateJob = async (e) => {
        e.preventDefault();
        if (!newJob.title.trim() || !newJob.rawDescription.trim()) {
            alert("Job title and job description are required.");
            return;
        }

        setSubmitting(true);
        try {
            const res = await createJob({
                title: newJob.title.trim(),
                company: newJob.company.trim() || "Target Company",
                targetRole: newJob.targetRole.trim() || undefined,
                rawDescription: newJob.rawDescription.trim(),
                status: newJob.status,
                applicationDate: newJob.applicationDate ? new Date(newJob.applicationDate) : undefined,
                sourceUrl: newJob.sourceUrl.trim() || undefined,
                notes: newJob.notes.trim() || undefined
            });

            if (res.job) {
                setJobs(prev => [res.job, ...prev]);
            } else {
                await loadJobs();
            }

            setShowAddModal(false);
            setNewJob({
                title: "",
                company: "",
                targetRole: "",
                rawDescription: "",
                status: "saved",
                applicationDate: "",
                sourceUrl: "",
                notes: ""
            });
        } catch (err) {
            alert(err.message || "Failed to create job.");
        } finally {
            setSubmitting(false);
        }
    };

    const filteredJobs = jobs.filter(j => {
        if (selectedTab === "all") return true;
        if (selectedTab === "active") return j.status === "applied" || j.status === "interviewing";
        return j.status === selectedTab;
    });

    return (
        <div className="workspace-page">
            <WorkspaceNav />

            <main className="workspace-container">
                {/* Header Strip */}
                <div className="page-title-strip">
                    <div>
                        <h1 className="page-title">Job Tracker</h1>
                        <p className="page-subtitle">
                            Track target job postings, application lifecycles, and interview pipeline status.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="btn-action btn-action--primary"
                        onClick={() => setShowAddModal(true)}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Track New Job
                    </button>
                </div>

                {/* Filter Tabs */}
                <div className="filter-tabs">
                    <button
                        type="button"
                        className={`filter-tab ${selectedTab === "all" ? "filter-tab--active" : ""}`}
                        onClick={() => setSelectedTab("all")}
                    >
                        All ({jobs.length})
                    </button>
                    <button
                        type="button"
                        className={`filter-tab ${selectedTab === "active" ? "filter-tab--active" : ""}`}
                        onClick={() => setSelectedTab("active")}
                    >
                        Active Pipeline ({jobs.filter(j => j.status === "applied" || j.status === "interviewing").length})
                    </button>
                    {CANONICAL_STATUSES.map(s => {
                        const count = jobs.filter(j => j.status === s.value).length;
                        return (
                            <button
                                key={s.value}
                                type="button"
                                className={`filter-tab ${selectedTab === s.value ? "filter-tab--active" : ""}`}
                                onClick={() => setSelectedTab(s.value)}
                            >
                                {s.label} ({count})
                            </button>
                        );
                    })}
                </div>

                {/* Main Content Area */}
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
                            <strong>Failed to load tracked jobs</strong>
                            <p>{error}</p>
                        </div>
                        <button type="button" className="retry-btn" onClick={loadJobs}>Retry</button>
                    </div>
                ) : filteredJobs.length === 0 ? (
                    <div className="empty-state-card">
                        <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                        <h3>No tracked jobs found</h3>
                        <p>
                            {selectedTab === "all"
                                ? "You haven't tracked any jobs yet. Add target postings to monitor application progress and uncover career skill gaps."
                                : `No jobs currently marked as "${selectedTab}".`}
                        </p>
                        <button
                            type="button"
                            className="btn-action btn-action--primary"
                            onClick={() => setShowAddModal(true)}
                        >
                            Track a Job Now
                        </button>
                    </div>
                ) : (
                    <div className="jobs-list">
                        {filteredJobs.map(job => (
                            <div key={job._id} className="job-card">
                                <div className="job-card__header">
                                    <div className="job-card__title-box">
                                        <h2 className="job-title">{job.title}</h2>
                                        <div className="job-meta">
                                            <span className="job-company">{job.company || "Target Company"}</span>
                                            {job.targetRole && job.targetRole !== job.title && (
                                                <span className="job-target-role">Role: {job.targetRole}</span>
                                            )}
                                            {job.applicationDate && (
                                                <span className="job-date">
                                                    Applied: {new Date(job.applicationDate).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Status Controls */}
                                    <div className="job-card__status-box">
                                        <select
                                            className={`status-select status-select--${job.status || "saved"}`}
                                            value={job.status || "saved"}
                                            onChange={(e) => handleStatusChange(job._id, e.target.value)}
                                            disabled={updatingId === job._id}
                                        >
                                            {CANONICAL_STATUSES.map(s => (
                                                <option key={s.value} value={s.value}>
                                                    {s.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Body / Notes Preview */}
                                <div className="job-card__body">
                                    {job.sourceUrl && (
                                        <div className="job-source-link">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                                            <a href={job.sourceUrl} target="_blank" rel="noopener noreferrer">
                                                {job.sourceUrl}
                                            </a>
                                        </div>
                                    )}

                                    {expandedJobId === job._id ? (
                                        <div className="job-notes-editor">
                                            <label>Tracking Notes:</label>
                                            <textarea
                                                rows={3}
                                                value={editingNotes}
                                                onChange={(e) => setEditingNotes(e.target.value)}
                                                placeholder="Add interview stages, recruiter contacts, or referral details..."
                                            />
                                            <div className="notes-actions">
                                                <button
                                                    type="button"
                                                    className="btn-tiny btn-tiny--secondary"
                                                    onClick={() => setExpandedJobId(null)}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn-tiny btn-tiny--primary"
                                                    onClick={() => handleSaveNotes(job._id)}
                                                    disabled={updatingId === job._id}
                                                >
                                                    {updatingId === job._id ? "Saving..." : "Save Notes"}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="job-notes-display">
                                            {job.notes ? (
                                                <p className="notes-text">{job.notes}</p>
                                            ) : (
                                                <p className="notes-empty">No notes added.</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Actions Footer */}
                                <div className="job-card__footer">
                                    <div className="footer-links">
                                        <button
                                            type="button"
                                            className="link-action"
                                            onClick={() => {
                                                setExpandedJobId(job._id);
                                                setEditingNotes(job.notes || "");
                                            }}
                                        >
                                            {job.notes ? "Edit Notes" : "+ Add Notes"}
                                        </button>

                                        <button
                                            type="button"
                                            className="link-action link-action--evaluate"
                                            onClick={() => navigate("/interview")}
                                        >
                                            Run Resume Match &rarr;
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        className="btn-delete"
                                        onClick={() => handleDelete(job._id)}
                                        title="Delete Job"
                                    >
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Track New Job Modal */}
            {showAddModal && (
                <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
                    <div className="job-modal" onClick={e => e.stopPropagation()}>
                        <div className="job-modal__header">
                            <h2>Track New Job</h2>
                            <button type="button" className="close-btn" onClick={() => setShowAddModal(false)}>&times;</button>
                        </div>

                        <form onSubmit={handleCreateJob} className="job-modal__form">
                            <div className="form-group">
                                <label>Job Title *</label>
                                <input
                                    type="text"
                                    required
                                    value={newJob.title}
                                    onChange={e => setNewJob({ ...newJob, title: e.target.value })}
                                    placeholder="e.g. Senior Backend Engineer"
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Company</label>
                                    <input
                                        type="text"
                                        value={newJob.company}
                                        onChange={e => setNewJob({ ...newJob, company: e.target.value })}
                                        placeholder="e.g. Acme Corp"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Target Role (Discipline)</label>
                                    <input
                                        type="text"
                                        value={newJob.targetRole}
                                        onChange={e => setNewJob({ ...newJob, targetRole: e.target.value })}
                                        placeholder="e.g. Distributed Systems"
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Pipeline Status</label>
                                    <select
                                        value={newJob.status}
                                        onChange={e => setNewJob({ ...newJob, status: e.target.value })}
                                    >
                                        {CANONICAL_STATUSES.map(s => (
                                            <option key={s.value} value={s.value}>{s.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Application Date</label>
                                    <input
                                        type="date"
                                        value={newJob.applicationDate}
                                        onChange={e => setNewJob({ ...newJob, applicationDate: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Job Description *</label>
                                <textarea
                                    required
                                    rows={5}
                                    value={newJob.rawDescription}
                                    onChange={e => setNewJob({ ...newJob, rawDescription: e.target.value })}
                                    placeholder="Paste full job description. Requirements are automatically extracted and fed into the career gap engine..."
                                />
                            </div>

                            <div className="form-group">
                                <label>Source URL</label>
                                <input
                                    type="url"
                                    value={newJob.sourceUrl}
                                    onChange={e => setNewJob({ ...newJob, sourceUrl: e.target.value })}
                                    placeholder="https://company.com/careers/job-123"
                                />
                            </div>

                            <div className="form-group">
                                <label>Initial Notes</label>
                                <textarea
                                    rows={2}
                                    value={newJob.notes}
                                    onChange={e => setNewJob({ ...newJob, notes: e.target.value })}
                                    placeholder="Referral name, recruiter info, compensation range..."
                                />
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary" disabled={submitting}>
                                    {submitting ? "Extracting Requirements..." : "Save & Track Job"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JobTracker;
