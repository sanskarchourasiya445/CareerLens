import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Phase 4 Slice 5 — Frontend Performance & Code Splitting Suite", () => {
    const srcDir = path.resolve(__dirname, "../src");
    const appRoutesPath = path.resolve(srcDir, "app.routes.jsx");
    const appPath = path.resolve(srcDir, "App.jsx");
    const protectedPath = path.resolve(srcDir, "features/auth/components/Protected.jsx");
    const fallbackPath = path.resolve(srcDir, "components/RouteFallback.jsx");

    const appRoutesContent = fs.readFileSync(appRoutesPath, "utf-8");
    const appContent = fs.readFileSync(appPath, "utf-8");
    const protectedContent = fs.readFileSync(protectedPath, "utf-8");
    const fallbackContent = fs.readFileSync(fallbackPath, "utf-8");

    describe("1. Route-Level Dynamic Code Splitting", () => {
        it("should dynamically import all route-level pages using React.lazy()", () => {
            const routes = [
                "Login",
                "Register",
                "Dashboard",
                "JobTracker",
                "GapAnalysis",
                "LearningRoadmap",
                "Home",
                "Interview"
            ];

            for (const route of routes) {
                const lazyRegex = new RegExp(`const\\s+${route}\\s*=\\s*lazy\\(\\(\\)\\s*=>\\s*import\\(`);
                assert.ok(
                    lazyRegex.test(appRoutesContent),
                    `Route component '${route}' must be dynamically imported via React.lazy()`
                );
            }
        });

        it("should NOT contain static synchronous imports of page components in app.routes.jsx", () => {
            const staticImportRegex = /^import\s+(Login|Register|Dashboard|JobTracker|GapAnalysis|LearningRoadmap|Home|Interview)\s+from/m;
            assert.strictEqual(
                staticImportRegex.test(appRoutesContent),
                false,
                "app.routes.jsx must not contain static imports of page components"
            );
        });

        it("should preserve protected wrapper tags on all workspace routes", () => {
            assert.ok(appRoutesContent.includes("<Protected><Dashboard /></Protected>"));
            assert.ok(appRoutesContent.includes("<Protected><JobTracker /></Protected>"));
            assert.ok(appRoutesContent.includes("<Protected><GapAnalysis /></Protected>"));
            assert.ok(appRoutesContent.includes("<Protected><LearningRoadmap /></Protected>"));
            assert.ok(appRoutesContent.includes("<Protected><Home /></Protected>"));
            assert.ok(appRoutesContent.includes("<Protected><Interview /></Protected>"));
        });
    });

    describe("2. Suspense & RouteFallback Integration", () => {
        it("should wrap RouterProvider in a Suspense boundary with RouteFallback in App.jsx", () => {
            assert.ok(appContent.includes("<Suspense fallback={<RouteFallback />}>"));
            assert.ok(appContent.includes("<RouterProvider router={router} />"));
        });

        it("should wrap protected children in a Suspense boundary with RouteFallback in Protected.jsx", () => {
            assert.ok(protectedContent.includes("<Suspense fallback={<RouteFallback />}>"));
            assert.ok(protectedContent.includes("{children}"));
        });

        it("should use RouteFallback during authentication hydration loading in Protected.jsx", () => {
            assert.ok(
                protectedContent.includes("if (loading) {\n        return <RouteFallback />;") ||
                protectedContent.includes("return <RouteFallback />"),
                "Protected.jsx must return RouteFallback when auth state is loading"
            );
        });

        it("should define accessible semantics on RouteFallback component", () => {
            assert.ok(fallbackContent.includes('role="status"'), "Must have role='status'");
            assert.ok(fallbackContent.includes('aria-live="polite"'), "Must have aria-live='polite'");
            assert.ok(fallbackContent.includes('aria-hidden="true"'), "Spinner must be aria-hidden");
            assert.ok(fallbackContent.includes("Loading workspace module..."));
        });
    });

    describe("3. Root Auth Architecture & Non-Tearing Invariant", () => {
        it("should keep AuthProvider mounted above RouterProvider to prevent unmounting on navigation", () => {
            const authProviderIndex = appContent.indexOf("<AuthProvider>");
            const routerProviderIndex = appContent.indexOf("<RouterProvider");
            const authProviderCloseIndex = appContent.indexOf("</AuthProvider>");

            assert.ok(authProviderIndex !== -1, "AuthProvider must exist in App.jsx");
            assert.ok(routerProviderIndex !== -1, "RouterProvider must exist in App.jsx");
            assert.ok(authProviderIndex < routerProviderIndex, "AuthProvider must wrap RouterProvider");
            assert.ok(routerProviderIndex < authProviderCloseIndex, "RouterProvider must be enclosed within AuthProvider");
        });
    });
});
