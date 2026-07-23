# API

The Form Forge backend is a REST API described by an OpenAPI spec. The web app
and the desktop app both talk to it, and you can call it directly.

## Browse it

Every running instance serves interactive API docs (Swagger UI) at:

```
http://<your-host>:8081/swagger-ui/
```

For a local development server that is <http://localhost:8081/swagger-ui/>.

The raw spec lives in the repository at `packages/api-spec/openapi.yaml`, and a
generated TypeScript client sits alongside it in `packages/api-spec`.

## Endpoints

| Method | Path | What it does |
| --- | --- | --- |
| `GET` | `/health` | Health check |
| `POST` | `/sheets` | Upload a fillable PDF and create a sheet |
| `GET` | `/sheets/{sheet_id}` | Get a download URL for the (modified) PDF |
| `GET` | `/sheets/{sheet_id}/fields` | List the form fields detected on a sheet |
| `GET` | `/dnd5e/action-types` | List the available calculation types |
| `GET` | `/dnd5e/{sheet_id}/actions` | List the calculations attached to a sheet |
| `POST` | `/dnd5e/{sheet_id}/actions` | Attach a calculation to a sheet |

See the Swagger UI for request and response schemas, status codes, and
examples.
