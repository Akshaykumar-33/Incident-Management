# Recent changes (synthetic)

## checkout-api

- **2026-11-11 08:42 UTC** — Feature flag `tax_config_v2` rolled to 100%.
  Previous canary was 5%. Owners: payments platform.
- **2026-11-10** — Added region rate table for EU. India (`IN-*`) rows were
  left as TODO in the config PR description.
- **2026-11-09** — Increased checkout timeout from 3s to 5s (unrelated).

## Related alerts

- Synthetic pager note: `checkout-api 5xx` started firing at 08:48 UTC.
