import React, { useState, useEffect } from 'react';
import '../style/interview.scss';
import { useInterview } from '../hooks/useInterview.js';
import { useNavigate, useParams, Link } from 'react-router';

const NAV_ITEMS = [
    {
        id: 'evidence',
        label: 'Evidence & Matches',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="11" y1="8" x2="11" y2="14" />
                <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
        )
    },
    {
        id: 'technical',
        label: 'Technical Questions',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
            </svg>
        )
    },
    {
        id: 'behavioral',
        label: 'Behavioral Questions',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
        )
    },
    {
        id: 'roadmap',
        label: 'Preparation Roadmap',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="3 11 22 2 13 21 11 13 3 11" />
            </svg>
        )
    },
];

// ── Sub-components ────────────────────────────────────────────────────────────

const RequirementMatchCard = ({ item }) => {
    const isMissing = item.status === 'missing';
    const statusClass = `match-card--${item.status || 'missing'}`;
    const statusBadgeClass = `match-card__status--${item.status || 'missing'}`;

    return (
        <div className={`match-card ${statusClass}`}>
            <div className='match-card__header'>
                <div>
                    <h3 className='match-card__requirement'>{item.requirement}</h3>
                    <div className='match-card__meta'>
                        <span className='badge-tag'>{item.category?.replace(/_/g, ' ') || 'Requirement'}</span>
                        <span className={`badge-tag ${item.importance === 'critical' ? 'badge-tag--critical' : ''}`}>
                            {item.importance} importance
                        </span>
                        {item.isGrounded === false && !isMissing && (
                            <span className='badge-tag' style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                                Unverified Citation
                            </span>
                        )}
                    </div>
                </div>
                <span className={`match-card__status ${statusBadgeClass}`}>
                    {item.status}
                </span>
            </div>

            {/* Evidence Citation */}
            <div className={`evidence-box ${isMissing ? 'evidence-box--missing' : 'evidence-box--found'}`}>
                <span className='evidence-box__label'>
                    {isMissing ? 'Evidence Gap:' : 'Resume Evidence Citation:'}
                </span>
                {isMissing ? (
                    <p>{item.evidence || "No supporting evidence found in resume."}</p>
                ) : (
                    <blockquote>&ldquo;{item.evidence}&rdquo;</blockquote>
                )}
            </div>

            {/* AI Explanation */}
            {item.explanation && (
                <p className='match-explanation'>{item.explanation}</p>
            )}
        </div>
    );
};

