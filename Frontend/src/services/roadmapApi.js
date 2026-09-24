import apiClient from "./apiClient";

/**
 * @description Fetch all learning roadmaps for authenticated user
 */
export async function getRoadmaps() {
    try {
        const response = await apiClient.get("/api/roadmaps");
        return response.data;
    } catch (err) {
        const message = err.response?.data?.message || err.message || "Failed to load learning roadmaps.";
        throw new Error(message);
    }
}

/**
 * @description Fetch single learning roadmap by ID
 */
export async function getRoadmapById(id) {
    try {
        const response = await apiClient.get(`/api/roadmaps/${id}`);
        return response.data;
    } catch (err) {
        const message = err.response?.data?.message || err.message || "Failed to load learning roadmap.";
        throw new Error(message);
    }
}

/**
 * @description Generate and persist a new snapshot LearningRoadmap
 */
export async function createRoadmap({ targetRole, title }) {
    try {
        const response = await apiClient.post("/api/roadmaps", { targetRole, title });
        return response.data;
    } catch (err) {
        const message = err.response?.data?.message || err.message || "Failed to generate learning roadmap.";
        throw new Error(message);
    }
}

/**
 * @description Update roadmap item progress status
 * Status must be one of: not_started | in_progress | completed | skipped
 * Deterministic metadata fields are strictly prohibited from being modified.
 */
export async function updateRoadmapItem(roadmapId, itemId, { status }) {
    try {
        const response = await apiClient.patch(`/api/roadmaps/${roadmapId}/items/${itemId}`, { status });
        return response.data;
    } catch (err) {
        const message = err.response?.data?.message || err.message || "Failed to update roadmap item status.";
        throw new Error(message);
    }
}
