const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const app = require("../src/app");
const { connectTestDB, clearTestDB, disconnectTestDB, createDummyPdfBuffer } = require("./setup");

describe("File Upload & Document Validation Suite", () => {
    let authCookie;

    before(async () => {
        await connectTestDB();
    });

    after(async () => {
        await disconnectTestDB();
    });

    beforeEach(async () => {
        await clearTestDB();

        const userRes = await request(app)
            .post("/api/auth/register")
            .send({
                username: "uploader",
                email: "uploader@example.com",
                password: "Password123!"
            });

        authCookie = userRes.headers["set-cookie"];
    });

    it("should reject non-PDF file uploads (e.g. .txt or .png)", async () => {
        const textBuffer = Buffer.from("Plain text resume content");

        const res = await request(app)
            .post("/api/interview/")
            .set("Cookie", authCookie)
            .field("jobDescription", "Senior Engineer requiring 5 years experience")
            .attach("resume", textBuffer, "resume.txt");

        assert.strictEqual(res.status, 400);
        assert.strictEqual(res.body.success, false);
        assert.match(res.body.message, /only pdf/i);
    });

    it("should reject a file with .pdf extension but invalid magic bytes (fake PDF)", async () => {
        // Disguised binary/text that lacks %PDF header
        const fakePdfBuffer = Buffer.from("NOT_A_REAL_PDF_HEADER_JUST_RANDOM_TEXT");

        const res = await request(app)
            .post("/api/interview/")
            .set("Cookie", authCookie)
            .field("jobDescription", "Senior Engineer requiring 5 years experience")
            .attach("resume", fakePdfBuffer, "fake.pdf");

        assert.strictEqual(res.status, 400);
        assert.strictEqual(res.body.success, false);
        assert.match(res.body.message, /not a valid pdf/i);
    });

    it("should reject an empty/scanned PDF when no self-description is provided", async () => {
        // Valid PDF header structure but 0 readable text (scanned page simulation)
        const emptyPdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
trailer
<< /Size 4 /Root 1 0 R >>
startxref
190
%%EOF`;

        const res = await request(app)
            .post("/api/interview/")
            .set("Cookie", authCookie)
            .field("jobDescription", "Senior Software Developer role")
            .attach("resume", Buffer.from(emptyPdfContent), "scanned.pdf");

        assert.strictEqual(res.status, 400);
        assert.strictEqual(res.body.success, false);
        assert.match(res.body.message, /no readable text or is a scanned image/i);
    });

    it("should reject submission when both resume and self-description are omitted", async () => {
        const res = await request(app)
            .post("/api/interview/")
            .set("Cookie", authCookie)
            .field("jobDescription", "Senior Software Developer role");

        assert.strictEqual(res.status, 400);
        assert.strictEqual(res.body.success, false);
        assert.match(res.body.message, /provide either a readable resume/i);
    });

    it("should reject a PDF with fewer than 50 readable characters", async () => {
        // Only ~21 non-whitespace characters
        const shortBuffer = createDummyPdfBuffer("Short text resume only");

        const res = await request(app)
            .post("/api/interview/")
            .set("Cookie", authCookie)
            .field("jobDescription", "Senior Software Developer role requiring cloud expertise")
            .attach("resume", shortBuffer, "short.pdf");

        assert.strictEqual(res.status, 400);
        assert.strictEqual(res.body.success, false);
        assert.match(res.body.message, /minimum 50 readable characters required/i);
    });

    it("should accept valid PDF resume with sufficient extracted text", async () => {
        const validBuffer = createDummyPdfBuffer("Jane Doe Senior Software Engineer\nReact Node Express MongoDB TypeScript\nDeveloped microservices");

        const res = await request(app)
            .post("/api/interview/")
            .set("Cookie", authCookie)
            .field("jobDescription", "Looking for a Senior Full Stack Engineer proficient in React and Node.js.")
            .attach("resume", validBuffer, "valid_resume.pdf");

        assert.strictEqual(res.status, 201);
        assert.strictEqual(res.body.success, true);
        assert.ok(res.body.interviewReport);
        assert.strictEqual(res.body.interviewReport.matchScore, 85);
    });
});
