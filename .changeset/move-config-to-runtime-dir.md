---
"pi-multi-auth": minor
---

Move runtime configuration from the package-root `config.json` to `multi-auth-config.json` under Pi's runtime directory (`~/.pi/agent/`, respecting `PI_DELEGATED_AUTH_RUNTIME_DIR` / `PI_CODING_AGENT_DIR`). Configuration now lives alongside `multi-auth.json` and the usage cache instead of inside the extension package, so it survives reinstalls and `/reload`. On first load after upgrade, a legacy `config.json` at the extension root is migrated to the new location and removed.
