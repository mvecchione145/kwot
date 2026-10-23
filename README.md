# kwōt

Post a service need once, get bids from local servicers. See [USER_STORY.md](USER_STORY.md) for the product scope.

## Running locally

Requires Docker.

```sh
cp .env.example .env   # optional; add ANTHROPIC_API_KEY to enable the chat assistant
docker compose up --build
```

| URL | What |
| --- | --- |
| http://localhost:5173 | Web app |
| http://localhost:8080/admin | Keycloak admin console (`admin` / `admin`) |
| http://localhost:4000/health | API health |

Sign up from the landing page; Keycloak handles registration and login, then kwōt asks
whether you're a customer or a servicer (this can't be changed later).

Reset all data: `docker compose down -v`.

## Services

| Service | Stack | Notes |
| --- | --- | --- |
| `web` | React + Vite | Proxies `/api` to the API. Source is bind-mounted with hot reload. |
| `api` | Express (TypeScript) | Verifies Keycloak access tokens, owns the app database, runs SQL migrations from `services/api/migrations` on startup. |
| `assistant` | Strands Agents + Claude | Internal only; the API forwards chat-intake turns to it. Disabled when `ANTHROPIC_API_KEY` is empty, and the web app then offers only the form. |
| `keycloak` | Keycloak 26 | Realm `kwot` is imported from `infra/keycloak/realm-kwot.json` on first start. |
| `postgres` | Postgres 17 | One instance with separate `kwot` and `keycloak` databases. |

Auth flow: the browser logs in with Keycloak (`kwot-web` public client, PKCE) and calls the
API with the access token. The API checks issuer, audience (`kwot-api`) and signature, and
maps the Keycloak user to a row in `users`, which holds the kwōt role.

After changing dependencies in a service's `package.json`, rebuild with `docker compose up --build`.
