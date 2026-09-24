const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const app = require("../src/app");
const { connectTestDB, clearTestDB, disconnectTestDB } = require("./setup");

describe("Authentication & Token Blacklist Security Suite", () => {
    before(async () => {
        await connectTestDB();
    });

    after(async () => {
        await disconnectTestDB();
    });

    beforeEach(async () => {
        await clearTestDB();
    });

    it("should successfully register a new user and set auth cookie", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send({
                username: "testcandidate",
                email: "candidate@example.com",
                password: "SecurePassword123!"
            });

        assert.strictEqual(res.status, 201);
        assert.strictEqual(res.body.success, true);
        assert.strictEqual(res.body.user.username, "testcandidate");
        assert.strictEqual(res.body.user.email, "candidate@example.com");
        assert.ok(!res.body.user.password, "Password should not be returned in response");

        // Verify cookie is set
        const cookies = res.headers["set-cookie"];
        assert.ok(cookies && cookies.some(c => c.startsWith("token=")));
    });

    it("should reject registration with duplicate username or email", async () => {
        await request(app)
            .post("/api/auth/register")
            .send({
                username: "uniqueuser",
                email: "unique@example.com",
                password: "Password123"
            });

        // Duplicate username
        const dupUserRes = await request(app)
            .post("/api/auth/register")
            .send({
                username: "uniqueuser",
                email: "another@example.com",
                password: "Password123"
            });
        assert.strictEqual(dupUserRes.status, 400);
        assert.strictEqual(dupUserRes.body.success, false);

        // Duplicate email
        const dupEmailRes = await request(app)
            .post("/api/auth/register")
            .send({
                username: "differentuser",
                email: "unique@example.com",
                password: "Password123"
            });
        assert.strictEqual(dupEmailRes.status, 400);
        assert.strictEqual(dupEmailRes.body.success, false);
    });

    it("should reject password shorter than 6 characters", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send({
                username: "shortpwd",
                email: "short@example.com",
                password: "123"
            });

        assert.strictEqual(res.status, 400);
        assert.strictEqual(res.body.success, false);
        assert.match(res.body.message, /at least 6 characters/i);
    });

    it("should login with valid credentials and reject invalid credentials", async () => {
        await request(app)
            .post("/api/auth/register")
            .send({
                username: "loginuser",
                email: "login@example.com",
                password: "CorrectPassword123"
            });

        // Valid login
        const loginRes = await request(app)
            .post("/api/auth/login")
            .send({
                email: "login@example.com",
                password: "CorrectPassword123"
            });

        assert.strictEqual(loginRes.status, 200);
        assert.strictEqual(loginRes.body.success, true);
        assert.strictEqual(loginRes.body.user.email, "login@example.com");

        // Invalid password
        const badLoginRes = await request(app)
            .post("/api/auth/login")
            .send({
                email: "login@example.com",
                password: "WrongPassword"
            });

        assert.strictEqual(badLoginRes.status, 400);
        assert.strictEqual(badLoginRes.body.success, false);
    });

    it("should reject unauthenticated access to protected routes", async () => {
        const res = await request(app).get("/api/auth/get-me");
        assert.strictEqual(res.status, 401);
        assert.strictEqual(res.body.success, false);
    });

    it("should allow authenticated access via cookie or Bearer token", async () => {
        const regRes = await request(app)
            .post("/api/auth/register")
            .send({
                username: "beareruser",
                email: "bearer@example.com",
                password: "Password123"
            });

        const cookie = regRes.headers["set-cookie"];
        const token = cookie[0].split(";")[0].split("=")[1];

        // Access with Cookie
        const cookieRes = await request(app)
            .get("/api/auth/get-me")
            .set("Cookie", cookie);
        assert.strictEqual(cookieRes.status, 200);
        assert.strictEqual(cookieRes.body.user.username, "beareruser");

        // Access with Authorization: Bearer header
        const bearerRes = await request(app)
            .get("/api/auth/get-me")
            .set("Authorization", `Bearer ${token}`);
        assert.strictEqual(bearerRes.status, 200);
        assert.strictEqual(bearerRes.body.user.username, "beareruser");
    });

    it("should invalidate token on logout and reject subsequent requests with blacklisted token", async () => {
        const regRes = await request(app)
            .post("/api/auth/register")
            .send({
                username: "logoutuser",
                email: "logout@example.com",
                password: "Password123"
            });

        const cookie = regRes.headers["set-cookie"];
        const token = cookie[0].split(";")[0].split("=")[1];

        // Unauthenticated logout attempt must be rejected (Phase 1 fix)
        const unauthLogout = await request(app).post("/api/auth/logout");
        assert.strictEqual(unauthLogout.status, 401);

        // Old insecure GET /logout must be removed/rejected with 404 (Phase 1 fix)
        const oldGetLogout = await request(app).get("/api/auth/logout");
        assert.strictEqual(oldGetLogout.status, 404);

        // Authenticated POST logout succeeds
        const logoutRes = await request(app)
            .post("/api/auth/logout")
            .set("Cookie", cookie);

        assert.strictEqual(logoutRes.status, 200);
        assert.strictEqual(logoutRes.body.success, true);

        // Subsequent request with the logged-out token must be rejected
        const afterLogoutRes = await request(app)
            .get("/api/auth/get-me")
            .set("Cookie", cookie);

        assert.strictEqual(afterLogoutRes.status, 401);
        assert.match(afterLogoutRes.body.message, /invalidated/i);
    });
});
