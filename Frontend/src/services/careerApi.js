import apiClient from "./apiClient";

/**
 * @description Fetch deterministic career dashboard metrics
 */
export async function getDashboard() {
    try {
        const response = await apiClient.get("/api/career/dashboard");
        return response.data;
    } catch (err) {
        const message = err.response?.data?.message || err.message || "Failed to load dashboard metrics.";
        throw new Error(message);
    }
}

/**
 * @description Fetch deterministic skill gaps
 */
export async function getGaps() {
    try {
        const response = await apiClient.get("/api/career/gaps");
        return response.data;
    } catch (err) {
        const message = err.response?.data?.message || err.message || "Failed to load skill gaps.";
        throw new Error(message);
    }
}

/**
 * @description Fetch user's 1:1 CareerProfile
 */
export async function getProfile() {
    try {
        const response = await apiClient.get("/api/career/profile");
        return response.data;
    } catch (err) {
        const message = err.response?.data?.message || err.message || "Failed to load career profile.";
        throw new Error(message);
    }
}

/**
 * @description Update user's 1:1 CareerProfile
 */
export async function updateProfile(data) {
    try {
        const response = await apiClient.put("/api/career/profile", data);
        return response.data;
    } catch (err) {
        const message = err.response?.data?.message || err.message || "Failed to update career profile.";
        throw new Error(message);
    }
}
