# Polar Plan Map

Use this file as the human-readable source for how Polar products map into the app.
Keep the real product IDs in `.env.local`, and keep this file updated for quick reference.

## Internal plan keys

- `free`
- `basic`
- `pro`
- `ultra`
- `pro_weekly`

## Mapping table

| Product Name | Internal Tier | Billing Cadence | Env Var |
| --- | --- | --- | --- |
| Basic Monthly | `basic` | `monthly` | `POLAR_PRODUCT_BASIC_MONTHLY_ID` |
| Basic Yearly | `basic` | `yearly` | `POLAR_PRODUCT_BASIC_YEARLY_ID` |
| Pro Monthly | `pro` | `monthly` | `POLAR_PRODUCT_PRO_MONTHLY_ID` |
| Pro Yearly | `pro` | `yearly` | `POLAR_PRODUCT_PRO_YEARLY_ID` |
| Ultra Monthly | `ultra` | `monthly` | `POLAR_PRODUCT_ULTRA_MONTHLY_ID` |
| Ultra Yearly | `ultra` | `yearly` | `POLAR_PRODUCT_ULTRA_YEARLY_ID` |
| Pro Weekly | `pro_weekly` | `weekly` | `POLAR_PRODUCT_PRO_WEEKLY_ID` |

## Suggested `.env.local` entries

```env
POLAR_SERVER=sandbox
POLAR_ACCESS_TOKEN=polar_oat_xxx
POLAR_WEBHOOK_SECRET=whsec_xxx

POLAR_PRODUCT_BASIC_MONTHLY_ID=
POLAR_PRODUCT_BASIC_YEARLY_ID=
POLAR_PRODUCT_PRO_MONTHLY_ID=
POLAR_PRODUCT_PRO_YEARLY_ID=
POLAR_PRODUCT_ULTRA_MONTHLY_ID=
POLAR_PRODUCT_ULTRA_YEARLY_ID=
POLAR_PRODUCT_PRO_WEEKLY_ID=
```

## Webhook endpoint setup

- Local testing (ngrok): point Polar webhook to your ngrok URL ending with `/api/webhooks/polar`.
- Production (Vercel): point Polar webhook to `https://your-domain.com/api/webhooks/polar`.
- Do not keep ngrok URLs in production webhook settings.
