import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    timeout: 30000,
});

// Response interceptor for centralized 401 handling on protected resources
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const url = error.config?.url || "";
        const isAuthEndpoint = url.includes("/api/auth/");

        // Broadcast unauthorized event if session has expired on a protected endpoint
        if (error.response?.status === 401 && !isAuthEndpoint && typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("rizzume:unauthorized"));
        }

        return Promise.reject(error);
    }
);

export default apiClient;
