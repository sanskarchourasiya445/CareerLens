import React from "react";
import "./RouteFallback.scss";

const RouteFallback = () => (
    <div className="route-fallback-container" role="status" aria-live="polite">
        <div className="route-fallback-spinner" aria-hidden="true" />
        <span className="route-fallback-text">Loading workspace module...</span>
    </div>
);

export default RouteFallback;
