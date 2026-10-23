# kwōt

Post a service need once, get bids from local servicers. See [docs/USER_STORY.md](docs/USER_STORY.md) for the product scope.

## Running locally

Requires Docker.

```sh
cp .env.example .env   # optional; see the file for assistant settings
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

### Assistant model (Ollama + Llama 3.2)

The assistant runs on an open-weights model, Llama 3.2 3B (`llama3.2:3b`), served by the
`ollama` container. `docker compose up` downloads the model (about 2 GB) on first run,
before the assistant starts. Llama 3.2 supports tool calling, which the assistant uses to
hand back the finished document. To use Claude instead, set `ASSISTANT_PROVIDER=anthropic`
and `ANTHROPIC_API_KEY` in `.env`.

On a Mac, the container runs the model on the CPU only (Docker can't reach the Apple GPU),
so replies are slow. For speed, run Ollama natively and point the assistant at it:

```sh
brew install ollama
brew services start ollama   # serves on http://localhost:11434
ollama pull llama3.2:3b
ollama ps                    # PROCESSOR should read "100% GPU"
```

Then set `OLLAMA_BASE_URL=http://host.docker.internal:11434` in `.env`.

On Linux with an NVIDIA GPU (and the NVIDIA Container Toolkit), uncomment the `deploy`
block on the `ollama` service. If `ollama ps` shows a CPU/GPU split, the model doesn't fit
in VRAM: use a smaller model, such as `OLLAMA_MODEL=llama3.2:1b`.

If Ollama isn't reachable or the model isn't pulled, the app still runs: the chat option is
hidden and written requests use the customer's text as-is.

## Services

| Service | Stack | Notes |
| --- | --- | --- |
| `web` | React + Vite | Proxies `/api` to the API. Source is bind-mounted with hot reload. |
| `api` | Express (TypeScript) | Verifies Keycloak access tokens, owns the app database, runs SQL migrations from `services/api/migrations` on startup. |
| `assistant` | Strands Agents + Llama 3.2 (Ollama) | Internal only. Turns the customer's open-ended description (written or chatted) into a README-style request document. Can use Claude instead (`ASSISTANT_PROVIDER=anthropic`). |
| `keycloak` | Keycloak 26 | Realm `kwot` is imported from `infra/keycloak/realm-kwot.json` on first start. |
| `postgres` | Postgres 17 | One instance with separate `kwot` and `keycloak` databases. On first start the API loads US ZIP centre points (`services/api/data/zip_centroids.csv`, from the Census Bureau's public 2025 Gazetteer files) for servicer radius matching. |
| `ollama` | Ollama | Serves the assistant's model; `ollama-pull` downloads it on first run. Internal only. |

Auth flow: the browser logs in with Keycloak (`kwot-web` public client, PKCE) and calls the
API with the access token. The API checks issuer, audience (`kwot-api`) and signature, and
maps the Keycloak user to a row in `users`, which holds the kwōt role.

After changing dependencies in a service's `package.json`, rebuild with `docker compose up --build`.
