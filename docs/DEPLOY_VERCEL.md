# Deploy on Vercel

Two databases, on purpose:

| Neon branch | Used by | Contents |
|---|---|---|
| `production` (Neon's default) | Your computer (`.env.local`) | Test and sample data. Safe to break |
| `live` | The website on Vercel | Real salon data only |

Local testing never touches the live data as long as `.env.local` points at the dev branch.

## First deploy

1. Vercel: open the project, Settings, Environment Variables.
2. Paste the four variables (see `.env.example` for what each is):
   - `DATABASE_URL`: the **pooled** Neon string of the `live` branch
   - `DATABASE_URL_UNPOOLED`: the **direct** string of the same branch (only migrations use it)
   - `BETTER_AUTH_SECRET`: a long random value, different from the one on your computer
   - `BETTER_AUTH_URL`: the site's address, e.g. `https://art-man.vercel.app` (no slash at the end)
   Set them for **Production** only, so Preview deployments can never touch the live data.
3. Deployments, latest one, Redeploy. Variables only apply to new deployments.
4. Open the site and sign in as `owner`. Then Settings: change both passwords and the Owner PIN.
5. Enter the real data (as Owner): Staff & rates (staff with PINs, services, deals), Partners (real names and shares), then Day close, "Open the first business day".

## Later changes to the database

Tables are created by migrations. After you change `src/db/schema`:

```bash
pnpm db:generate          # makes the migration file, commit it
# then apply it to the live database (use the live direct string):
DATABASE_URL_UNPOOLED="<live direct string>" pnpm db:migrate
```

Apply the migration **before** (or together with) deploying code that needs it.

## Notes

- Region: Vercel's default (Washington DC) is close to Neon's `us-east-2` (Ohio).
- Vercel's free Hobby plan is for non-commercial use. A salon is a business, so use a paid plan.
- Once the data is real, use a Neon plan that keeps enough history to restore from, and keep your own backups.
