import { useEffect, useState } from "react";
import { api, SERVICE_RADIUS_OPTIONS, type Category, type ServiceSettings } from "../api";

/** A servicer's trades and travel radius, shared by onboarding and the services page. */
export function ServiceFields({
  value,
  onChange,
}: {
  value: Omit<ServiceSettings, "zip">;
  onChange: (value: Omit<ServiceSettings, "zip">) => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    api.categories().then(setCategories).catch(() => setCategories([]));
  }, []);

  function toggle(slug: string) {
    const selected = value.categories.includes(slug)
      ? value.categories.filter((s) => s !== slug)
      : [...value.categories, slug];
    onChange({ ...value, categories: selected });
  }

  return (
    <>
      <fieldset className="stack">
        <legend>Which services do you offer?</legend>
        <div className="checks">
          {categories.map((c) => (
            <label key={c.slug} className={`choice compact ${value.categories.includes(c.slug) ? "selected" : ""}`}>
              <input type="checkbox" checked={value.categories.includes(c.slug)} onChange={() => toggle(c.slug)} />
              <span>{c.name}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="field">
        <span>How far will you travel?</span>
        <select value={value.radiusMiles} onChange={(e) => onChange({ ...value, radiusMiles: Number(e.target.value) })}>
          {SERVICE_RADIUS_OPTIONS.map((miles) => (
            <option key={miles} value={miles}>
              Up to {miles} miles
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
