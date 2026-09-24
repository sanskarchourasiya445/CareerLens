import React, { useState, useRef } from 'react'
import "../style/home.scss"
import { useInterview } from '../hooks/useInterview.js'
import { useAuth } from '../../auth/hooks/useAuth.js'
import { useNavigate } from 'react-router'

const Home = () => {
    const { loading, error: apiError, generateReport, reports } = useInterview()
    const { user, handleLogout } = useAuth()
    const [ jobDescription, setJobDescription ] = useState("")
    const [ selfDescription, setSelfDescription ] = useState("")
    const [ selectedFile, setSelectedFile ] = useState(null)
    const [ localError, setLocalError ] = useState(null)
    const resumeInputRef = useRef()

    const navigate = useNavigate()

    const formatFileSize = (bytes) => {
        if (!bytes) return "0 KB"
        const kb = bytes / 1024
        if (kb < 1024) return `${Math.round(kb)} KB`
        return `${(kb / 1024).toFixed(1)} MB`
    }

    const handleFileChange = (e) => {
        const file = e.target.files[0]
        if (!file) return

        if (!file.name.toLowerCase().endsWith(".pdf")) {
            setLocalError("Only PDF resume files are supported. Please select a .pdf file.")
            setSelectedFile(null)
            if (resumeInputRef.current) resumeInputRef.current.value = ""
            return
        }

        if (file.size > 5 * 1024 * 1024) {
            setLocalError("File size exceeds 5MB. Please choose a smaller PDF.")
            setSelectedFile(null)
            if (resumeInputRef.current) resumeInputRef.current.value = ""
            return
        }

        setLocalError(null)
        setSelectedFile(file)
    }

    const handleRemoveFile = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setSelectedFile(null)
        if (resumeInputRef.current) {
            resumeInputRef.current.value = ""
        }
    }

    const handleGenerateReport = async () => {
        setLocalError(null)

        if (!jobDescription.trim() || jobDescription.trim().length < 10) {
            setLocalError("Please provide a target job description (minimum 10 characters).")
            return
        }

        if (!selectedFile && (!selfDescription || selfDescription.trim().length < 10)) {
            setLocalError("Please provide either a resume PDF or describe your experience in the self-description field.")
            return
        }

        try {
            const data = await generateReport({
                jobDescription,
                selfDescription,
                resumeFile: selectedFile
            })
            if (data && data._id) {
                navigate(`/interview/${data._id}`)
            }
        } catch (err) {
            setLocalError(err.message || "Failed to generate report. Please try again.")
        }
    }

    const onLogout = async () => {
        await handleLogout()
        navigate('/login')
    }

    if (loading) {
        return (
            <main className='loading-screen'>
                <h1>Analyzing resume &amp; generating your interview plan...</h1>
                <p style={{ marginTop: '1rem', color: '#7d8590' }}>This may take approximately 20-30 seconds.</p>
            </main>
        )
    }

    const activeError = localError || apiError

    return (
        <div className='home-page'>

            {/* Top Bar with User Info and Logout */}
            <div className='home-top-bar'>
                {user && (
                    <span className='user-greeting'>
                        Logged in as <strong>{user.username}</strong>
                    </span>
                )}
                <button onClick={onLogout} className='logout-button'>Log Out</button>
            </div>

            {/* Page Header */}
            <header className='page-header'>
                <h1>Create Your Custom <span className='highlight'>Interview Plan</span></h1>
                <p>Let our AI analyze the job requirements and your unique profile to build a winning strategy.</p>
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

                    {/* Left Panel - Job Description */}
                    <div className='panel panel--left'>
                        <div className='panel__header'>
                            <span className='panel__icon'>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
                            </span>
                            <h2>Target Job Description</h2>
                            <span className='badge badge--required'>Required</span>
                        </div>
                        <textarea
                            value={jobDescription}
                            onChange={(e) => { setJobDescription(e.target.value) }}
                            className='panel__textarea'
                            placeholder={`Paste the full job description here...\ne.g. 'Senior Frontend Engineer at Google requires proficiency in React, TypeScript, and large-scale system design...'`}
                            maxLength={5000}
                        />
                        <div className='char-counter'>{jobDescription.length} / 5000 chars</div>
                    </div>

                    {/* Vertical Divider */}
                    <div className='panel-divider' />

                    {/* Right Panel - Profile */}
                    <div className='panel panel--right'>
                        <div className='panel__header'>
                            <span className='panel__icon'>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                            </span>
                            <h2>Your Profile</h2>
                        </div>

                        {/* Upload Resume */}
                        <div className='upload-section'>
                            <label className='section-label'>
                                Upload Resume
                                <span className='badge badge--best'>Best Results</span>
                            </label>
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
                                        <p className='dropzone__title'>Click to upload or drag &amp; drop</p>
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

                        {/* OR Divider */}
                        <div className='or-divider'><span>OR</span></div>

                        {/* Quick Self-Description */}
                        <div className='self-description'>
                            <label className='section-label' htmlFor='selfDescription'>Quick Self-Description</label>
                            <textarea
                                value={selfDescription}
                                onChange={(e) => { setSelfDescription(e.target.value) }}
                                id='selfDescription'
                                name='selfDescription'
                                className='panel__textarea panel__textarea--short'
                                placeholder="Briefly describe your experience, key skills, and years of experience if you don't have a resume handy..."
                            />
                        </div>

                        {/* Info Box */}
                        <div className='info-box'>
                            <span className='info-box__icon'>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" stroke="#1a1f27" strokeWidth="2" /><line x1="12" y1="16" x2="12.01" y2="16" stroke="#1a1f27" strokeWidth="2" /></svg>
                            </span>
                            <p>Either a <strong>Resume PDF</strong> or a <strong>Self Description</strong> is required to generate a personalized plan.</p>
                        </div>
                    </div>
                </div>

                {/* Card Footer */}
                <div className='interview-card__footer'>
                    <span className='footer-info'>AI-Powered Strategy Generation &bull; Approx 20-30s</span>
                    <button
                        onClick={handleGenerateReport}
                        className='generate-btn'>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" /></svg>
                        Generate My Interview Strategy
                    </button>
                </div>
            </div>

            {/* Recent Reports List */}
            {reports && reports.length > 0 && (
                <section className='recent-reports'>
                    <h2>My Recent Interview Plans</h2>
                    <ul className='reports-list'>
                        {reports.map(reportItem => (
                            <li key={reportItem._id} className='report-item' onClick={() => navigate(`/interview/${reportItem._id}`)}>
                                <h3>{reportItem.title || 'Untitled Position'}</h3>
                                <p className='report-meta'>Generated on {new Date(reportItem.createdAt).toLocaleDateString()}</p>
                                <p className={`match-score ${reportItem.matchScore >= 80 ? 'score--high' : reportItem.matchScore >= 60 ? 'score--mid' : 'score--low'}`}>Match Score: {reportItem.matchScore}%</p>
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
    )
}

export default Home