const QuestionCard = ({ item, index }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className='q-card'>
            <div className='q-card__header' onClick={() => setOpen(o => !o)}>
                <span className='q-card__index'>Q{index + 1}</span>
                <p className='q-card__question'>{item.question}</p>
                <span className={`q-card__chevron ${open ? 'q-card__chevron--open' : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                </span>
            </div>
            {open && (
                <div className='q-card__body'>
                    <div className='q-card__section'>
                        <span className='q-card__tag q-card__tag--intention'>Intention</span>
                        <p>{item.intention}</p>
                    </div>
                    <div className='q-card__section'>
                        <span className='q-card__tag q-card__tag--answer'>Model Answer</span>
                        <p>{item.answer}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

const RoadMapDay = ({ day }) => (
    <div className='roadmap-day'>
        <div className='roadmap-day__header'>
            <span className='roadmap-day__badge'>Day {day.day}</span>
            <h3 className='roadmap-day__focus'>{day.focus}</h3>
        </div>
        <ul className='roadmap-day__tasks'>
            {(day.tasks || []).map((task, i) => (
                <li key={i}>
                    <span className='roadmap-day__bullet' />
                    {task}
                </li>
            ))}
        </ul>
    </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const Interview = () => {
    const [activeNav, setActiveNav] = useState('evidence');
    const [filterStatus, setFilterStatus] = useState('all'); // "all" | "matched" | "partial" | "missing"
    const [downloading, setDownloading] = useState(false);
    const { report, getReportById, loading, error, getResumePdf } = useInterview();
    const { interviewId } = useParams();

    useEffect(() => {
        if (interviewId) {
            getReportById(interviewId);
        }
    }, [interviewId]);

    const handleDownload = async () => {
        setDownloading(true);
        try {
            await getResumePdf(interviewId);
        } finally {
            setDownloading(false);
        }
    };

    if (loading) {
        return (
            <main className='loading-screen'>
                <h1>Loading your career intelligence analysis...</h1>
            </main>
        );
    }

    if (error || !report) {
        return (
            <main className='loading-screen'>
                <h1>{error || "Report not found."}</h1>
                <p style={{ marginTop: '1rem' }}>
                    <Link to='/' style={{ color: '#ff2d78' }}>&larr; Return to Dashboard</Link>
                </p>
            </main>
        );
    }

    const matchScore = typeof report.matchScore === 'number'
        ? report.matchScore
        : typeof report.deterministicScore === 'number'
            ? report.deterministicScore
            : 0;

    const scoreColor =
        matchScore >= 80 ? 'score--high' :
            matchScore >= 60 ? 'score--mid' : 'score--low';

    const scoreDescription =
        matchScore >= 80 ? 'Strong qualification match' :
            matchScore >= 60 ? 'Moderate match with addressable gaps' :
                'Critical skill gaps identified';

    const requirementMatches = report.requirementMatches || [];
    const filteredMatches = requirementMatches.filter(item => {
        if (filterStatus === 'all') return true;
        return item.status === filterStatus;
    });

    const matchedCount = requirementMatches.filter(m => m.status === 'matched').length;
    const partialCount = requirementMatches.filter(m => m.status === 'partial').length;
    const missingCount = requirementMatches.filter(m => m.status === 'missing').length;

    const technicalQuestions = report.technicalQuestions || [];
    const behavioralQuestions = report.behavioralQuestions || [];
    const skillGaps = report.skillGaps || [];
    const preparationPlan = report.preparationPlan || [];

    return (
        <div className='interview-page'>
            <div className='interview-layout'>

                {/* ── Left Nav ── */}
                <nav className='interview-nav'>
                    <div className="nav-content">
                        <div style={{ marginBottom: "1rem" }}>
                            <Link to='/' style={{ color: "#7d8590", textDecoration: "none", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                &larr; Back to Dashboard
                            </Link>
                        </div>
                        <p className='interview-nav__label'>Analysis Sections</p>
                        {NAV_ITEMS.map(item => (
                            <button
                                key={item.id}
                                className={`interview-nav__item ${activeNav === item.id ? 'interview-nav__item--active' : ''}`}
                                onClick={() => setActiveNav(item.id)}
                            >
                                <span className='interview-nav__icon'>{item.icon}</span>
                                {item.label}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={handleDownload}
                        disabled={downloading}
                        className='button primary-button' style={{ opacity: downloading ? 0.7 : 1 }}>
                        <svg height={"0.8rem"} style={{ marginRight: "0.8rem" }} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M10.6144 17.7956 11.492 15.7854C12.2731 13.9966 13.6789 12.5726 15.4325 11.7942L17.8482 10.7219C18.6162 10.381 18.6162 9.26368 17.8482 8.92277L15.5079 7.88394C13.7092 7.08552 12.2782 5.60881 11.5105 3.75894L10.6215 1.61673C10.2916.821765 9.19319.821767 8.8633 1.61673L7.97427 3.75892C7.20657 5.60881 5.77553 7.08552 3.97685 7.88394L1.63658 8.92277C.868537 9.26368.868536 10.381 1.63658 10.7219L4.0523 11.7942C5.80589 12.5726 7.21171 13.9966 7.99275 15.7854L8.8704 17.7956C9.20776 18.5682 10.277 18.5682 10.6144 17.7956ZM19.4014 22.6899 19.6482 22.1242C20.0882 21.1156 20.8807 20.3125 21.8695 19.8732L22.6299 19.5353C23.0412 19.3526 23.0412 18.7549 22.6299 18.5722L21.9121 18.2532C20.8978 17.8026 20.0911 16.9698 19.6586 15.9269L19.4052 15.3156C19.2285 14.8896 18.6395 14.8896 18.4628 15.3156L18.2094 15.9269C17.777 16.9698 16.9703 17.8026 15.956 18.2532L15.2381 18.5722C14.8269 18.7549 14.8269 19.3526 15.2381 19.5353L15.9985 19.8732C16.9874 20.3125 17.7798 21.1156 18.2198 22.1242L18.4667 22.6899C18.6473 23.104 19.2207 23.104 19.4014 22.6899Z"></path></svg>
                        {downloading ? "Generating PDF..." : "Download Resume"}
                    </button>
                </nav>

                <div className='interview-divider' />

                {/* ── Center Content ── */}
                <main className='interview-content'>

                    {/* Section 1: Evidence & Requirement Matching (Primary) */}
                    {activeNav === 'evidence' && (
                        <section>
                            <div className='content-header'>
                                <h2>Evidence &amp; Requirement Matches</h2>
                                <span className='content-header__count'>
                                    {matchedCount} Matched &bull; {partialCount} Partial &bull; {missingCount} Missing
                                </span>
                            </div>

                            {/* Filter Pills */}
                            <div className='filter-pills'>
                                <button
                                    onClick={() => setFilterStatus('all')}
                                    className={`filter-pill ${filterStatus === 'all' ? 'filter-pill--active' : ''}`}>
                                    All ({requirementMatches.length})
                                </button>
                                <button
                                    onClick={() => setFilterStatus('matched')}
                                    className={`filter-pill ${filterStatus === 'matched' ? 'filter-pill--active' : ''}`}>
                                    Matched ({matchedCount})
                                </button>
                                <button
                                    onClick={() => setFilterStatus('partial')}
                                    className={`filter-pill ${filterStatus === 'partial' ? 'filter-pill--active' : ''}`}>
                                    Partial ({partialCount})
                                </button>
                                <button
                                    onClick={() => setFilterStatus('missing')}
                                    className={`filter-pill ${filterStatus === 'missing' ? 'filter-pill--active' : ''}`}>
                                    Missing ({missingCount})
                                </button>
                            </div>

                            {/* Match List */}
                            <div className='match-list'>
                                {filteredMatches.length > 0 ? (
                                    filteredMatches.map((item, index) => (
                                        <RequirementMatchCard key={index} item={item} />
                                    ))
                                ) : (
                                    <p style={{ color: '#7d8590', fontStyle: 'italic', padding: '1rem 0' }}>
                                        No requirements in this category.
                                    </p>
                                )}
                            </div>
                        </section>
                    )}

                    {/* Section 2: Technical Questions */}
                    {activeNav === 'technical' && (
                        <section>
                            <div className='content-header'>
                                <h2>Technical Questions</h2>
                                <span className='content-header__count'>{technicalQuestions.length} questions</span>
                            </div>
                            <div className='q-list'>
                                {technicalQuestions.map((q, i) => (
                                    <QuestionCard key={i} item={q} index={i} />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Section 3: Behavioral Questions */}
                    {activeNav === 'behavioral' && (
                        <section>
                            <div className='content-header'>
                                <h2>Behavioral Questions</h2>
                                <span className='content-header__count'>{behavioralQuestions.length} questions</span>
                            </div>
                            <div className='q-list'>
                                {behavioralQuestions.map((q, i) => (
                                    <QuestionCard key={i} item={q} index={i} />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Section 4: Preparation Roadmap */}
                    {activeNav === 'roadmap' && (
                        <section>
                            <div className='content-header'>
                                <h2>Preparation Roadmap</h2>
                                <span className='content-header__count'>{preparationPlan.length}-day plan</span>
                            </div>
                            <div className='roadmap-list'>
                                {preparationPlan.map((day) => (
                                    <RoadMapDay key={day.day} day={day} />
                                ))}
                            </div>
                        </section>
                    )}
                </main>

                <div className='interview-divider' />

                {/* ── Right Sidebar ── */}
                <aside className='interview-sidebar' style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                    {/* Deterministic Match Score */}
                    <div className='match-score'>
                        <p className='match-score__label'>Deterministic Match Score</p>
                        <div className={`match-score__ring ${scoreColor}`}>
                            <span className='match-score__value'>{matchScore}</span>
                            <span className='match-score__pct'>%</span>
                        </div>
                        <p className='match-score__sub'>{scoreDescription}</p>
                    </div>

                    {/* Score Breakdown */}
                    {report.scoreBreakdown && (
                        <div className='score-breakdown-card'>
                            <div className='score-breakdown-card__row'>
                                <span>Core Matched:</span>
                                <strong>{matchedCount} of {requirementMatches.length}</strong>
                            </div>
                            <div className='score-breakdown-card__row'>
                                <span>Earned Weight:</span>
                                <strong>{report.scoreBreakdown.totalEarnedWeight || Math.round((matchScore/100)*40)} pts</strong>
                            </div>
                            {report.scoreBreakdown.criticalPenaltyApplied > 0 && (
                                <div className='score-breakdown-card__row' style={{ color: '#ff8585' }}>
                                    <span>Critical Gap Penalty:</span>
                                    <strong>-{report.scoreBreakdown.criticalPenaltyApplied} pts</strong>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Deterministic Product Heuristic Disclaimer */}
                    <p style={{ fontSize: '0.72rem', color: '#7d8590', lineHeight: 1.4, textAlign: 'center', margin: '0 0.5rem' }}>
                        * Fit score is a deterministic product heuristic based on requirement weights and penalties, not a scientific measurement of hiring probability.
                    </p>

                    {/* AI Score Explanation */}
                    {report.scoreExplanation && (
                        <div className='score-explanation-box'>
                            <h4 className='score-explanation-box__title'>Analysis Rationale</h4>
                            <p>{report.scoreExplanation}</p>
                        </div>
                    )}

                    <div className='sidebar-divider' />

                    {/* Skill Gaps */}
                    <div className='skill-gaps'>
                        <p className='skill-gaps__label'>Prioritized Skill Gaps</p>
                        <div className='skill-gaps__list'>
                            {skillGaps.map((gap, i) => (
                                <span key={i} className={`skill-tag skill-tag--${gap.severity || 'medium'}`}>
                                    {gap.skill}
                                </span>
                            ))}
                        </div>
                    </div>

                </aside>
            </div>
        </div>
    );
};

export default Interview;