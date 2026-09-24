import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../auth.context";
import { login, register, logout, getMe } from "../services/auth.api";

export const useAuth = () => {
    const context = useContext(AuthContext);
    const { user, setUser, loading, setLoading } = context;
    const [ error, setError ] = useState(null);

    const handleLogin = async ({ email, password }) => {
        setLoading(true);
        setError(null);
        try {
            const data = await login({ email, password });
            setUser(data.user);
            return { success: true };
        } catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async ({ username, email, password }) => {
        setLoading(true);
        setError(null);
        try {
            const data = await register({ username, email, password });
            setUser(data.user);
            return { success: true };
        } catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        setLoading(true);
        setError(null);
        try {
            await logout();
            setUser(null);
            return { success: true };
        } catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let isMounted = true;

        const getAndSetUser = async () => {
            try {
                const data = await getMe();
                if (isMounted) {
                    setUser(data.user || null);
                }
            } catch (err) {
                if (isMounted) {
                    setUser(null);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        getAndSetUser();

        return () => {
            isMounted = false;
        };
    }, []);

    return { user, loading, error, setError, handleRegister, handleLogin, handleLogout };
};