import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Phase 4 Slice 2 — Frontend Network & Auth Architecture Suite", () => {
    const srcDir = path.resolve(__dirname, "../src");
    const apiClientPath = path.resolve(srcDir, "services/apiClient.js");
    const authApiPath = path.resolve(srcDir, "features/auth/services/auth.api.js");
    const interviewApiPath = path.resolve(srcDir, "features/interview/services/interview.api.js");
    const authContextPath = path.resolve(srcDir, "features/auth/auth.context.jsx");
    const useAuthPath = path.resolve(srcDir, "features/auth/hooks/useAuth.js");

    const apiClientContent = fs.readFileSync(apiClientPath, "utf-8");
    const authApiContent = fs.readFileSync(authApiPath, "utf-8");
    const interviewApiContent = fs.readFileSync(interviewApiPath, "utf-8");
    const authContextContent = fs.readFileSync(authContextPath, "utf-8");
    const useAuthContent = fs.readFileSync(useAuthPath, "utf-8");

    describe("1. Canonical API Client Unification", () => {
        it("should configure canonical apiClient with baseURL, withCredentials, timeout, and response interceptor", () => {
            assert.ok(apiClientContent.includes("withCredentials: true"), "apiClient must enable withCredentials");
            assert.ok(apiClientContent.includes("timeout: 30000"), "apiClient must configure reasonable timeout");
            assert.ok(apiClientContent.includes("apiClient.interceptors.response.use"), "apiClient must configure response interceptor");
            assert.ok(apiClientContent.includes("rizzume:unauthorized"), "apiClient must broadcast unauthorized event on 401");
            assert.ok(apiClientContent.includes("!isAuthEndpoint"), "apiClient must exclude auth lifecycle endpoints from broadcast");
        });

        it("should migrate auth.api.js to consume canonical apiClient without its own axios.create", () => {
            assert.ok(
                authApiContent.includes('import apiClient from "../../../services/apiClient"'),
                "auth.api.js must import canonical apiClient"
            );
            assert.ok(
                !authApiContent.includes("axios.create"),
                "auth.api.js must NOT create its own Axios instance"
            );
            assert.ok(authApiContent.includes("export async function register"));
            assert.ok(authApiContent.includes("export async function login"));
            assert.ok(authApiContent.includes("export async function logout"));
            assert.ok(authApiContent.includes("export async function getMe"));
        });

        it("should migrate interview.api.js to consume canonical apiClient without its own axios.create", () => {
            assert.ok(
                interviewApiContent.includes('import apiClient from "../../../services/apiClient"'),
                "interview.api.js must import canonical apiClient"
            );
            assert.ok(
                !interviewApiContent.includes("axios.create"),
                "interview.api.js must NOT create its own Axios instance"
            );
            assert.ok(interviewApiContent.includes("export const getResumeVersions"));
            assert.ok(interviewApiContent.includes("export const uploadResumeVersion"));
            assert.ok(interviewApiContent.includes("export const generateInterviewReport"));
            assert.ok(interviewApiContent.includes("export const generateResumePdf"));
        });

        it("should enforce exactly ONE axios.create across the entire frontend src directory", () => {
            function findFiles(dir, fileList = []) {
                const files = fs.readdirSync(dir);
                for (const file of files) {
                    const filePath = path.join(dir, file);
                    if (fs.statSync(filePath).isDirectory()) {
                        findFiles(filePath, fileList);
                    } else if (file.endsWith(".js") || file.endsWith(".jsx")) {
                        fileList.push(filePath);
                    }
                }
                return fileList;
            }

            const allSrcFiles = findFiles(srcDir);
            const filesWithAxiosCreate = [];

            for (const file of allSrcFiles) {
                const content = fs.readFileSync(file, "utf-8");
                if (content.includes("axios.create")) {
                    filesWithAxiosCreate.push(path.relative(srcDir, file));
                }
            }

            assert.strictEqual(
                filesWithAxiosCreate.length,
                1,
                `Expected exactly 1 axios.create, found: ${filesWithAxiosCreate.join(", ")}`
            );
            assert.strictEqual(filesWithAxiosCreate[0], "services\\apiClient.js".replace(/\\/g, path.sep));
        });
    });

    describe("2. Auth Session Hydration Centralization (getMe)", () => {
        it("should make AuthProvider the sole owner of initial getMe session hydration", () => {
            assert.ok(
                authContextContent.includes('import { getMe } from "./services/auth.api"'),
                "auth.context.jsx must import getMe"
            );
            assert.ok(
                authContextContent.includes("const refreshUser = useCallback"),
                "auth.context.jsx must define refreshUser handler"
            );
            assert.ok(
                authContextContent.includes("refreshUser()"),
                "auth.context.jsx must invoke refreshUser in useEffect on mount"
            );
            assert.ok(
                authContextContent.includes("rizzume:unauthorized"),
                "auth.context.jsx must listen for rizzume:unauthorized to invalidate state"
            );
        });

        it("should remove redundant getMe useEffect from useAuth.js to eliminate duplicate requests", () => {
            assert.ok(
                !useAuthContent.includes("getAndSetUser"),
                "useAuth.js must NOT contain getAndSetUser"
            );
            assert.ok(
                !useAuthContent.includes("getMe()"),
                "useAuth.js must NOT invoke getMe() inside a hook-level useEffect"
            );
            assert.ok(
                useAuthContent.includes("useAuth must be used within an AuthProvider"),
                "useAuth.js must enforce AuthProvider context wrapper"
            );
        });

        it("should expose shared auth actions and state from useAuth hook", () => {
            assert.ok(useAuthContent.includes("handleLogin"));
            assert.ok(useAuthContent.includes("handleRegister"));
            assert.ok(useAuthContent.includes("handleLogout"));
            assert.ok(useAuthContent.includes("refreshUser"));
            assert.ok(useAuthContent.includes("user,"));
            assert.ok(useAuthContent.includes("loading,"));
        });
    });
});
