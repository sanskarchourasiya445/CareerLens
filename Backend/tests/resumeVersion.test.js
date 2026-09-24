const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const app = require("../src/app");
const { connectTestDB, clearTestDB, disconnectTestDB, createDummyPdfBuffer } = require("./setup");

describe("ResumeVersion Architecture & IDOR Isolation Suite", () => {
    let userACookie;
    let userBCookie;

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
                username: "usera_resume",
                email: "usera_resume@example.com",
                password: "Password123!"
            });
        userACookie = userARes.headers["set-cookie"];

        // Register User B
        const userBRes = await request(app)
            .post("/api/auth/register")
            .send({
                username: "userb_resume",
                email: "userb_resume@example.com",
                password: "Password123!"
            });
        userBCookie = userBRes.headers["set-cookie"];
    });

    it("should successfully upload and create a reusable ResumeVersion", async () => {
        const pdfBuffer = createDummyPdfBuffer(
            "Alice Smith Senior Software Architect\nSpecialized in React, Node.js, Express, MongoDB, and AWS cloud solutions\nLed engineering teams."
        );

        const res = await request(app)
            .post("/api/resumes")
            .set("Cookie", userACookie)
            .field("title", "Frontend & Full Stack Resume (v1)")
            .attach("resume", pdfBuffer, "alice_resume.pdf");

        assert.strictEqual(res.status, 201);
        assert.strictEqual(res.body.success, true);
        assert.ok(res.body.resumeVersion);
        assert.strictEqual(res.body.resumeVersion.title, "Frontend & Full Stack Resume (v1)");
        assert.strictEqual(res.body.resumeVersion.originalFilename, "alice_resume.pdf");
        assert.ok(res.body.resumeVersion.readableCharCount >= 50);
        assert.ok(res.body.resumeVersion.extractedText.includes("Alice Smith"));
    });

    it("should list all resume versions belonging to the authenticated user", async () => {
        const buffer1 = createDummyPdfBuffer("Resume version one with sufficient readable characters exceeding fifty count.");
        const buffer2 = createDummyPdfBuffer("Resume version two with different experiences and technical specializations exceeding fifty count.");

        await request(app)
            .post("/api/resumes")
            .set("Cookie", userACookie)
            .field("title", "Resume v1")
            .attach("resume", buffer1, "v1.pdf");

        await request(app)
            .post("/api/resumes")
            .set("Cookie", userACookie)
            .field("title", "Resume v2")
            .attach("resume", buffer2, "v2.pdf");

        const listRes = await request(app)
            .get("/api/resumes")
            .set("Cookie", userACookie);

        assert.strictEqual(listRes.status, 200);
        assert.strictEqual(listRes.body.success, true);
        assert.strictEqual(listRes.body.resumeVersions.length, 2);
    });

    it("should PREVENT IDOR: User B must not access User A's private resume version", async () => {
        const buffer = createDummyPdfBuffer("Confidential resume of User A containing proprietary experience and qualifications.");

        const createRes = await request(app)
            .post("/api/resumes")
            .set("Cookie", userACookie)
            .attach("resume", buffer, "private_resume.pdf");

        const resumeId = createRes.body.resumeVersion._id;

        // User B attempts to fetch User A's resume
        const idorGetRes = await request(app)
            .get(`/api/resumes/${resumeId}`)
            .set("Cookie", userBCookie);

        assert.strictEqual(idorGetRes.status, 404);
        assert.strictEqual(idorGetRes.body.success, false);

        // User B attempts to delete User A's resume
        const idorDelRes = await request(app)
            .delete(`/api/resumes/${resumeId}`)
            .set("Cookie", userBCookie);

        assert.strictEqual(idorDelRes.status, 404);
        assert.strictEqual(idorDelRes.body.success, false);
    });

    it("should reject resume uploads lacking sufficient readable characters (< 50)", async () => {
        const shortBuffer = createDummyPdfBuffer("Too short");

        const res = await request(app)
            .post("/api/resumes")
            .set("Cookie", userACookie)
            .attach("resume", shortBuffer, "short.pdf");

        assert.strictEqual(res.status, 400);
        assert.strictEqual(res.body.success, false);
        assert.match(res.body.message, /minimum 50 readable characters/i);
    });
});
