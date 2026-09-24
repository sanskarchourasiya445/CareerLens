import React, { createContext, useState, useEffect, useCallback } from "react";
import { getMe } from "./services/auth.api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => { 
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const refreshUser = useCallback(async () => {
        try {
            const data = await getMe();
            setUser(data?.user || null);
            return data?.user || null;
        } catch {
            setUser(null);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial session hydration owned exclusively by AuthProvider on application mount
    useEffect(() => {
        refreshUser();
    }, [refreshUser]);

    // Handle session invalidation broadcasts from the canonical apiClient
    useEffect(() => {
        const handleUnauthorized = () => {
            setUser(null);
        };
        if (typeof window !== "undefined") {
            window.addEventListener("rizzume:unauthorized", handleUnauthorized);
            return () => {
                window.removeEventListener("rizzume:unauthorized", handleUnauthorized);
            };
        }
    }, []);

    return (
        <AuthContext.Provider value={{ user, setUser, loading, setLoading, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
};