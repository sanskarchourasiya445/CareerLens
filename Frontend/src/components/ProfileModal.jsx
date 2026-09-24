import React, { useState, useEffect } from "react";
import { getProfile, updateProfile } from "../services/careerApi";
import "./ProfileModal.scss";

const ProfileModal = ({ onClose }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    // Profile fields
    const [headline, setHeadline] = useState("");
    const [targetRole, setTargetRole] = useState("");
    const [targetRolesStr, setTargetRolesStr] = useState("");
    const [experienceLevel, setExperienceLevel] = useState("");
    const [preferredDomainsStr, setPreferredDomainsStr] = useState("");
    const [careerGoalsStr, setCareerGoalsStr] = useState("");
    const [skills, setSkills] = useState([]);

    useEffect(() => {
        let isMounted = true;
        async function loadProfileData() {
            setLoading(true);
            setError(null);
            try {
                const res = await getProfile();
                if (res && res.profile && isMounted) {
                    const p = res.profile;
                    setHeadline(p.headline || "");
                    setTargetRole(p.targetRole || "");
                    setTargetRolesStr((p.targetRoles || []).join(", "));
                    setExperienceLevel(p.experienceLevel || "");
                    setPreferredDomainsStr((p.preferredDomains || []).join(", "));
                    setCareerGoalsStr((p.careerGoals || []).join("\n"));
                    setSkills(p.skills || []);
                }
            } catch (err) {
                if (isMounted) setError(err.message || "Failed to load profile.");
            } finally {
                if (isMounted) setLoading(false);
            }
        }
        loadProfileData();
        return () => { isMounted = false; };
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const targetRoles = targetRolesStr
                .split(",")
                .map(s => s.trim())
                .filter(Boolean);

            const preferredDomains = preferredDomainsStr
                .split(",")
                .map(s => s.trim())
                .filter(Boolean);

            const careerGoals = careerGoalsStr
                .split("\n")
                .map(s => s.trim())
                .filter(Boolean);

            const payload = {
                headline: headline.trim(),
                targetRole: targetRole.trim(),
                targetRoles,
                experienceLevel: experienceLevel || undefined,
                preferredDomains,
                careerGoals
            };

            await updateProfile(payload);
            setSuccessMessage("Career profile updated successfully.");
            setTimeout(() => {
                setSuccessMessage(null);
            }, 3000);
        } catch (err) {
            setError(err.message || "Failed to update profile.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="profile-modal" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="profile-modal__header">
                    <div className="modal-title-group">
                        <h2>Career Profile</h2>
                        <span className="modal-subtitle">Configure your career identity, target roles, and review verified skills.</span>
                    </div>
                    <button type="button" className="close-btn" onClick={onClose} aria-label="Close modal">
                        &times;
                    </button>
                </div>

                {/* Body */}
                <div className="profile-modal__body">
                    {loading ? (
                        <div className="modal-loading">
                            <span className="spinner" />
                            <p>Loading career profile...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSave} className="profile-form">
                            {error && (
                                <div className="modal-alert modal-alert--error">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                    <span>{error}</span>
                                </div>
                            )}
                            {successMessage && (
                                <div className="modal-alert modal-alert--success">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                    <span>{successMessage}</span>
                                </div>
                            )}

                            {/* Core Identity */}
                            <div className="form-section">
                                <h3 className="section-title">Career Identity</h3>

                                <div className="form-group">
                                    <label htmlFor="prof-headline">Career Headline</label>
                                    <input
                                        id="prof-headline"
                                        type="text"
                                        value={headline}
                                        onChange={e => setHeadline(e.target.value)}
                                        placeholder="e.g. Distributed Systems Engineer | High-Throughput Node.js & React"
                                        maxLength={200}
                                    />
                                    <span className="field-hint">A concise summary of your professional expertise.</span>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="prof-targetRole">Primary Target Role</label>
                                        <input
                                            id="prof-targetRole"
                                            type="text"
                                            value={targetRole}
                                            onChange={e => setTargetRole(e.target.value)}
                                            placeholder="e.g. Senior Full Stack Engineer"
                                            maxLength={100}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="prof-expLevel">Established Experience Level</label>
                                        <select
                                            id="prof-expLevel"
                                            value={experienceLevel}
                                            onChange={e => setExperienceLevel(e.target.value)}
                                        >
                                            <option value="">Not set</option>
                                            <option value="entry">Entry Level</option>
                                            <option value="junior">Junior</option>
                                            <option value="mid">Mid Level</option>
                                            <option value="senior">Senior</option>
                                            <option value="lead">Lead</option>
                                            <option value="principal">Principal</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="prof-targetRoles">Secondary Target Roles (comma-separated)</label>
                                    <input
                                        id="prof-targetRoles"
                                        type="text"
                                        value={targetRolesStr}
                                        onChange={e => setTargetRolesStr(e.target.value)}
                                        placeholder="e.g. Backend Lead, Cloud Architect, Platform Engineer"
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="prof-domains">Preferred Domains (comma-separated)</label>
                                    <input
                                        id="prof-domains"
                                        type="text"
                                        value={preferredDomainsStr}
                                        onChange={e => setPreferredDomainsStr(e.target.value)}
                                        placeholder="e.g. FinTech, Developer Infrastructure, AI Platforms"
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="prof-goals">Career Goals (one per line)</label>
                                    <textarea
                                        id="prof-goals"
                                        rows={3}
                                        value={careerGoalsStr}
                                        onChange={e => setCareerGoalsStr(e.target.value)}
                                        placeholder="e.g. Architect distributed event-driven systems&#10;Lead engineering teams to scale to 10M+ users"
                                    />
                                </div>
                            </div>

                            {/* Verified Skills Inventory */}
                            <div className="form-section">
                                <div className="section-title-with-badge">
                                    <h3 className="section-title">Verified Skills & Provenance</h3>
                                    <span className="evidence-badge">
                                        {skills.filter(s => s.status === "demonstrated").length} Demonstrated
                                    </span>
                                </div>

                                <p className="section-description">
                                    Candidate skills are extracted from uploaded resumes and grounded in verbatim citations.
                                    Self-attesting skills without evidence is disabled to protect evaluation integrity.
                                </p>

                                {skills.length === 0 ? (
                                    <div className="empty-skills-notice">
                                        <p>No candidate skills extracted yet. Upload a resume in the <strong>Evaluator</strong> to ground your skills.</p>
                                    </div>
                                ) : (
                                    <div className="skills-inventory-list">
                                        {skills.map((skill, idx) => (
                                            <div key={idx} className={`skill-inventory-card skill-inventory-card--${skill.status}`}>
                                                <div className="skill-inventory-card__header">
                                                    <div className="skill-name-group">
                                                        <span className="skill-name">{skill.displayName || skill.canonicalName}</span>
                                                        {skill.displayName !== skill.canonicalName && (
                                                            <span className="canonical-tag">({skill.canonicalName})</span>
                                                        )}
                                                        <span className="category-tag">{skill.category}</span>
                                                    </div>
                                                    <span className={`status-badge status-badge--${skill.status}`}>
                                                        {skill.status}
                                                    </span>
                                                </div>

                                                {skill.evidence && skill.evidence.length > 0 ? (
                                                    <div className="evidence-quotes">
                                                        {skill.evidence.map((ev, evIdx) => (
                                                            <blockquote key={evIdx} className="evidence-quote">
                                                                <span className="quote-mark">“</span>
                                                                {ev.verbatimQuote}
                                                                <span className="grounded-indicator" title={ev.isGrounded ? "Grounded in resume text" : "Unverified citation"}>
                                                                    {ev.isGrounded ? "✓ Grounded" : "⚠ Unverified"}
                                                                </span>
                                                            </blockquote>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="no-evidence-text">No grounded evidence citations attached.</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Footer Submit */}
                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={onClose}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary" disabled={saving}>
                                    {saving ? "Saving Changes..." : "Save Profile"}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfileModal;
