import { getAllInterviewReports, generateInterviewReport, getInterviewReportById, generateResumePdf } from "../services/interview.api"
import { useContext, useEffect, useState } from "react"
import { InterviewContext } from "../interview.context"
import { useParams } from "react-router"

export const useInterview = () => {
    const context = useContext(InterviewContext)
    const { interviewId } = useParams()
    const [ error, setError ] = useState(null)

    if (!context) {
        throw new Error("useInterview must be used within an InterviewProvider")
    }

    const { loading, setLoading, report, setReport, reports, setReports } = context

    const generateReport = async ({ jobDescription, selfDescription, resumeFile }) => {
        setLoading(true)
        setError(null)
        try {
            const response = await generateInterviewReport({ jobDescription, selfDescription, resumeFile })
            if (response && response.interviewReport) {
                setReport(response.interviewReport)
                return response.interviewReport
            }
            throw new Error("Invalid report response received from server.")
        } catch (err) {
            setError(err.message)
            throw err
        } finally {
            setLoading(false)
        }
    }

    const getReportById = async (id) => {
        setLoading(true)
        setError(null)
        try {
            const response = await getInterviewReportById(id)
            if (response && response.interviewReport) {
                setReport(response.interviewReport)
                return response.interviewReport
            }
            throw new Error("Report not found.")
        } catch (err) {
            setError(err.message)
            throw err
        } finally {
            setLoading(false)
        }
    }

    const getReports = async () => {
        setLoading(true)
        setError(null)
        try {
            const response = await getAllInterviewReports()
            if (response && response.interviewReports) {
                setReports(response.interviewReports)
                return response.interviewReports
            }
            return []
        } catch (err) {
            setError(err.message)
            return []
        } finally {
            setLoading(false)
        }
    }

    const getResumePdf = async (interviewReportId) => {
        setLoading(true)
        setError(null)
        try {
            const response = await generateResumePdf({ interviewReportId })
            const url = window.URL.createObjectURL(new Blob([ response ], { type: "application/pdf" }))
            const link = document.createElement("a")
            link.href = url
            link.setAttribute("download", `resume_${interviewReportId}.pdf`)
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)
        } catch (err) {
            setError(err.message)
            alert(err.message || "Failed to download resume PDF.")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (interviewId) {
            getReportById(interviewId).catch(() => {})
        } else {
            getReports().catch(() => {})
        }
    }, [ interviewId ])

    return { loading, error, setError, report, reports, generateReport, getReportById, getReports, getResumePdf }
}