# Fixture app repo

Tiny broken storefront pricing module used when
`BUG_FIX_USE_FIXTURE=1`. The bug: `discountBanner("SAVE10")` claims 10%
off, but `applyDiscount` compares against `SAVE100` so the total never
drops.

```bash
node --test
```
