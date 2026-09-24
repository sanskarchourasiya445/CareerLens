import React, { useState } from "react";
import { NavLink, Link } from "react-router";
import { useAuth } from "../features/auth/hooks/useAuth";
import ProfileModal from "./ProfileModal";
import "./WorkspaceNav.scss";

const WorkspaceNav = () => {
    const { user, handleLogout } = useAuth();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <>
            <header className="workspace-header">
                <div className="workspace-header__inner">
                    {/* Brand */}
                    <div className="workspace-header__brand">
                        <Link to="/" className="brand-link">
                            <span className="brand-logo">R</span>
                            <div className="brand-text">
                                <span className="brand-title">Rizzume<span className="brand-accent">.</span></span>
                                <span className="brand-badge">Career Intelligence</span>
                            </div>
                        </Link>
                    </div>

                    {/* Navigation Links */}
                    <nav className={`workspace-header__nav ${mobileMenuOpen ? "workspace-header__nav--open" : ""}`}>
                        <NavLink
                            to="/"
                            end
                            className={({ isActive }) => `nav-item ${isActive ? "nav-item--active" : ""}`}
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                            Dashboard
                        </NavLink>
                        <NavLink
                            to="/jobs"
                            className={({ isActive }) => `nav-item ${isActive ? "nav-item--active" : ""}`}
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                            Job Tracker
                        </NavLink>
                        <NavLink
                            to="/gaps"
                            className={({ isActive }) => `nav-item ${isActive ? "nav-item--active" : ""}`}
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/></svg>
                            Gap Analysis
                        </NavLink>
                        <NavLink
                            to="/roadmap"
                            className={({ isActive }) => `nav-item ${isActive ? "nav-item--active" : ""}`}
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
                            Roadmap
                        </NavLink>
                        <NavLink
                            to="/interview"
                            className={({ isActive }) => `nav-item ${isActive ? "nav-item--active" : ""}`}
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                            Evaluator
                        </NavLink>
                    </nav>

                    {/* Actions */}
                    <div className="workspace-header__actions">
                        <button
                            type="button"
                            className="profile-btn"
                            onClick={() => setIsProfileOpen(true)}
                            title="View / Edit Career Profile"
                        >
                            <span className="profile-btn__avatar">
                                {user?.username ? user.username.charAt(0).toUpperCase() : "U"}
                            </span>
                            <span className="profile-btn__label">Profile</span>
                        </button>

                        <button
                            type="button"
                            className="logout-btn"
                            onClick={handleLogout}
                            title="Log Out"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                            <span className="logout-text">Logout</span>
                        </button>

                        {/* Mobile Toggle */}
                        <button
                            type="button"
                            className="mobile-toggle"
                            onClick={() => setMobileMenuOpen(prev => !prev)}
                            aria-label="Toggle Navigation Menu"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                {mobileMenuOpen ? (
                                    <path d="M18 6L6 18M6 6l12 12" />
                                ) : (
                                    <path d="M4 6h16M4 12h16M4 18h16" />
                                )}
                            </svg>
                        </button>
                    </div>
                </div>
            </header>

            {isProfileOpen && (
                <ProfileModal onClose={() => setIsProfileOpen(false)} />
            )}
        </>
    );
};

export default WorkspaceNav;
