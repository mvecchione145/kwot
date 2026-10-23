import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { ServiceFields } from "../components/ServiceFields";
import { useSession } from "../session";
import { onboardingError } from "./Onboarding";

/** Lets a servicer change their home ZIP, trades and travel radius (US-1.4). */
export function Services() {
  const { me, setMe } = useSession();
  const navigate = useNavigate();
  const [zip, setZip] = useState(me?.zip ?? "");
  const [services, setServices] = useState({
    categories: me?.categories ?? [],
    radiusMiles: me?.serviceRadiusMiles ?? 25,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (services.categories.length === 0) return setError("Choose at least one service.");
    setSaving(true);
    setError(null);
    try {
      setMe(await api.updateServices({ zip, ...services }));
      navigate("/home");
    } catch (err) {
      setError(onboardingError(err));
      setSaving(false);
    }
  }

  return (
    <form className="stack" onSubmit={submit}>
      <Link to="/home">← Open requests</Link>
      <h1>Your services</h1>
      <label className="field">
        <span>Your home base ZIP code</span>
        <input
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={5}
          value={zip}
          onChange={(e) => setZip(e.target.value.replace(/\D/g, ""))}
          required
        />
      </label>
      <ServiceFields value={services} onChange={setServices} />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="primary big" disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
