import React, { Suspense } from "react";
import { useAuth } from "../hooks/useAuth";
import { Navigate } from "react-router";
import RouteFallback from "../../../components/RouteFallback";

const Protected = ({ children }) => {
    const { loading, user } = useAuth();

    if (loading) {
        return <RouteFallback />;
    }

    if (!user) {
        return <Navigate to="/login" />;
    }

    return (
        <Suspense fallback={<RouteFallback />}>
            {children}
        </Suspense>
    );
};

export default Protected;