import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
});

// ─────────────────────────────────────────────────────────────────────────────
// Resumes API
// ─────────────────────────────────────────────────────────────────────────────

export const getResumeVersions = async () => {
    try {
        const response = await api.get("/api/resumes");
        return response.data;
    } catch (err) {
        const message = err.response?.data?.message || err.message || "Failed to load resume versions.";
        throw new Error(message);
    }
};

export const uploadResumeVersion = async ({ file, title }) => {
    try {
        const formData = new FormData();
        formData.append("resume", file);
        if (title) {
            formData.append("title", title);
        }

        const response = await api.post("/api/resumes", formData, {
            headers: { "Content-Type": "multipart/form-data" }
        });
        return response.data;
    } catch (err) {
        const message = err.response?.data?.message || err.message || "Failed to upload resume.";
        throw new Error(message);
    }
};

export const deleteResumeVersion = async (id) => {
    try {
        const response = await api.delete(`/api/resumes/${id}`);
        return response.data;
    } catch (err) {
        const message = err.response?.data?.message || err.message || "Failed to delete resume.";
        throw new Error(message);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Jobs API
// ─────────────────────────────────────────────────────────────────────────────

export const getJobs = async () => {
    try {
        const response = await api.get("/api/jobs");
        return response.data;
    } catch (err) {
        const message = err.response?.data?.message || err.message || "Failed to load target jobs.";
        throw new Error(message);
    }
};

export const createJob = async ({ rawDescription, title, company }) => {
    try {
        const response = await api.post("/api/jobs", {
            rawDescription,
            title,
            company
        });
        return response.data;
    } catch (err) {
        const message = err.response?.data?.message || err.message || "Failed to extract job requirements.";
        throw new Error(message);
    }
};

export const deleteJob = async (id) => {
    try {
        const response = await api.delete(`/api/jobs/${id}`);
        return response.data;
    } catch (err) {
        const message = err.response?.data?.message || err.message || "Failed to delete target job.";
        throw new Error(message);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Interview / Analysis API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @description Generate career intelligence analysis report.
 * Supports both reusable ({ resumeVersionId, jobId }) and one-shot (formData) modes.
 */
export const generateInterviewReport = async (payload) => {
    try {
        // Reusable Flow
        if (payload.resumeVersionId && payload.jobId) {
            const response = await api.post("/api/interview/", {
                resumeVersionId: payload.resumeVersionId,
                jobId: payload.jobId,
                selfDescription: payload.selfDescription || ""
            });
            return response.data;
        }

        // One-Shot Flow
        const formData = new FormData();
        formData.append("jobDescription", payload.jobDescription);
        if (payload.selfDescription) {
            formData.append("selfDescription", payload.selfDescription);
        }
        if (payload.resumeFile) {
            formData.append("resume", payload.resumeFile);
        }

        const response = await api.post("/api/interview/", formData, {
            headers: {
                "Content-Type": "multipart/form-data"
            }
        });

        return response.data;
    } catch (err) {
        const message = err.response?.data?.message || err.message || "Failed to generate career intelligence report.";
        throw new Error(message);
    }
};

export const getInterviewReportById = async (interviewId) => {
    try {
        const response = await api.get(`/api/interview/report/${interviewId}`);
        return response.data;
    } catch (err) {
        const message = err.response?.data?.message || err.message || "Interview report not found or could not be loaded.";
        throw new Error(message);
    }
};

export const getAllInterviewReports = async () => {
    try {
        const response = await api.get("/api/interview/");
        return response.data;
    } catch (err) {
        const message = err.response?.data?.message || err.message || "Failed to retrieve your previous interview plans.";
        throw new Error(message);
    }
};

export const generateResumePdf = async ({ interviewReportId }) => {
    try {
        const response = await api.post(`/api/interview/resume/pdf/${interviewReportId}`, null, {
            responseType: "blob"
        });

        return response.data;
    } catch (err) {
        if (err.response && err.response.data instanceof Blob) {
            try {
                const text = await err.response.data.text();
                const json = JSON.parse(text);
                throw new Error(json.message || "Failed to generate resume PDF.");
            } catch (e) {
                // fall through
            }
        }
        const message = err.response?.data?.message || err.message || "Failed to generate resume PDF.";
        throw new Error(message);
    }
};