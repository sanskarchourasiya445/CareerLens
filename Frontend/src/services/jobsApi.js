import apiClient from "./apiClient";

/**
 * @description Fetch all tracked jobs for the authenticated user
 */
export async function getJobs() {
    try {
        const response = await apiClient.get("/api/jobs");
        return response.data;
    } catch (err) {
        const message = err.response?.data?.message || err.message || "Failed to load target jobs.";
        throw new Error(message);
    }
}

/**
 * @description Create a new job requirement entry
 */
export async function createJob(jobData) {
    try {
        const response = await apiClient.post("/api/jobs", jobData);
        return response.data;
    } catch (err) {
        const message = err.response?.data?.message || err.message || "Failed to create target job.";
        throw new Error(message);
    }
}

/**
 * @description Update job tracking status, dates, notes, and metadata
 * Status must be one of: saved | applied | interviewing | offer | rejected | archived
 */
export async function updateJob(id, updates) {
    try {
        const response = await apiClient.patch(`/api/jobs/${id}`, updates);
        return response.data;
    } catch (err) {
        const message = err.response?.data?.message || err.message || "Failed to update job tracking information.";
        throw new Error(message);
    }
}

/**
 * @description Delete a tracked job
 */
export async function deleteJob(id) {
    try {
        const response = await apiClient.delete(`/api/jobs/${id}`);
        return response.data;
    } catch (err) {
        const message = err.response?.data?.message || err.message || "Failed to delete target job.";
        throw new Error(message);
    }
}
