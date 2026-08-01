# seyhoun

Helm chart for [Seyhoun](../../README.md) — deploys the app (Go API + built-in SPA), with
optional Ingress, Gateway API, and a bundled Postgres.

## Prerequisites

This chart never creates or generates secrets. Before installing, create:

1. A secret holding the JWT signing key:
   ```bash
   kubectl create secret generic seyhoun-auth \
     --from-literal=jwt-secret=$(openssl rand -hex 32)
   ```
2. A secret holding the Postgres password (key name must match `postgresql.auth.secretKeys.userPasswordKey`,
   default `password`):
   ```bash
   kubectl create secret generic seyhoun-postgres-auth \
     --from-literal=password=$(openssl rand -hex 24)
   ```
   If pointing at an external Postgres instead of the bundled one, this can be any secret/key —
   set `database.existingSecret` / `database.existingSecretPasswordKey` accordingly.

## Install

Bundled Postgres:

```bash
helm dependency build
helm install seyhoun . \
  --set auth.existingSecret=seyhoun-auth \
  --set postgresql.enabled=true \
  --set postgresql.auth.existingSecret=seyhoun-postgres-auth
```

External Postgres:

```bash
helm install seyhoun . \
  --set auth.existingSecret=seyhoun-auth \
  --set database.host=my-postgres.internal \
  --set database.existingSecret=seyhoun-db-auth
```

Migrations run automatically as a pre-install/pre-upgrade Helm hook Job before the app rolls out
(`migrations.enabled: true` by default).

## Key values

| Key | Default | Description |
|---|---|---|
| `image.repository` | `seyhoun` | Set to your registry, e.g. `ghcr.io/<org>/seyhoun` |
| `image.tag` | `.Chart.AppVersion` | Image tag |
| `replicaCount` | `1` | Ignored when `autoscaling.enabled` |
| `service.port` | `80` | Service port (targets container port `server.port`) |
| `server.port` | `1374` | Container/app port |
| `auth.existingSecret` | `""` | **Required.** Secret with the JWT signing key |
| `auth.jwtSecretKey` | `jwt-secret` | Key inside that secret |
| `database.host` | `""` | Required when `postgresql.enabled=false`; auto-derived from the bundled subchart otherwise |
| `database.existingSecret` | `""` | Secret with the DB password. Falls back to `postgresql.auth.existingSecret` when `postgresql.enabled=true` |
| `postgresql.enabled` | `false` | Bundle Postgres via the `bitnami/postgresql` subchart |
| `postgresql.auth.existingSecret` | `""` | Required when `postgresql.enabled=true` |
| `migrations.enabled` | `true` | Run `seyhoun-migrate up` as a Helm hook Job before install/upgrade |
| `ingress.enabled` | `false` | Classic `networking.k8s.io/v1` Ingress |
| `gatewayApi.enabled` | `false` | `HTTPRoute` attaching to an existing Gateway (`gatewayApi.parentRefs`) |
| `autoscaling.enabled` | `false` | HPA on CPU utilization |

See `values.yaml` for the full list, including `extraEnv`, `extraVolumes`, probes, and resources.

## Notes

- `database.user` / `database.name` (default `seyhoun` / `seyhoun`) must match
  `postgresql.auth.username` / `postgresql.auth.database` when the bundled Postgres is used —
  they're independent values by design (no bundled-Postgres coupling beyond host/port), so keep
  them in sync if you change one.
- Ingress and Gateway API are independently toggleable — enable both if you need to serve
  different environments differently, or just one.
