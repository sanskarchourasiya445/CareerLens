import React, { lazy } from "react";
import { createBrowserRouter } from "react-router";
import Protected from "./features/auth/components/Protected";

// Lazy-loaded route components for code splitting & initial bundle optimization
const Login = lazy(() => import("./features/auth/pages/Login"));
const Register = lazy(() => import("./features/auth/pages/Register"));
const Dashboard = lazy(() => import("./features/career/pages/Dashboard"));
const JobTracker = lazy(() => import("./features/career/pages/JobTracker"));
const GapAnalysis = lazy(() => import("./features/career/pages/GapAnalysis"));
const LearningRoadmap = lazy(() => import("./features/career/pages/LearningRoadmap"));
const Home = lazy(() => import("./features/interview/pages/Home"));
const Interview = lazy(() => import("./features/interview/pages/Interview"));

export const router = createBrowserRouter([
    {
        path: "/login",
        element: <Login />
    },
    {
        path: "/register",
        element: <Register />
    },
    {
        path: "/",
        element: <Protected><Dashboard /></Protected>
    },
    {
        path: "/jobs",
        element: <Protected><JobTracker /></Protected>
    },
    {
        path: "/gaps",
        element: <Protected><GapAnalysis /></Protected>
    },
    {
        path: "/roadmap",
        element: <Protected><LearningRoadmap /></Protected>
    },
    {
        path: "/interview",
        element: <Protected><Home /></Protected>
    },
    {
        path: "/interview/:interviewId",
        element: <Protected><Interview /></Protected>
    }
]);