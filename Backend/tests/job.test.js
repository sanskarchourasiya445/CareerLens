const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const app = require("../src/app");
const { connectTestDB, clearTestDB, disconnectTestDB } = require("./setup");

describe("Job Architecture & Structured Requirements Suite", () => {
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

        const userARes = await request(app)
            .post("/api/auth/register")
            .send({
                username: "usera_job",
                email: "usera_job@example.com",
                password: "Password123!"
            });
        userACookie = userARes.headers["set-cookie"];

        const userBRes = await request(app)
            .post("/api/auth/register")
            .send({
                username: "userb_job",
                email: "userb_job@example.com",
                password: "Password123!"
            });
        userBCookie = userBRes.headers["set-cookie"];
    });

    it("should extract structured requirements and save a reusable Job entity", async () => {
        const jd = "Senior Full Stack Engineer at HighTech Inc. We require strong experience in React, Node.js, TypeScript, and distributed systems.";

        const res = await request(app)
            .post("/api/jobs")
            .set("Cookie", userACookie)
            .send({
                rawDescription: jd,
                company: "HighTech Inc"
            });

        assert.strictEqual(res.status, 201);
        assert.strictEqual(res.body.success, true);
        assert.ok(res.body.job);
        assert.strictEqual(res.body.job.company, "HighTech Inc");
        assert.ok(Array.isArray(res.body.job.structuredRequirements));
        assert.ok(res.body.job.structuredRequirements.length >= 1);
        assert.ok(res.body.job.structuredRequirements[0].requirement);
        assert.ok(res.body.job.structuredRequirements[0].category);
        assert.ok(res.body.job.structuredRequirements[0].importance);
    });

    it("should list all jobs owned by the authenticated user", async () => {
        await request(app)
            .post("/api/jobs")
            .set("Cookie", userACookie)
            .send({ rawDescription: "First job posting looking for backend developers with Node and MongoDB experience." });

        await request(app)
            .post("/api/jobs")
            .set("Cookie", userACookie)
            .send({ rawDescription: "Second job posting looking for frontend developers with React and Next.js experience." });

        const listRes = await request(app)
            .get("/api/jobs")
            .set("Cookie", userACookie);

        assert.strictEqual(listRes.status, 200);
        assert.strictEqual(listRes.body.success, true);
        assert.strictEqual(listRes.body.jobs.length, 2);
    });

    it("should PREVENT IDOR: User B must not access or delete User A's private job", async () => {
        const createRes = await request(app)
            .post("/api/jobs")
            .set("Cookie", userACookie)
            .send({ rawDescription: "Confidential internal engineering requirements at Private Enterprise." });

        const jobId = createRes.body.job._id;

        // User B attempts GET
        const idorGet = await request(app)
            .get(`/api/jobs/${jobId}`)
            .set("Cookie", userBCookie);

        assert.strictEqual(idorGet.status, 404);
        assert.strictEqual(idorGet.body.success, false);

        // User B attempts DELETE
        const idorDel = await request(app)
            .delete(`/api/jobs/${jobId}`)
            .set("Cookie", userBCookie);

        assert.strictEqual(idorDel.status, 404);
        assert.strictEqual(idorDel.body.success, false);
    });

    it("should reject job creation if job description is shorter than 10 characters", async () => {
        const res = await request(app)
            .post("/api/jobs")
            .set("Cookie", userACookie)
            .send({ rawDescription: "Too short" });

        assert.strictEqual(res.status, 400);
        assert.strictEqual(res.body.success, false);
        assert.match(res.body.message, /minimum 10 characters/i);
    });
});
