import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { api, ApiError } from "../api";
import { intendedRole, keycloak, type Role } from "../auth";
import { ServiceFields } from "../components/ServiceFields";
import { useSession } from "../session";

export function onboardingError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === "unknown_zip") return "We don't recognize that ZIP code.";
    if (err.status === 400) return "Check the ZIP code and choose at least one service.";
  }
  return "Something went wrong.";
}

export function Onboarding() {
  const { me, loading, setMe } = useSession();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role | null>(intendedRole());
  const [zip, setZip] = useState("");
  const [services, setServices] = useState({ categories: [] as string[], radiusMiles: 25 });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!keycloak.authenticated) return <Navigate to="/" replace />;
  if (loading || !me) return <p className="muted center">Loading…</p>;
  if (me.role) return <Navigate to="/home" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!role) return setError("Choose how you'll use kwōt.");
    if (role === "servicer" && services.categories.length === 0) return setError("Choose at least one service.");
    setSaving(true);
    setError(null);
    try {
      setMe(await api.onboard(role === "customer" ? { role, zip } : { role, zip, ...services }));
      navigate("/home", { replace: true });
    } catch (err) {
      setError(onboardingError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="stack" onSubmit={submit}>
      <h1>Welcome{me.name ? `, ${me.name}` : ""}</h1>
      <fieldset className="stack">
        <legend>How will you use kwōt? This can't be changed later.</legend>
        <label className={`choice ${role === "customer" ? "selected" : ""}`}>
          <input type="radio" name="role" checked={role === "customer"} onChange={() => setRole("customer")} />
          <span>
            <strong>I need a service</strong>
            <span className="muted">Post requests and compare bids</span>
          </span>
        </label>
        <label className={`choice ${role === "servicer" ? "selected" : ""}`}>
          <input type="radio" name="role" checked={role === "servicer"} onChange={() => setRole("servicer")} />
          <span>
            <strong>I provide services</strong>
            <span className="muted">Find jobs and send bids</span>
          </span>
        </label>
      </fieldset>
      <label className="field">
        <span>{role === "servicer" ? "Your home base ZIP code" : "Your ZIP code"}</span>
        <input
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={5}
          value={zip}
          onChange={(e) => setZip(e.target.value.replace(/\D/g, ""))}
          required
        />
      </label>
      {role === "servicer" && <ServiceFields value={services} onChange={setServices} />}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="primary big" disabled={saving}>
        {saving ? "Saving…" : "Continue"}
      </button>
    </form>
  );
}
