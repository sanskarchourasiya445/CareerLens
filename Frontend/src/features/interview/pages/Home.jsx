import React, { useState, useRef } from 'react';
import "../style/home.scss";
import { useInterview } from '../hooks/useInterview.js';
import { useAuth } from '../../auth/hooks/useAuth.js';
import { useNavigate } from 'react-router';
import WorkspaceNav from '../../../components/WorkspaceNav';

const Home = () => {
    const {
        loading,
        loadingStage,
        error: apiError,
        generateReport,
        reports,
        resumes,
        jobs,
        removeResume,
        removeJob
    } = useInterview();

    const { user, handleLogout } = useAuth();
    const navigate = useNavigate();

    // Mode States
    const [jobMode, setJobMode] = useState("new"); // "new" | "saved"
    const [resumeMode, setResumeMode] = useState("upload"); // "upload" | "saved" | "self"

    // Form inputs
    const [selectedJobId, setSelectedJobId] = useState("");
    const [selectedResumeId, setSelectedResumeId] = useState("");
    const [jobDescription, setJobDescription] = useState("");
    const [selfDescription, setSelfDescription] = useState("");
    const [selectedFile, setSelectedFile] = useState(null);
    const [localError, setLocalError] = useState(null);

    const resumeInputRef = useRef();

    const formatFileSize = (bytes) => {
        if (!bytes) return "0 KB";
        const kb = bytes / 1024;
        if (kb < 1024) return `${Math.round(kb)} KB`;
        return `${(kb / 1024).toFixed(1)} MB`;
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith(".pdf")) {
            setLocalError("Only PDF resume files are supported. Please select an authentic .pdf file.");
            setSelectedFile(null);
            if (resumeInputRef.current) resumeInputRef.current.value = "";
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setLocalError("File size exceeds 5MB limit. Please upload a smaller PDF.");
            setSelectedFile(null);
            if (resumeInputRef.current) resumeInputRef.current.value = "";
            return;
        }

        setLocalError(null);
        setSelectedFile(file);
    };

    const handleRemoveFile = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedFile(null);
        if (resumeInputRef.current) {
            resumeInputRef.current.value = "";
        }
    };

    const handleGenerateReport = async () => {
        setLocalError(null);

        // 1. Reusable Mode (Selected existing Resume + existing Job)
        if (jobMode === "saved" && resumeMode === "saved") {
            if (!selectedJobId) {
                setLocalError("Please select a target job from your saved jobs.");
                return;
            }
            if (!selectedResumeId) {
                setLocalError("Please select a resume version from your saved resumes.");
                return;
            }

            try {
                const report = await generateReport({
                    jobId: selectedJobId,
                    resumeVersionId: selectedResumeId
                });
                if (report && report._id) {
                    navigate(`/interview/${report._id}`);
                }
            } catch (err) {
                setLocalError(err.message || "Failed to generate report.");
            }
            return;
        }

        // 2. One-shot / Mixed Mode
        const finalJobDesc = jobMode === "saved"
            ? (jobs.find(j => j._id === selectedJobId)?.rawDescription || "")
            : jobDescription;

        if (!finalJobDesc.trim() || finalJobDesc.trim().length < 10) {
            setLocalError("Please provide a target job description (minimum 10 characters).");
            return;
        }

        if (resumeMode === "saved") {
            if (!selectedResumeId) {
                setLocalError("Please select a saved resume version.");
                return;
            }
            try {
                const report = await generateReport({
                    jobDescription: finalJobDesc,
                    resumeVersionId: selectedResumeId
                });
                if (report && report._id) {
                    navigate(`/interview/${report._id}`);
                }
            } catch (err) {
                setLocalError(err.message || "Failed to generate report.");
            }
            return;
        }

        if (!selectedFile && (!selfDescription || selfDescription.trim().length < 10)) {
            setLocalError("Please provide either a readable resume PDF or a self-description (minimum 10 characters).");
            return;
        }

        try {
            const report = await generateReport({
                jobDescription: finalJobDesc,
                selfDescription,
                resumeFile: selectedFile
            });
            if (report && report._id) {
                navigate(`/interview/${report._id}`);
            }
        } catch (err) {
            setLocalError(err.message || "Failed to generate report. Please try again.");
        }
    };

    const onLogout = async () => {
        await handleLogout();
        navigate('/login');
    };

    if (loading) {
        return (
            <main className='loading-screen'>
                <h1>{loadingStage || "Analyzing evidence & computing your match score..."}</h1>
                <p style={{ marginTop: '1rem', color: '#7d8590' }}>
                    Extracting requirements, matching resume citations, and calculating deterministic readiness.
                </p>
            </main>
        );
    }

    const activeError = localError || apiError;

    return (
        <div style={{ width: "100%", minHeight: "100vh", backgroundColor: "#0d1117" }}>
            <WorkspaceNav />
            <div className='home-page' style={{ minHeight: "calc(100vh - 65px)", paddingTop: "1.5rem" }}>

            {/* Page Header */}
            <header className='page-header'>
                <h1>Evidence-Based <span className='highlight'>Career Intelligence</span></h1>
                <p>Ground your interview preparation in deterministic requirement matches and verified resume evidence.</p>
            </header>

            {/* Error Banner */}
            {activeError && (
                <div className='home-error-banner' role='alert'>
                    <span>{activeError}</span>
                    <button
                        onClick={() => setLocalError(null)}
                        style={{ background: 'none', border: 'none', color: '#ff8585', cursor: 'pointer', fontWeight: 'bold' }}>
                        &times;
                    </button>
                </div>
            )}

            {/* Main Card */}
            <div className='interview-card'>
                <div className='interview-card__body'>

                    {/* Left Panel - Job Requirements */}
                    <div className='panel panel--left'>
                        <div className='panel__header'>
                            <span className='panel__icon'>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
                            </span>
                            <h2>Target Job</h2>
                            <span className='badge badge--required'>Required</span>
                        </div>

                        {/* Job Mode Toggle */}
                        {jobs && jobs.length > 0 && (
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <button
                                    type='button'
                                    onClick={() => setJobMode("new")}
                                    style={{
                                        flex: 1,
                                        padding: '0.4rem 0.6rem',
                                        fontSize: '0.8rem',
                                        borderRadius: '0.4rem',
                                        border: '1px solid #2a3348',
                                        background: jobMode === "new" ? '#ff2d78' : '#1c2230',
                                        color: '#e6edf3',
                                        cursor: 'pointer'
                                    }}>
                                    New Job Description
                                </button>
                                <button
                                    type='button'
                                    onClick={() => setJobMode("saved")}
                                    style={{
                                        flex: 1,
                                        padding: '0.4rem 0.6rem',
                                        fontSize: '0.8rem',
                                        borderRadius: '0.4rem',
                                        border: '1px solid #2a3348',
                                        background: jobMode === "saved" ? '#ff2d78' : '#1c2230',
                                        color: '#e6edf3',
                                        cursor: 'pointer'
                                    }}>
                                    Saved Jobs ({jobs.length})
                                </button>
                            </div>
                        )}

                        {jobMode === "saved" && jobs && jobs.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <label style={{ fontSize: '0.85rem', color: '#7d8590' }}>Select Target Job:</label>
                                <select
                                    value={selectedJobId}
                                    onChange={(e) => setSelectedJobId(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.6rem',
                                        background: '#1e2535',
                                        border: '1px solid #2a3348',
                                        borderRadius: '0.4rem',
                                        color: '#e6edf3'
                                    }}>
                                    <option value=''>-- Choose a saved target job --</option>
                                    {jobs.map(j => (
                                        <option key={j._id} value={j._id}>
                                            {j.title} ({j.structuredRequirements?.length || 0} requirements)
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <>
                                <textarea
                                    value={jobDescription}
                                    onChange={(e) => { setJobDescription(e.target.value) }}
                                    className='panel__textarea'
                                    placeholder={`Paste the target job description here...\ne.g. 'Senior Frontend Engineer requiring React, TypeScript, GraphQL, CI/CD, and system design expertise...'`}
                                    maxLength={5000}
                                />
                                <div className='char-counter'>{jobDescription.length} / 5000 chars</div>
                            </>
                        )}
                    </div>

                    {/* Vertical Divider */}
                    <div className='panel-divider' />

                    {/* Right Panel - Candidate Profile & Resume */}
                    <div className='panel panel--right'>
                        <div className='panel__header'>
                            <span className='panel__icon'>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                            </span>
                            <h2>Resume &amp; Evidence</h2>
                        </div>

                        {/* Resume Mode Toggle */}
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <button
                                type='button'
                                onClick={() => setResumeMode("upload")}
                                style={{
                                    flex: 1,
                                    padding: '0.4rem 0.6rem',
                                    fontSize: '0.8rem',
                                    borderRadius: '0.4rem',
                                    border: '1px solid #2a3348',
                                    background: resumeMode === "upload" ? '#ff2d78' : '#1c2230',
                                    color: '#e6edf3',
                                    cursor: 'pointer'
                                }}>
                                Upload PDF
                            </button>
                            {resumes && resumes.length > 0 && (
                                <button
                                    type='button'
                                    onClick={() => setResumeMode("saved")}
                                    style={{
                                        flex: 1,
                                        padding: '0.4rem 0.6rem',
                                        fontSize: '0.8rem',
                                        borderRadius: '0.4rem',
                                        border: '1px solid #2a3348',
                                        background: resumeMode === "saved" ? '#ff2d78' : '#1c2230',
                                        color: '#e6edf3',
                                        cursor: 'pointer'
                                    }}>
                                    Saved ({resumes.length})
                                </button>
                            )}
                            <button
                                type='button'
                                onClick={() => setResumeMode("self")}
                                style={{
                                    flex: 1,
                                    padding: '0.4rem 0.6rem',
                                    fontSize: '0.8rem',
                                    borderRadius: '0.4rem',
                                    border: '1px solid #2a3348',
                                    background: resumeMode === "self" ? '#ff2d78' : '#1c2230',
                                    color: '#e6edf3',
                                    cursor: 'pointer'
                                }}>
                                Self-Describe
                            </button>
                        </div>

                        {resumeMode === "saved" && resumes && resumes.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <label style={{ fontSize: '0.85rem', color: '#7d8590' }}>Select Saved Resume Version:</label>
                                <select
                                    value={selectedResumeId}
                                    onChange={(e) => setSelectedResumeId(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.6rem',
                                        background: '#1e2535',
                                        border: '1px solid #2a3348',
                                        borderRadius: '0.4rem',
                                        color: '#e6edf3'
                                    }}>
                                    <option value=''>-- Choose a saved resume version --</option>
                                    {resumes.map(r => (
                                        <option key={r._id} value={r._id}>
                                            {r.title} ({formatFileSize(r.fileSize)})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : resumeMode === "upload" ? (
                            <div className='upload-section'>
                                <label className={`dropzone ${selectedFile ? 'dropzone--selected' : ''}`} htmlFor='resume'>
                                    {selectedFile ? (
                                        <div className='selected-file-info'>
                                            <span className='dropzone__icon'>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3fb950" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                            </span>
                                            <p className='selected-file-info__name' title={selectedFile.name}>{selectedFile.name}</p>
                                            <p className='selected-file-info__size'>{formatFileSize(selectedFile.size)}</p>
                                            <button onClick={handleRemoveFile} className='selected-file-info__remove'>Remove file</button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className='dropzone__icon'>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /></svg>
                                            </span>
                                            <p className='dropzone__title'>Click to upload resume PDF</p>
                                            <p className='dropzone__subtitle'>PDF only (Max 5MB)</p>
                                        </>
                                    )}
                                    <input
                                        ref={resumeInputRef}
                                        onChange={handleFileChange}
                                        hidden
                                        type='file'
                                        id='resume'
                                        name='resume'
                                        accept='.pdf,application/pdf'
                                    />
                                </label>
                            </div>
                        ) : (
                            <div className='self-description'>
                                <textarea
                                    value={selfDescription}
                                    onChange={(e) => { setSelfDescription(e.target.value) }}
                                    id='selfDescription'
                                    name='selfDescription'
                                    className='panel__textarea panel__textarea--short'
                                    placeholder="Describe your relevant experience, technical stack, and achievements..."
                                />
                            </div>
                        )}

                        {/* Info Box */}
                        <div className='info-box'>
                            <span className='info-box__icon'>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" stroke="#1a1f27" strokeWidth="2" /><line x1="12" y1="16" x2="12.01" y2="16" stroke="#1a1f27" strokeWidth="2" /></svg>
                            </span>
                            <p>Every analysis extracts verbatim resume citations and calculates a <strong>deterministic</strong> match score.</p>
                        </div>
                    </div>
                </div>

                {/* Card Footer */}
                <div className='interview-card__footer'>
                    <span className='footer-info'>Deterministic Scoring &bull; Evidence Grounding</span>
                    <button
                        onClick={handleGenerateReport}
                        className='generate-btn'>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" /></svg>
                        Analyze Career Intelligence
                    </button>
                </div>
            </div>

            {/* Recent Reports List */}
            {reports && reports.length > 0 && (
                <section className='recent-reports'>
                    <h2>My Recent Analyses</h2>
                    <ul className='reports-list'>
                        {reports.map(reportItem => (
                            <li key={reportItem._id} className='report-item' onClick={() => navigate(`/interview/${reportItem._id}`)}>
                                <h3>{reportItem.title || 'Untitled Position'}</h3>
                                <p className='report-meta'>Analyzed on {new Date(reportItem.createdAt).toLocaleDateString()}</p>
                                <p className={`match-score ${reportItem.matchScore >= 80 ? 'score--high' : reportItem.matchScore >= 60 ? 'score--mid' : 'score--low'}`}>
                                    Deterministic Score: {reportItem.matchScore}%
                                </p>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {/* Page Footer */}
            <footer className='page-footer'>
                <a href='#'>Privacy Policy</a>
                <a href='#'>Terms of Service</a>
                <a href='#'>Help Center</a>
            </footer>
        </div>
    </div>
    );
};

export default Home;