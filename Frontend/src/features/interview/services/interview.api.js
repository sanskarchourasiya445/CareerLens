import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
});

/**
 * @description Service to generate interview report based on user self description, resume and job description.
 */
export const generateInterviewReport = async ({ jobDescription, selfDescription, resumeFile }) => {
    try {
        const formData = new FormData();
        formData.append("jobDescription", jobDescription);
        if (selfDescription) {
            formData.append("selfDescription", selfDescription);
        }
        if (resumeFile) {
            formData.append("resume", resumeFile);
        }

        const response = await api.post("/api/interview/", formData, {
            headers: {
                "Content-Type": "multipart/form-data"
            }
        });

        return response.data;
    } catch (err) {
        const message = err.response?.data?.message || err.message || "Failed to generate interview strategy.";
        throw new Error(message);
    }
};

/**
 * @description Service to get interview report by interviewId.
 */
export const getInterviewReportById = async (interviewId) => {
    try {
        const response = await api.get(`/api/interview/report/${interviewId}`);
        return response.data;
    } catch (err) {
        const message = err.response?.data?.message || err.message || "Interview report not found or could not be loaded.";
        throw new Error(message);
    }
};

/**
 * @description Service to get all interview reports of logged in user.
 */
export const getAllInterviewReports = async () => {
    try {
        const response = await api.get("/api/interview/");
        return response.data;
    } catch (err) {
        const message = err.response?.data?.message || err.message || "Failed to retrieve your previous interview plans.";
        throw new Error(message);
    }
};

/**
 * @description Service to generate resume pdf based on user self description, resume content and job description.
 */
export const generateResumePdf = async ({ interviewReportId }) => {
    try {
        const response = await api.post(`/api/interview/resume/pdf/${interviewReportId}`, null, {
            responseType: "blob"
        });

        return response.data;
    } catch (err) {
        // If response is a blob containing error JSON, parse it
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