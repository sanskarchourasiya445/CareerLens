import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Phase 4 Slice 3 — Accessibility & Modal UX Hardening Suite", () => {
    const srcDir = path.resolve(__dirname, "../src");
    const profileModalPath = path.resolve(srcDir, "components/ProfileModal.jsx");
    const workspaceNavPath = path.resolve(srcDir, "components/WorkspaceNav.jsx");
    const jobTrackerPath = path.resolve(srcDir, "features/career/pages/JobTracker.jsx");
    const learningRoadmapPath = path.resolve(srcDir, "features/career/pages/LearningRoadmap.jsx");

    const profileModalContent = fs.readFileSync(profileModalPath, "utf-8");
    const workspaceNavContent = fs.readFileSync(workspaceNavPath, "utf-8");
    const jobTrackerContent = fs.readFileSync(jobTrackerPath, "utf-8");
    const learningRoadmapContent = fs.readFileSync(learningRoadmapPath, "utf-8");

    describe("1. ProfileModal Dialog Semantics & Focus Management", () => {
        it("should define correct ARIA dialog attributes on the modal container", () => {
            assert.ok(profileModalContent.includes('role="dialog"'), "ProfileModal must have role='dialog'");
            assert.ok(profileModalContent.includes('aria-modal="true"'), "ProfileModal must have aria-modal='true'");
            assert.ok(
                profileModalContent.includes('aria-labelledby="profile-modal-title"'),
                "ProfileModal must reference title via aria-labelledby"
            );
            assert.ok(
                profileModalContent.includes('id="profile-modal-title"'),
                "ProfileModal must have an element with id='profile-modal-title'"
            );
            assert.ok(
                profileModalContent.includes('aria-describedby="profile-modal-desc"'),
                "ProfileModal must reference description via aria-describedby"
            );
            assert.ok(
                profileModalContent.includes('id="profile-modal-desc"'),
                "ProfileModal must have an element with id='profile-modal-desc'"
            );
        });

        it("should implement focus trap with Tab and Shift+Tab cycling", () => {
            assert.ok(profileModalContent.includes('const focusableSelector ='), "Must define focusable selector");
            assert.ok(profileModalContent.includes('e.key === "Tab"'), "Must handle Tab key");
            assert.ok(profileModalContent.includes("e.shiftKey"), "Must handle Shift+Tab key navigation");
            assert.ok(profileModalContent.includes("modalRef"), "Must use modalRef to trap focus within container");
        });

        it("should close on Escape key with event propagation stopped", () => {
            assert.ok(profileModalContent.includes('e.key === "Escape"'), "Must handle Escape key");
            assert.ok(profileModalContent.includes("e.stopPropagation()"), "Must stop propagation on Escape");
            assert.ok(profileModalContent.includes("onClose()"), "Must invoke onClose on Escape");
        });

        it("should lock document body scroll when open and restore on unmount", () => {
            assert.ok(
                profileModalContent.includes('document.body.style.overflow = "hidden"'),
                "Must lock body scroll"
            );
            assert.ok(
                profileModalContent.includes("document.body.style.overflow = prevOverflow"),
                "Must restore body scroll on unmount"
            );
        });

        it("should restore focus to trigger element on unmount", () => {
            assert.ok(
                profileModalContent.includes("triggerRef.current = document.activeElement"),
                "Must capture trigger element on mount"
            );
            assert.ok(
                profileModalContent.includes("triggerRef.current.focus()"),
                "Must restore focus to trigger element on unmount"
            );
        });
    });

    describe("2. WorkspaceNav Accessible Navigation & Controls", () => {
        it("should label action buttons with descriptive aria-label values", () => {
            assert.ok(
                workspaceNavContent.includes('aria-label="View or edit career profile"'),
                "Profile button must have aria-label"
            );
            assert.ok(
                workspaceNavContent.includes('aria-label="Log out of application"'),
                "Logout button must have aria-label"
            );
        });

        it("should expose ARIA state and controls for mobile menu toggle", () => {
            assert.ok(
                workspaceNavContent.includes('aria-label="Toggle navigation menu"'),
                "Mobile toggle must have aria-label"
            );
            assert.ok(
                workspaceNavContent.includes("aria-expanded={mobileMenuOpen}"),
                "Mobile toggle must reflect expanded state"
            );
            assert.ok(
                workspaceNavContent.includes('aria-controls="workspace-nav-links"'),
                "Mobile toggle must control workspace-nav-links"
            );
            assert.ok(
                workspaceNavContent.includes('id="workspace-nav-links"'),
                "Nav element must have matching id"
            );
            assert.ok(
                workspaceNavContent.includes('aria-label="Workspace navigation"'),
                "Nav element must have landmark label"
            );
        });
    });

    describe("3. JobTracker Modal Semantics & Action Accessibility", () => {
        it("should set ARIA dialog attributes on Track New Job modal", () => {
            assert.ok(jobTrackerContent.includes('role="dialog"'), "JobTracker modal must have role='dialog'");
            assert.ok(jobTrackerContent.includes('aria-modal="true"'), "JobTracker modal must have aria-modal='true'");
            assert.ok(
                jobTrackerContent.includes('aria-labelledby="track-job-title"'),
                "JobTracker modal must reference title via aria-labelledby"
            );
            assert.ok(
                jobTrackerContent.includes('id="track-job-title"'),
                "JobTracker modal must have an element with id='track-job-title'"
            );
            assert.ok(
                jobTrackerContent.includes('aria-label="Close track job modal"'),
                "JobTracker modal close button must have aria-label"
            );
        });

        it("should support keyboard Escape dismissal for Track New Job modal", () => {
            assert.ok(
                jobTrackerContent.includes('e.key === "Escape"'),
                "JobTracker modal must listen for Escape key"
            );
            assert.ok(
                jobTrackerContent.includes("setShowAddModal(false)"),
                "Escape key must dismiss JobTracker modal"
            );
        });

        it("should provide accessible aria-labels on job action buttons", () => {
            assert.ok(
                jobTrackerContent.includes("Edit notes for ${job.title}"),
                "Notes button must have descriptive aria-label"
            );
            assert.ok(
                jobTrackerContent.includes("Run resume match for ${job.title}"),
                "Resume match button must have descriptive aria-label"
            );
            assert.ok(
                jobTrackerContent.includes("Delete job: ${job.title}"),
                "Delete button must have descriptive aria-label"
            );
        });
    });

    describe("4. LearningRoadmap Modal Semantics & Secondary Actions", () => {
        it("should set ARIA dialog attributes on Generate Roadmap modal", () => {
            assert.ok(learningRoadmapContent.includes('role="dialog"'), "Roadmap modal must have role='dialog'");
            assert.ok(learningRoadmapContent.includes('aria-modal="true"'), "Roadmap modal must have aria-modal='true'");
            assert.ok(
                learningRoadmapContent.includes('aria-labelledby="gen-roadmap-title"'),
                "Roadmap modal must reference title via aria-labelledby"
            );
            assert.ok(
                learningRoadmapContent.includes('id="gen-roadmap-title"'),
                "Roadmap modal must have an element with id='gen-roadmap-title'"
            );
            assert.ok(
                learningRoadmapContent.includes('aria-label="Close generate roadmap modal"'),
                "Roadmap modal close button must have aria-label"
            );
        });

        it("should support keyboard Escape dismissal for Generate Roadmap modal", () => {
            assert.ok(
                learningRoadmapContent.includes('e.key === "Escape"'),
                "LearningRoadmap modal must listen for Escape key"
            );
            assert.ok(
                learningRoadmapContent.includes("setShowGenModal(false)"),
                "Escape key must dismiss Generate Roadmap modal"
            );
        });

        it("should provide contextual navigation action to Gap Analysis in empty state", () => {
            assert.ok(
                learningRoadmapContent.includes('navigate("/gaps")'),
                "Empty state should provide secondary route navigation to /gaps"
            );
            assert.ok(
                learningRoadmapContent.includes("View Skill Gaps"),
                "Empty state action text should indicate viewing skill gaps"
            );
        });
    });
});
