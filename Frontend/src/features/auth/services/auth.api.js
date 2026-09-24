import axios from "axios"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true
})

export async function register({ username, email, password }) {
    try {
        const response = await api.post('/api/auth/register', {
            username, email, password
        })
        return response.data
    } catch (err) {
        const message = err.response?.data?.message || "Registration failed. Please check your information and try again."
        throw new Error(message)
    }
}

export async function login({ email, password }) {
    try {
        const response = await api.post("/api/auth/login", {
            email, password
        })
        return response.data
    } catch (err) {
        const message = err.response?.data?.message || "Login failed. Please verify your email and password."
        throw new Error(message)
    }
}

export async function logout() {
    try {
        // Authenticated POST logout per Phase 1 security specifications
        const response = await api.post("/api/auth/logout")
        return response.data
    } catch (err) {
        const message = err.response?.data?.message || "Logout failed."
        throw new Error(message)
    }
}

export async function getMe() {
    try {
        const response = await api.get("/api/auth/get-me")
        return response.data
    } catch (err) {
        // If not logged in / 401, return null user cleanly without throwing console errors
        if (err.response && err.response.status === 401) {
            return { user: null }
        }
        const message = err.response?.data?.message || "Failed to retrieve user profile."
        throw new Error(message)
    }
}
