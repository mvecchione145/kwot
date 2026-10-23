import type { ReactNode } from "react";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import { keycloak, logout } from "./auth";
import { ChatIntake } from "./pages/ChatIntake";
import { FormIntake } from "./pages/FormIntake";
import { Home } from "./pages/Home";
import { Landing } from "./pages/Landing";
import { NewRequest } from "./pages/NewRequest";
import { Onboarding } from "./pages/Onboarding";
import { useSession } from "./session";

/** Requires a logged-in user who has finished onboarding (and optionally a specific role). */
function Protected({ role, children }: { role?: "customer" | "servicer"; children: ReactNode }) {
  const { me, loading } = useSession();
  if (!keycloak.authenticated) return <Navigate to="/" replace />;
  if (loading || !me) return <p className="muted center">Loading…</p>;
  if (!me.role) return <Navigate to="/onboarding" replace />;
  if (role && me.role !== role) return <Navigate to="/home" replace />;
  return <>{children}</>;
}

export function App() {
  const { me } = useSession();
  return (
    <div className="shell">
      <header className="topbar">
        <Link to={keycloak.authenticated ? "/home" : "/"} className="brand">
          kwōt
        </Link>
        {keycloak.authenticated && (
          <button className="link" onClick={() => void logout()}>
            Log out{me?.name ? ` (${me.name})` : ""}
          </button>
        )}
      </header>
      <main className="content">
        <Routes>
          <Route path="/" element={keycloak.authenticated ? <Navigate to="/home" replace /> : <Landing />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/home" element={<Protected><Home /></Protected>} />
          <Route path="/requests/new" element={<Protected role="customer"><NewRequest /></Protected>} />
          <Route path="/requests/new/chat" element={<Protected role="customer"><ChatIntake /></Protected>} />
          <Route path="/requests/new/form" element={<Protected role="customer"><FormIntake /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
