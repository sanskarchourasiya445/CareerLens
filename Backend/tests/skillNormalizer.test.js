const { describe, it } = require("node:test");
const assert = require("node:assert");
const {
    normalizeSkill,
    getSkillMetadata,
    areSkillsEqual,
    toLookupKey
} = require("../src/services/skillNormalizer");

describe("Phase 3 Slice 2 — Canonical Skill Normalizer Suite", () => {
    describe("Mandatory Canonical Mappings", () => {
        it("should normalize all React variants to 'React'", () => {
            const variants = ["React", "react", "ReactJS", "React.js", "React js", "react.js", "React 18", "React v18.2"];
            for (const v of variants) {
                assert.strictEqual(normalizeSkill(v), "React", `Failed for variant: ${v}`);
            }
        });

        it("should normalize all Node.js variants to 'Node.js'", () => {
            const variants = ["Node", "Node.js", "NodeJS", "node js", "nodejs", "Node 20"];
            for (const v of variants) {
                assert.strictEqual(normalizeSkill(v), "Node.js", `Failed for variant: ${v}`);
            }
        });

        it("should normalize all PostgreSQL variants to 'PostgreSQL'", () => {
            const variants = ["Postgres", "PostgreSQL", "PSQL", "postgres db", "postgresql"];
            for (const v of variants) {
                assert.strictEqual(normalizeSkill(v), "PostgreSQL", `Failed for variant: ${v}`);
            }
        });

        it("should normalize all MongoDB variants to 'MongoDB'", () => {
            const variants = ["Mongo", "MongoDB", "mongo db", "mongodb"];
            for (const v of variants) {
                assert.strictEqual(normalizeSkill(v), "MongoDB", `Failed for variant: ${v}`);
            }
        });

        it("should normalize TypeScript variants to 'TypeScript'", () => {
            const variants = ["TS", "TypeScript", "typescript", "type script"];
            for (const v of variants) {
                assert.strictEqual(normalizeSkill(v), "TypeScript", `Failed for variant: ${v}`);
            }
        });

        it("should normalize Docker variants to 'Docker'", () => {
            const variants = ["Docker", "docker", "containerization", "docker-compose", "docker compose"];
            for (const v of variants) {
                assert.strictEqual(normalizeSkill(v), "Docker", `Failed for variant: ${v}`);
            }
        });

        it("should normalize Kubernetes variants to 'Kubernetes'", () => {
            const variants = ["K8s", "k8s", "Kubernetes", "kubernetes"];
            for (const v of variants) {
                assert.strictEqual(normalizeSkill(v), "Kubernetes", `Failed for variant: ${v}`);
            }
        });

        it("should normalize AWS variants to 'AWS'", () => {
            const variants = ["AWS", "aws", "Amazon Web Services", "amazon aws"];
            for (const v of variants) {
                assert.strictEqual(normalizeSkill(v), "AWS", `Failed for variant: ${v}`);
            }
        });
    });

    describe("Anti-Over-Aggressiveness & Skill Separation", () => {
        it("should NEVER collapse 'React Native' into 'React'", () => {
            assert.strictEqual(normalizeSkill("React Native"), "React Native");
            assert.strictEqual(normalizeSkill("react-native"), "React Native");
            assert.notStrictEqual(normalizeSkill("React Native"), normalizeSkill("React"));
        });

        it("should NEVER collapse 'Java' into 'JavaScript'", () => {
            assert.strictEqual(normalizeSkill("Java"), "Java");
            assert.strictEqual(normalizeSkill("JavaScript"), "JavaScript");
            assert.strictEqual(normalizeSkill("JS"), "JavaScript");
            assert.notStrictEqual(normalizeSkill("Java"), normalizeSkill("JavaScript"));
        });

        it("should keep 'C', 'C++', and 'C#' strictly distinct", () => {
            assert.strictEqual(normalizeSkill("C"), "C");
            assert.strictEqual(normalizeSkill("C++"), "C++");
            assert.strictEqual(normalizeSkill("cpp"), "C++");
            assert.strictEqual(normalizeSkill("C#"), "C#");
            assert.strictEqual(normalizeSkill("csharp"), "C#");
            assert.notStrictEqual(normalizeSkill("C"), normalizeSkill("C++"));
            assert.notStrictEqual(normalizeSkill("C++"), normalizeSkill("C#"));
        });

        it("should NEVER accidentally alias unknown multi-word skills to unrelated canonical single-word skills", () => {
            // Must not substring-match or fuzzily collapse phrases containing canonical names
            assert.strictEqual(normalizeSkill("React Testing Library"), "React Testing Library");
            assert.notStrictEqual(normalizeSkill("React Testing Library"), "React");

            assert.strictEqual(normalizeSkill("Docker Swarm"), "Docker Swarm");
            assert.notStrictEqual(normalizeSkill("Docker Swarm"), "Docker");

            assert.strictEqual(normalizeSkill("PostgreSQL Administration"), "Postgresql Administration");
            assert.notStrictEqual(normalizeSkill("PostgreSQL Administration"), "PostgreSQL");

            assert.strictEqual(normalizeSkill("AWS CloudFormation"), "AWS Cloudformation");
            assert.notStrictEqual(normalizeSkill("AWS CloudFormation"), "AWS");
        });
    });

    describe("Deterministic Fallback & Metadata", () => {
        it("should format unknown skills cleanly with Title Case while preserving uppercase acronyms", () => {
            assert.strictEqual(normalizeSkill("apache cassandra"), "Apache Cassandra");
            assert.strictEqual(normalizeSkill("RPC protocols"), "RPC Protocols");
            assert.strictEqual(normalizeSkill("grpc"), "gRPC");
            assert.strictEqual(normalizeSkill("  solidity smart contracts.  "), "Solidity Smart Contracts");
        });

        it("should return correct metadata and candidate category", () => {
            const reactMeta = getSkillMetadata("react.js");
            assert.strictEqual(reactMeta.canonicalName, "React");
            assert.strictEqual(reactMeta.displayName, "react.js");
            assert.strictEqual(reactMeta.category, "framework");

            const pgMeta = getSkillMetadata("PSQL");
            assert.strictEqual(pgMeta.canonicalName, "PostgreSQL");
            assert.strictEqual(pgMeta.category, "database");

            const unknownMeta = getSkillMetadata("ElasticSearch");
            assert.strictEqual(unknownMeta.canonicalName, "Elasticsearch");
            assert.strictEqual(unknownMeta.category, "technology");
        });

        it("should correctly compare skills with areSkillsEqual", () => {
            assert.strictEqual(areSkillsEqual("ReactJS", "react.js"), true);
            assert.strictEqual(areSkillsEqual("Postgres", "postgresql db"), true);
            assert.strictEqual(areSkillsEqual("Docker", "Kubernetes"), false);
            assert.strictEqual(areSkillsEqual("", "React"), false);
        });

        it("should handle empty, null, or undefined gracefully without throwing", () => {
            assert.strictEqual(normalizeSkill(""), "");
            assert.strictEqual(normalizeSkill(null), "");
            assert.strictEqual(normalizeSkill(undefined), "");
            assert.strictEqual(toLookupKey(null), "");
        });
    });
});
