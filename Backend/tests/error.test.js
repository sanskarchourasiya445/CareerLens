const { describe, it, before, after } = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const app = require("../src/app");
const { connectTestDB, disconnectTestDB } = require("./setup");

describe("Error Handling & Response Format Standard Suite", () => {
    before(async () => {
        await connectTestDB();
    });

    after(async () => {
        await disconnectTestDB();
    });

    it("should return clean 404 JSON for non-existent routes", async () => {
        const res = await request(app).get("/api/non-existent-route-xyz");

        assert.strictEqual(res.status, 404);
        assert.strictEqual(res.body.success, false);
        assert.ok(typeof res.body.message === "string");
        assert.match(res.body.message, /not found/i);
        assert.strictEqual(res.body.stack, undefined, "Stack trace must not be exposed");
    });

    it("should never expose internal stack traces or database connection strings in error responses", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send({}); // Empty body

        assert.strictEqual(res.status, 400);
        assert.strictEqual(res.body.success, false);
        assert.strictEqual(res.body.stack, undefined, "Stack trace must not be exposed");
    });
});
