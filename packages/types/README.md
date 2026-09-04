# @scout/types

TypeScript types generated from the Scout API's OpenAPI schema — the single
source of truth for the API contract consumed by `apps/web/src/lib/api-client.ts`
and the feature layers, plus `apps/extension` (auth, quick-save, detection).

## Files

- `openapi.json` — snapshot of the FastAPI schema (`GET /openapi.json`).
- `src/generated.ts` — faithful dump produced by `openapi-typescript`.
- `src/index.ts` — ergonomic, stable aliases over the generated surface. **Import
  from here**, never from `generated.ts` directly.

## Regenerate

After the API's request/response schemas change:

```bash
pnpm generate:types          # from the repo root
# or, step by step:
cd apps/api && python scripts/export_openapi.py
cd packages/types && pnpm generate
```

Commit both `openapi.json` and `src/generated.ts` so consumers build without
the API running.
