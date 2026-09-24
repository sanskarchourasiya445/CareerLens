import React, { createContext, useState } from "react";

export const InterviewContext = createContext();

export const InterviewProvider = ({ children }) => {
    const [loading, setLoading] = useState(false);
    const [loadingStage, setLoadingStage] = useState("");
    const [report, setReport] = useState(null);
    const [reports, setReports] = useState([]);
    const [resumes, setResumes] = useState([]);
    const [jobs, setJobs] = useState([]);

    return (
        <InterviewContext.Provider value={{
            loading,
            setLoading,
            loadingStage,
            setLoadingStage,
            report,
            setReport,
            reports,
            setReports,
            resumes,
            setResumes,
            jobs,
            setJobs
        }}>
            {children}
        </InterviewContext.Provider>
    );
};