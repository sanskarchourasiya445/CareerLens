import React, { Suspense } from "react";
import { RouterProvider } from "react-router";
import { router } from "./app.routes.jsx";
import { AuthProvider } from "./features/auth/auth.context.jsx";
import { InterviewProvider } from "./features/interview/interview.context.jsx";
import RouteFallback from "./components/RouteFallback";

function App() {
  return (
    <AuthProvider>
      <InterviewProvider>
        <Suspense fallback={<RouteFallback />}>
          <RouterProvider router={router} />
        </Suspense>
      </InterviewProvider>
    </AuthProvider>
  );
}

export default App;