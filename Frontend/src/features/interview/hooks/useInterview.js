import {
    getAllInterviewReports,
    generateInterviewReport,
    getInterviewReportById,
    generateResumePdf,
    getResumeVersions,
    uploadResumeVersion,
    deleteResumeVersion,
    getJobs,
    createJob,
    deleteJob
} from "../services/interview.api";
import { useContext, useEffect, useState, useCallback } from "react";
import { InterviewContext } from "../interview.context";
import { useParams } from "react-router";

export const useInterview = () => {
    const context = useContext(InterviewContext);
    const { interviewId } = useParams();
    const [error, setError] = useState(null);

    if (!context) {
        throw new Error("useInterview must be used within an InterviewProvider");
    }

    const {
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
    } = context;

    const fetchResumes = useCallback(async () => {
        try {
            const data = await getResumeVersions();
            if (data && data.resumeVersions) {
                setResumes(data.resumeVersions);
                return data.resumeVersions;
            }
            return [];
        } catch (err) {
            return [];
        }
    }, [setResumes]);

    const uploadResume = async ({ file, title }) => {
        setLoading(true);
        setError(null);
        setLoadingStage("Reading resume and extracting document text...");
        try {
            const data = await uploadResumeVersion({ file, title });
            await fetchResumes();
            return data.resumeVersion;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
            setLoadingStage("");
        }
    };

    const removeResume = async (id) => {
        try {
            await deleteResumeVersion(id);
            setResumes(prev => prev.filter(r => r._id !== id));
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const fetchJobs = useCallback(async () => {
        try {
            const data = await getJobs();
            if (data && data.jobs) {
                setJobs(data.jobs);
                return data.jobs;
            }
            return [];
        } catch (err) {
            return [];
        }
    }, [setJobs]);

    const createTargetJob = async ({ rawDescription, title, company }) => {
        setLoading(true);
        setError(null);
        setLoadingStage("Understanding job requirements and extracting competencies...");
        try {
            const data = await createJob({ rawDescription, title, company });
            await fetchJobs();
            return data.job;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
            setLoadingStage("");
        }
    };

    const removeJob = async (id) => {
        try {
            await deleteJob(id);
            setJobs(prev => prev.filter(j => j._id !== id));
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const generateReport = async (payload) => {
        setLoading(true);
        setError(null);
        setLoadingStage("Analyzing candidate evidence against job requirements...");
        try {
            const response = await generateInterviewReport(payload);
            if (response && response.interviewReport) {
                setReport(response.interviewReport);
                // Refresh list in background
                getAllInterviewReports().then(d => {
                    if (d?.interviewReports) setReports(d.interviewReports);
                }).catch(() => {});
                return response.interviewReport;
            }
            throw new Error("Invalid report response received from server.");
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
            setLoadingStage("");
        }
    };

    const getReportById = async (id) => {
        setLoading(true);
        setError(null);
        try {
            const response = await getInterviewReportById(id);
            if (response && response.interviewReport) {
                setReport(response.interviewReport);
                return response.interviewReport;
            }
            throw new Error("Report not found.");
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const getReports = useCallback(async () => {
        try {
            const response = await getAllInterviewReports();
            if (response && response.interviewReports) {
                setReports(response.interviewReports);
                return response.interviewReports;
            }
            return [];
        } catch (err) {
            return [];
        }
    }, [setReports]);

    const getResumePdf = async (interviewReportId) => {
        setLoading(true);
        setError(null);
        try {
            const response = await generateResumePdf({ interviewReportId });
            const url = window.URL.createObjectURL(new Blob([response], { type: "application/pdf" }));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `resume_${interviewReportId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setError(err.message);
            alert(err.message || "Failed to download resume PDF.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (interviewId) {
            getReportById(interviewId).catch(() => {});
        } else {
            getReports();
            fetchResumes();
            fetchJobs();
        }
    }, [interviewId, getReports, fetchResumes, fetchJobs]);

    return {
        loading,
        loadingStage,
        error,
        setError,
        report,
        reports,
        resumes,
        jobs,
        fetchResumes,
        uploadResume,
        removeResume,
        fetchJobs,
        createTargetJob,
        removeJob,
        generateReport,
        getReportById,
        getReports,
        getResumePdf
    };
};