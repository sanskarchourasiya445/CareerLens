/**
 * @file skillNormalizer.js
 * @description Single source of truth for canonical skill normalization in Rizzume Phase 3.
 * Pure deterministic string cleansing and canonical dictionary lookup.
 * Strictly NO AI, NO network calls, NO database queries, NO embeddings.
 */

// Normalized lookup dictionary: maps lowercased, punctuation-cleansed keys to canonical metadata
const CANONICAL_SKILL_MAP = {
    // Frontend & Web
    "react": { canonical: "React", category: "framework" },
    "react.js": { canonical: "React", category: "framework" },
    "reactjs": { canonical: "React", category: "framework" },
    "react js": { canonical: "React", category: "framework" },
    "react 18": { canonical: "React", category: "framework" },
    "react v18": { canonical: "React", category: "framework" },
    "react 19": { canonical: "React", category: "framework" },
    "react-native": { canonical: "React Native", category: "framework" },
    "react native": { canonical: "React Native", category: "framework" },

    "next": { canonical: "Next.js", category: "framework" },
    "next.js": { canonical: "Next.js", category: "framework" },
    "nextjs": { canonical: "Next.js", category: "framework" },
    "next js": { canonical: "Next.js", category: "framework" },

    "vue": { canonical: "Vue.js", category: "framework" },
    "vue.js": { canonical: "Vue.js", category: "framework" },
    "vuejs": { canonical: "Vue.js", category: "framework" },
    "vue js": { canonical: "Vue.js", category: "framework" },

    "angular": { canonical: "Angular", category: "framework" },
    "angularjs": { canonical: "Angular", category: "framework" },

    "html": { canonical: "HTML5", category: "technology" },
    "html5": { canonical: "HTML5", category: "technology" },
    "css": { canonical: "CSS3", category: "technology" },
    "css3": { canonical: "CSS3", category: "technology" },
    "tailwind": { canonical: "Tailwind CSS", category: "framework" },
    "tailwindcss": { canonical: "Tailwind CSS", category: "framework" },
    "tailwind css": { canonical: "Tailwind CSS", category: "framework" },

    // Backend & Languages
    "node": { canonical: "Node.js", category: "framework" },
    "node.js": { canonical: "Node.js", category: "framework" },
    "nodejs": { canonical: "Node.js", category: "framework" },
    "node js": { canonical: "Node.js", category: "framework" },

    "express": { canonical: "Express.js", category: "framework" },
    "express.js": { canonical: "Express.js", category: "framework" },
    "expressjs": { canonical: "Express.js", category: "framework" },
    "express js": { canonical: "Express.js", category: "framework" },

    "ts": { canonical: "TypeScript", category: "programming_language" },
    "typescript": { canonical: "TypeScript", category: "programming_language" },
    "type script": { canonical: "TypeScript", category: "programming_language" },

    "js": { canonical: "JavaScript", category: "programming_language" },
    "javascript": { canonical: "JavaScript", category: "programming_language" },
    "es6": { canonical: "JavaScript", category: "programming_language" },
    "ecmascript": { canonical: "JavaScript", category: "programming_language" },

    "python": { canonical: "Python", category: "programming_language" },
    "python 3": { canonical: "Python", category: "programming_language" },
    "python3": { canonical: "Python", category: "programming_language" },
    "py": { canonical: "Python", category: "programming_language" },

    "golang": { canonical: "Go", category: "programming_language" },
    "go": { canonical: "Go", category: "programming_language" },

    "rust": { canonical: "Rust", category: "programming_language" },

    "java": { canonical: "Java", category: "programming_language" },

    "c++": { canonical: "C++", category: "programming_language" },
    "cpp": { canonical: "C++", category: "programming_language" },
    "c#": { canonical: "C#", category: "programming_language" },
    "csharp": { canonical: "C#", category: "programming_language" },
    "c-sharp": { canonical: "C#", category: "programming_language" },
    "c": { canonical: "C", category: "programming_language" },

    // Databases & Storage
    "postgres": { canonical: "PostgreSQL", category: "database" },
    "postgresql": { canonical: "PostgreSQL", category: "database" },
    "psql": { canonical: "PostgreSQL", category: "database" },
    "postgres db": { canonical: "PostgreSQL", category: "database" },
    "postgresql db": { canonical: "PostgreSQL", category: "database" },

    "mongo": { canonical: "MongoDB", category: "database" },
    "mongodb": { canonical: "MongoDB", category: "database" },
    "mongo db": { canonical: "MongoDB", category: "database" },

    "redis": { canonical: "Redis", category: "database" },
    "redis db": { canonical: "Redis", category: "database" },
    "redis cache": { canonical: "Redis", category: "database" },

    "sql": { canonical: "SQL", category: "programming_language" },
    "nosql": { canonical: "NoSQL", category: "database" },

    // DevOps, Cloud & Infrastructure
    "docker": { canonical: "Docker", category: "tool" },
    "containerization": { canonical: "Docker", category: "tool" },
    "docker-compose": { canonical: "Docker", category: "tool" },
    "docker compose": { canonical: "Docker", category: "tool" },

    "k8s": { canonical: "Kubernetes", category: "tool" },
    "kubernetes": { canonical: "Kubernetes", category: "tool" },

    "aws": { canonical: "AWS", category: "cloud" },
    "amazon web services": { canonical: "AWS", category: "cloud" },
    "amazon aws": { canonical: "AWS", category: "cloud" },

    "gcp": { canonical: "GCP", category: "cloud" },
    "google cloud": { canonical: "GCP", category: "cloud" },
    "google cloud platform": { canonical: "GCP", category: "cloud" },

    "azure": { canonical: "Azure", category: "cloud" },
    "microsoft azure": { canonical: "Azure", category: "cloud" },

    "ci/cd": { canonical: "CI/CD", category: "tool" },
    "ci-cd": { canonical: "CI/CD", category: "tool" },
    "ci cd": { canonical: "CI/CD", category: "tool" },
    "cicd": { canonical: "CI/CD", category: "tool" },
    "continuous integration": { canonical: "CI/CD", category: "tool" },
    "continuous deployment": { canonical: "CI/CD", category: "tool" },

    "linux": { canonical: "Linux", category: "technology" },
    "gnu/linux": { canonical: "Linux", category: "technology" },

    "git": { canonical: "Git", category: "tool" },
    "github": { canonical: "Git", category: "tool" },
    "git vcs": { canonical: "Git", category: "tool" },
    "git/github": { canonical: "Git", category: "tool" },

    // APIs & Architecture
    "graphql": { canonical: "GraphQL", category: "technology" },
    "graph ql": { canonical: "GraphQL", category: "technology" },

    "rest": { canonical: "REST APIs", category: "technology" },
    "restful": { canonical: "REST APIs", category: "technology" },
    "rest api": { canonical: "REST APIs", category: "technology" },
    "rest apis": { canonical: "REST APIs", category: "technology" },
    "restful api": { canonical: "REST APIs", category: "technology" },
    "restful apis": { canonical: "REST APIs", category: "technology" },

    "microservices": { canonical: "Microservices", category: "domain" },
    "microservice": { canonical: "Microservices", category: "domain" },
    "microservice architecture": { canonical: "Microservices", category: "domain" },

    "system design": { canonical: "System Design", category: "domain" },
    "systems design": { canonical: "System Design", category: "domain" },

    "kafka": { canonical: "Kafka", category: "tool" },
    "apache kafka": { canonical: "Kafka", category: "tool" },

    "grpc": { canonical: "gRPC", category: "technology" }
};

