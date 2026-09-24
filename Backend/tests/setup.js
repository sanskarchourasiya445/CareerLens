const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { ai } = require("../src/services/ai.service");

let mongoServer;

/**
 * Connect to an isolated in-memory test database (never touches development/production DB)
 */
async function connectTestDB() {
    process.env.NODE_ENV = "test";
    process.env.JWT_SECRET = "test_jwt_secret_for_automated_testing_12345";

    try {
        mongoServer = await MongoMemoryServer.create({
            instance: {
                dbName: `rizzume_isolated_test_${Date.now()}`
            }
        });
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);
    } catch (err) {
        // Fallback: If MongoMemoryServer binary cannot be spawned, connect to a dedicated local test database
        const fallbackUri = `mongodb://127.0.0.1:27017/rizzume_isolated_test_fallback_${Date.now()}`;
        await mongoose.connect(fallbackUri);
    }

    mockAiService();
}

/**
 * Clear all collections between test cases to ensure a clean state
 */
async function clearTestDB() {
    if (mongoose.connection.readyState !== 1) return;
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
}

/**
 * Disconnect from MongoDB and tear down the in-memory database
 */
async function disconnectTestDB() {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.dropDatabase().catch(() => {});
        await mongoose.connection.close();
    }
    if (mongoServer) {
        await mongoServer.stop();
    }
}

/**
 * Mock Google Gemini API calls so tests never call external servers
 */
function mockAiService() {
    if (ai && ai.models) {
        ai.models.generateContent = async ({ contents }) => {
            // If test specifically injected "SIMULATE_MALFORMED_AI_RESPONSE", return invalid JSON
            if (contents.includes("SIMULATE_MALFORMED_AI_RESPONSE")) {
                return {
                    text: "INVALID_NON_JSON_RESPONSE_FROM_AI"
                };
            }

            // Check if asking for HTML resume or interview report
            if (contents.includes("Generate resume for a candidate")) {
                return {
                    text: JSON.stringify({
                        html: "<html><body><h1>Candidate Resume</h1><p>Experience in React and Node</p></body></html>"
                    })
                };
            }

            // Check if extracting structured job requirements
            if (contents.includes("Extract 5 to 12 structured requirements") || contents.includes("expert ATS job analyst")) {
                return {
                    text: JSON.stringify({
                        title: "Senior Full Stack Engineer",
                        company: "Target Tech Corp",
                        structuredRequirements: [
                            {
                                requirement: "5+ years of React and frontend architecture",
                                category: "required_skill",
                                importance: "critical",
                                weight: 5
                            },
                            {
                                requirement: "Node.js and Express REST API development",
                                category: "required_skill",
                                importance: "high",
                                weight: 4
                            },
                            {
                                requirement: "MongoDB database modeling and query optimization",
                                category: "technology",
                                importance: "medium",
                                weight: 3
                            },
                            {
                                requirement: "TypeScript type safety implementation",
                                category: "preferred_skill",
                                importance: "medium",
                                weight: 2
                            }
                        ]
                    })
                };
            }

            // Check if evaluating evidence against structured requirements
            if (contents.includes("evidence-based Career Intelligence Evaluator") || contents.includes("<REQUIREMENTS_TO_EVALUATE>")) {
                // If test specifically injected "SIMULATE_MALFORMED_AI_RESPONSE", return invalid JSON
                if (contents.includes("SIMULATE_MALFORMED_AI_RESPONSE")) {
                    return {
                        text: "INVALID_NON_JSON_RESPONSE_FROM_AI"
                    };
                }

                return {
                    text: JSON.stringify({
                        requirementMatches: [
                            {
                                requirement: "5+ years of React and frontend architecture",
                                category: "required_skill",
                                importance: "critical",
                                status: "matched",
                                evidence: "Experienced in React, Node, Express, MongoDB",
                                explanation: "Candidate profile explicitly demonstrates React experience."
                            },
                            {
                                requirement: "Node.js and Express REST API development",
                                category: "required_skill",
                                importance: "high",
                                status: "matched",
                                evidence: "Experienced in React, Node, Express, MongoDB",
                                explanation: "Candidate profile explicitly demonstrates Node and Express experience."
                            },
                            {
                                requirement: "MongoDB database modeling and query optimization",
                                category: "technology",
                                importance: "medium",
                                status: "matched",
                                evidence: "Experienced in React, Node, Express, MongoDB",
                                explanation: "Demonstrated hands-on MongoDB database experience."
                            },
                            {
                                requirement: "TypeScript type safety implementation",
                                category: "preferred_skill",
                                importance: "medium",
                                status: "missing",
                                evidence: "No supporting evidence found in resume",
                                explanation: "No explicit TypeScript experience found in the candidate document."
                            }
                        ],
                        skillGaps: [
                            { skill: "TypeScript", severity: "medium" },
                            { skill: "Kubernetes", severity: "low" }
                        ],
                        scoreExplanation: "Candidate demonstrates strong alignment with core React and Node.js backend requirements, with a gap in TypeScript.",
                        technicalQuestions: [
                            {
                                question: "Explain the virtual DOM in React.",
                                intention: "Assess React rendering fundamentals.",
                                answer: "The virtual DOM is an in-memory representation of the real DOM..."
                            }
                        ],
                        behavioralQuestions: [
                            {
                                question: "Tell me about a time you handled a tight deadline.",
                                intention: "Assess time management and communication under pressure.",
                                answer: "I prioritized critical features using MoSCoW methodology..."
                            }
                        ],
                        preparationPlan: [
                            {
                                day: 1,
                                focus: "TypeScript Fundamentals",
                                tasks: ["Review generics and union types", "Convert an Express route to TypeScript"]
                            }
                        ]
                    })
                };
            }

            return {
                text: JSON.stringify({
                    matchScore: 85,
                    technicalQuestions: [
                        {
                            question: "Explain the virtual DOM in React.",
                            intention: "Assess React rendering fundamentals.",
                            answer: "The virtual DOM is an in-memory representation of the real DOM..."
                        }
                    ],
                    behavioralQuestions: [
                        {
                            question: "Tell me about a time you handled a tight deadline.",
                            intention: "Assess time management and communication under pressure.",
                            answer: "I prioritized critical features using MoSCoW methodology..."
                        }
                    ],
                    skillGaps: [
                        {
                            skill: "Kubernetes",
                            severity: "medium"
                        }
                    ],
                    preparationPlan: [
                        {
                            day: 1,
                            focus: "System Architecture",
                            tasks: ["Review distributed systems concepts", "Practice designing a rate limiter"]
                        }
                    ],
                    title: "Full Stack Engineer"
                })
            };
        };
    }
}

/**
 * Create a valid minimal PDF buffer for testing uploads (starts with %PDF)
 */
function createDummyPdfBuffer(textContent = "John Doe\nSoftware Engineer\nExperienced in React, Node, Express, MongoDB\nBuilt scalable systems") {
    // Standard minimal PDF 1.4 header and stream containing readable text
    const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources <<>> /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length ${textContent.length + 30} >>
stream
BT
/F1 12 Tf
72 712 Td
(${textContent.replace(/\n/g, ") Tj T* (")}) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000216 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
310
%%EOF`;

    return Buffer.from(pdfContent);
}

module.exports = {
    connectTestDB,
    clearTestDB,
    disconnectTestDB,
    createDummyPdfBuffer
};
