import { createBrowserRouter } from "react-router";
import Login from "./features/auth/pages/Login";
import Register from "./features/auth/pages/Register";
import Protected from "./features/auth/components/Protected";
import Dashboard from "./features/career/pages/Dashboard";
import JobTracker from "./features/career/pages/JobTracker";
import GapAnalysis from "./features/career/pages/GapAnalysis";
import LearningRoadmap from "./features/career/pages/LearningRoadmap";
import Home from "./features/interview/pages/Home";
import Interview from "./features/interview/pages/Interview";

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