/**
 * Cleanse and normalize a raw string into a consistent lookup key.
 * Trims whitespace, lowercases, collapses whitespace, and strips trailing punctuation.
 *
 * @param {string} raw
 * @returns {string} Cleansed key
 */
function toLookupKey(raw) {
    if (!raw || typeof raw !== "string") {
        return "";
    }
    return raw
        .trim()
        .toLowerCase()
        .replace(/[\r\n\t]+/g, " ")
        .replace(/\s+/g, " ")
        .replace(/[.,;:]+$/, ""); // remove trailing period/comma/etc.
}

/**
 * Deterministic fallback formatting for unknown skills.
 * Preserves known acronyms and formats title-cased words cleanly.
 *
 * @param {string} raw
 * @returns {string} Formatted canonical display string
 */
function formatUnknownSkill(raw) {
    const cleaned = raw
        .trim()
        .replace(/[\r\n\t]+/g, " ")
        .replace(/\s+/g, " ")
        .replace(/[.,;:]+$/, "");
    if (!cleaned) return "";

    return cleaned
        .split(" ")
        .map(word => {
            // Keep acronyms like RPC, SDK, API in all-caps if already upper
            if (word.length > 1 && word === word.toUpperCase()) {
                return word;
            }
            // Title case word
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(" ");
}

/**
 * Single canonicalization function for skill names.
 * Maps synonyms and variations (e.g. "ReactJS", "React.js", "React 18") to "React".
 * Unknown skills receive deterministic title-case normalization.
 *
 * @param {string} rawSkill
 * @returns {string} Canonical skill name
 */
function normalizeSkill(rawSkill) {
    if (!rawSkill || typeof rawSkill !== "string") {
        return "";
    }

    const key = toLookupKey(rawSkill);
    if (!key) return "";

    // 1. Direct dictionary match
    if (CANONICAL_SKILL_MAP[key]) {
        return CANONICAL_SKILL_MAP[key].canonical;
    }

    // 2. Known version suffix cleanup for frameworks/libraries (e.g., "react v18.2" or "node 20.x")
    const versionStripped = key.replace(/\s+v?\d+(\.\d+)*(\.x)?$/, "");
    if (versionStripped !== key && CANONICAL_SKILL_MAP[versionStripped]) {
        return CANONICAL_SKILL_MAP[versionStripped].canonical;
    }

    // 3. Fallback to clean deterministic formatting without aggressive collapsing
    return formatUnknownSkill(rawSkill);
}

/**
 * Get comprehensive canonical metadata (canonicalName, displayName, candidate category).
 *
 * @param {string} rawSkill
 * @returns {{ canonicalName: string, displayName: string, category: string }}
 */
function getSkillMetadata(rawSkill) {
    if (!rawSkill || typeof rawSkill !== "string") {
        return { canonicalName: "", displayName: "", category: "technology" };
    }

    const key = toLookupKey(rawSkill);
    if (CANONICAL_SKILL_MAP[key]) {
        return {
            canonicalName: CANONICAL_SKILL_MAP[key].canonical,
            displayName: rawSkill.trim(),
            category: CANONICAL_SKILL_MAP[key].category
        };
    }

    const canonicalName = normalizeSkill(rawSkill);
    return {
        canonicalName,
        displayName: rawSkill.trim(),
        category: "technology"
    };
}

/**
 * Compare two skill strings for canonical equivalence.
 *
 * @param {string} skillA
 * @param {string} skillB
 * @returns {boolean} True if both skills normalize to the exact same canonical identity
 */
function areSkillsEqual(skillA, skillB) {
    const normA = normalizeSkill(skillA);
    const normB = normalizeSkill(skillB);
    if (!normA || !normB) return false;
    return normA === normB;
}

module.exports = {
    normalizeSkill,
    getSkillMetadata,
    areSkillsEqual,
    toLookupKey,
    CANONICAL_SKILL_MAP
};
