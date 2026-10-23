import { login, register } from "../auth";

export function Landing() {
  return (
    <section className="stack">
      <h1>Describe the job once. Get bids from local pros.</h1>
      <p className="muted">
        Skip calling around. Post what you need, answer a few quick questions, and compare offers before anyone comes
        out.
      </p>
      <div className="stack">
        <button className="primary big" onClick={() => void register("customer")}>
          I need a service
        </button>
        <button className="secondary big" onClick={() => void register("servicer")}>
          I provide services
        </button>
      </div>
      <p className="center">
        Already have an account?{" "}
        <button className="link" onClick={() => void login()}>
          Log in
        </button>
      </p>
    </section>
  );
}
