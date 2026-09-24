const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const app = require("../src/app");
const { connectTestDB, clearTestDB, disconnectTestDB, createDummyPdfBuffer } = require("./setup");

describe("Authorization & IDOR Vulnerability Prevention Suite", () => {
    let userACookie;
    let userBCookie;
    let userAReportId;

    before(async () => {
        await connectTestDB();
    });

    after(async () => {
        await disconnectTestDB();
    });

    beforeEach(async () => {
        await clearTestDB();

        // Register User A
        const userARes = await request(app)
            .post("/api/auth/register")
            .send({
                username: "userA",
                email: "userA@example.com",
                password: "PasswordA123!"
            });
        userACookie = userARes.headers["set-cookie"];

        // Register User B
        const userBRes = await request(app)
            .post("/api/auth/register")
            .send({
                username: "userB",
                email: "userB@example.com",
                password: "PasswordB123!"
            });
        userBCookie = userBRes.headers["set-cookie"];

        // User A creates an interview report
        const reportRes = await request(app)
            .post("/api/interview/")
            .set("Cookie", userACookie)
            .field("jobDescription", "Senior Full Stack Engineer requiring React, Node, and MongoDB expertise.")
            .attach("resume", createDummyPdfBuffer("Jane Doe Senior Software Engineer React Node MongoDB"), "resume.pdf");

        assert.strictEqual(reportRes.status, 201);
        userAReportId = reportRes.body.interviewReport._id;
        assert.ok(userAReportId);
    });

    it("should allow the report owner (User A) to retrieve their own report", async () => {
        const res = await request(app)
            .get(`/api/interview/report/${userAReportId}`)
            .set("Cookie", userACookie);

        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.success, true);
        assert.strictEqual(res.body.interviewReport._id, userAReportId);
    });

    it("should PREVENT IDOR: User B must not access User A's private report and receive clean 404", async () => {
        // User B attempts to access User A's report ID
        const res = await request(app)
            .get(`/api/interview/report/${userAReportId}`)
            .set("Cookie", userBCookie);

        // Must return 404 to avoid leaking existence of the report
        assert.strictEqual(res.status, 404);
        assert.strictEqual(res.body.success, false);
        assert.match(res.body.message, /not found/i);
    });

    it("should return clean 404 for a nonexistent report ID", async () => {
        const fakeId = "60c72b2f9b1d8b2badbee555";
        const res = await request(app)
            .get(`/api/interview/report/${fakeId}`)
            .set("Cookie", userACookie);

        assert.strictEqual(res.status, 404);
        assert.strictEqual(res.body.success, false);
    });

    it("should PREVENT IDOR in PDF generation: User B cannot download User A's resume PDF", async () => {
        // User B attempts to trigger PDF generation for User A's report
        const res = await request(app)
            .post(`/api/interview/resume/pdf/${userAReportId}`)
            .set("Cookie", userBCookie);

        assert.strictEqual(res.status, 404);
        assert.strictEqual(res.body.success, false);
    });

    it("should reject unauthenticated PDF download and report access with 401", async () => {
        const reportRes = await request(app).get(`/api/interview/report/${userAReportId}`);
        assert.strictEqual(reportRes.status, 401);

        const pdfRes = await request(app).post(`/api/interview/resume/pdf/${userAReportId}`);
        assert.strictEqual(pdfRes.status, 401);
    });
});
