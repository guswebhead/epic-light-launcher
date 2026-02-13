import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { MainLayout } from "./layouts/MainLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Login } from "./pages/Login";

// Lazy-loaded routes
const Store = lazy(() => import("./pages/Store").then(m => ({ default: m.Store })));
const Library = lazy(() => import("./pages/Library").then(m => ({ default: m.Library })));
const Profile = lazy(() => import("./pages/Profile").then(m => ({ default: m.Profile })));
const Settings = lazy(() => import("./pages/Settings").then(m => ({ default: m.Settings })));
const GameDetails = lazy(() => import("./pages/GameDetails").then(m => ({ default: m.GameDetails })));
const Highlights = lazy(() => import("./pages/store/Highlights").then(m => ({ default: m.Highlights })));
const Wishlist = lazy(() => import("./pages/store/Wishlist").then(m => ({ default: m.Wishlist })));
const AllGames = lazy(() => import("./pages/store/AllGames").then(m => ({ default: m.AllGames })));

// Simple loading fallback
function RouteLoader() {
  return <div className="flex items-center justify-center min-h-screen text-gray-400">Carregando...</div>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Suspense fallback={<RouteLoader />}><Store /></Suspense>} />
          <Route path="/store/highlights" element={<Suspense fallback={<RouteLoader />}><Highlights /></Suspense>} />
          <Route path="/store/wishlist" element={<Suspense fallback={<RouteLoader />}><Wishlist /></Suspense>} />
          <Route path="/store/all" element={<Suspense fallback={<RouteLoader />}><AllGames /></Suspense>} />
          <Route path="/library" element={<Suspense fallback={<RouteLoader />}><Library /></Suspense>} />
          <Route path="/profile" element={<Suspense fallback={<RouteLoader />}><Profile /></Suspense>} />
          <Route path="/settings" element={<Suspense fallback={<RouteLoader />}><Settings /></Suspense>} />
          <Route path="/game/:appName" element={<Suspense fallback={<RouteLoader />}><GameDetails /></Suspense>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
