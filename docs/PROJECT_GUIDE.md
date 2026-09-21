# Art Men's Salon: Project Guide

Yeh guide is project ko samajhne ke liye hai: kya bana hai, kaam kaise chalta hai, backend aur Neon kaisa hai, aur code kisi aur ko dena ho to kya karna hai.

Saath mein dekhein: `docs/Art_Salon_Dev_Spec.md` (business ke rules), `docs/art-saloon.html` (dikhne ka nakshah), `docs/ARCHITECTURE.md` (folders ke usool).

---

## 1. Yeh kya hai

Ek mard salon (Karachi) ka **POS aur hisaab kitab** system. Kaagaz ke register ki jagah. Do masle hal karta hai:

1. **Roz raat ka cash milana**: drawer mein kitna hona chahiye (expected) aur asal mein kitna hai (counted), farq ki wajah ke saath.
2. **Mahine ka saaf hisaab**: sales, kharche, staff ki tankhwah, **net profit**, aur har partner ka hissa.

Owner apne phone se live dekh sakta hai.

**Sabse bada usool:** paise ki entry (bill, kharcha, payment) kabhi **edit ya delete nahi** hoti, sirf **cancel** hoti hai (nayi entry se). Purani entry record mein rehti hai. Yeh database ke andar bhi laga hua hai (section 7).

---

## 2. Kaun kya kar sakta hai

Sirf **2 log login** karte hain. Staff (karigar) login nahi karte, wo sirf **4-digit PIN** se paise milne ki tasdeeq karte hain.

| | Owner | Manager (counter) | Staff |
|---|---|---|---|
| Bill banana, kharche, advance, worksheet, day close, daily report, staff khata | Haan | Haan | Nahi (sirf PIN) |
| Staff, prices, deals badalna | Haan | Nahi | Nahi |
| Overview, monthly report, monthly expenses | Haan | **Nahi** | Nahi |
| Capital, partners, month close | Haan | **Nahi** | Nahi |
| Password badalna | Apna + Manager ka | Apna | Nahi |
| Kisi bhi paise ki entry edit/delete | **Koi nahi** | **Koi nahi** | Nahi |

---

## 3. Roz ka flow

```
SUBAH
  Naya din khud khulta hai (kal ki ginti hui cash opening ban jati hai)

DIN BHAR (Manager)
  Billing ─► customer ki bill: service/deal chuno, har service par kaun karigar, cash/online
  Daily folders ─► chai/kharcha, staff ko advance (staff ke PIN se), Owner ne cash liya/diya (Owner ke PIN se)
  Daily worksheet ─► register jaisa: har karigar ka column, neeche total, "quick add"

RAAT (Manager) ─► Day close, 5 qadam
  1. Attendance (kaun aaya)
  2. Staff ki kamai (commission + daily wage) khud hisaab hoti hai
  3. Staff ko payment (unke PIN se)
  4. Drawer ki cash gin kar total likhna  (expected abhi CHHUPA rehta hai)
  5. Expected vs counted, farq ki wajah, phir "Close day"
     ─► din lock, security code Owner ko, agla din khulta hai

MAHINA (Owner)
  Monthly expenses (rent, bijli, others) ─► Capital (solar jaisi investment)
  ─► Monthly report (net profit, Owner account) ─► Partners (hissa, drawings)
  ─► Month close (mahina freeze, salaries khata mein)
```

---

## 4. Screens

**Counter (Owner + Manager)**

| Screen | Kaam |
|---|---|
| Billing | Bill banana, customer phone se dhoondna (special rate khud), deals, split payment, aaj ki bills, bill cancel |
| Daily worksheet | Register jaisa grid, Owner/Account column, quick add |
| Daily folders | Expenses, staff advance, Owner cash, online payments |
| Day close | Raat ka 5-qadam wizard, agla din shuru |
| Daily report | Kisi bhi din ki saari bills (cancelled bhi) |
| Staff khata | Har staff ka chalta hisaab (kamai jama, payment/advance kam) |

**Owner**

| Screen | Kaam |
|---|---|
| Overview | Live sales, drawer cash, 7 din ka chart, alerts, recent activity |
| Monthly report | Profit and loss, Owner account, band dinon ki list, Month close |
| Monthly expenses | Fixed lines (rent...) aur others (reason ke saath) |
| Capital / Outstanding | Partner ki investment aur kiston mein wapsi |
| Partners | Profit share %, partner accounts, profit drawn |
| Staff & rates | Staff (pay type, PIN), services, deals |
| Settings | Password, Owner PIN, Manager ka password reset |

---

## 5. Technology

| Cheez | Kya |
|---|---|
| Framework | **Next.js 16** (App Router) + TypeScript |
| UI | **shadcn/ui** + Tailwind CSS 4 (rang `src/app/globals.css` mein) |
| Database | **PostgreSQL**, cloud par **Neon** |
| ORM | **Drizzle** (tables ka code + migrations) |
| Login | **Better Auth** (username + password, cookie session) |
| Validation | **Zod** (har form/action par) |
| Tests | **Vitest** (130 tests) |

**Paisa:** hamesha poore rupay ka `integer`, kabhi decimal nahi. Commission aur deal split ka rounding sirf ek jagah (`src/lib/accounting`).

**Business date:** din ki tareekh gharri se nahi badalti. Sirf **Day close** karne par agla din khulta hai. (Raat 2 baje bhi bill usi din ki hoti hai jo abhi khula hai.)

---

## 6. Backend kaisa hai

**Alag backend server nahi hai.** Next.js hi backend hai. Browser ko sirf pages milte hain, aur jab kuch save karna ho to **Server Action** (server par chalne wala function) chalta hai.

### Ek page kaise banta hai (dekhna)

```
Browser ─► proxy.ts (cookie hai? nahi to /login)
       ─► page.tsx (server)
            ├─ requireUser() / requireRole("owner")     ← asal security check yahan
            └─ queries.ts ─► Postgres (Neon)            ← data padhna
       ◄─ HTML + chhote client components
```

### Kuch save karna (likhna)

```
Form ─► actions.ts   ("use server")
          ├─ requireUser()/requireRole()      kaun hai, ijazat hai?
          ├─ Zod schema                       data theek hai?
          └─ service.ts
               ├─ PIN check (galat PIN audit + 5 baar par lock)
               ├─ hisaab: src/lib/accounting  (pure functions)
               └─ ek DATABASE TRANSACTION:  entry + khata + audit log, sab ya kuch nahi
```

**Browser par bharosa nahi:** bill ka amount browser se nahi aata. Browser sirf "kaunsi service, kaun karigar" bhejta hai. Qeemat, special rate, deal ka batwara, expected cash, sab **server khud dobara nikalta hai**.

### Har feature ka andar ka nazm

`src/features/<naam>/`

| File | Kaam |
|---|---|
| `components/` | Sirf dikhana (React) |
| `actions.ts` | Server actions: check + service ko bulana |
| `service.ts` | Database mein likhne wala kaam (transaction) |
| `queries.ts` | Sirf padhna |
| `schemas.ts` | Zod: kya data theek hai |
| `types.ts` | Server se screen tak jane wale saade data ki shakal |

### Hisaab alag jagah: `src/lib/accounting/`

Commission, deal split, expected cash, day profit, net profit, partner shares, capital... **pure functions** hain (na React, na database) aur unke tests hain. Formula badalna ho to sirf yahan badlein, koi screen nahi tootegi.

---

## 7. Neon aur Database

**Neon** = cloud par chalne wala Postgres. Aap ko sirf ek **connection string** milti hai (`DATABASE_URL`), app usse jud kar data rakhti hai.

- **Do connection strings:** `DATABASE_URL` (pooled, app ke liye) aur `DATABASE_URL_UNPOOLED` (seedha, migrations ke liye). Sirf ek ho to migrations usi se chalti hain.
- **Branches:** Neon database ki copy git branch ki tarah bana sakta hai. `production` asli hai. Testing ke liye alag branch use karein.
- Neon ka free plan chhote kaam ke liye kaafi hai; asli paisa aane par backup ka intezam karein.

### Tables (27)

| Group | Tables | Edit ho sakta hai? |
|---|---|---|
| Setup | `services`, `deals`, `deal_items`, `staff`, `customers`, `customer_special_rates`, `partners`, `fixed_expense_lines` | Haan (sirf aage ke liye; hatate nahi, "inactive" karte hain) |
| Din ki halat | `business_days`, `attendance` | Sirf din khulna/band hona |
| **Paise ki entries** | `bills`, `bill_lines`, `bill_cancellations`, `cash_entries`, `khata_entries`, `day_snapshots`, `monthly_expenses`, `capital_items`, `capital_contributions`, `capital_repayments`, `partner_drawings`, `month_closes`, `audit_log` | **Kabhi nahi** (database trigger rokta hai) |
| Login | `user`, `session`, `account`, `verification` | Better Auth sambhalta hai |

### "Edit/delete nahi" database mein laga hai

`drizzle/0001_append_only.sql` aur baad ki migrations mein ek trigger hai jo paise wali tables par `UPDATE` aur `DELETE` par error deta hai (`financial records are append-only`). Yani kisi bug ya ghalti se bhi purani entry nahi badal sakti.

**Ghalti kaise sudharte hain:** cancel. Bill cancel = `bill_cancellations` ki nayi row + ek **reversal bill** (minus amount). Kharcha cancel = minus wali nayi row. Sab dikhta rehta hai, aur jama hamesha sahi rehta hai.

### Migrations

Schema `src/db/schema/*.ts` mein hai. Badalne ke baad:

```bash
pnpm db:generate   # naya migration file banata hai (drizzle/ folder)
pnpm db:migrate    # database par lagata hai
```

Purani migration files kabhi edit na karein, hamesha nayi banayein.

---

## 8. Security aur hifazat

| Cheez | Kaise |
|---|---|
| Login | Username + password, sirf Owner aur Manager. Website se naya account nahi banta |
| Do darje ki jaanch | `proxy.ts` jaldi cookie dekhta hai; **asal jaanch har page/action khud** karta hai |
| Roles | Owner-only pages Manager ke liye `/billing` par wapas bhej dete hain |
| Staff PIN / Owner PIN | Hash karke rakhe jate hain, wapas padhe nahi ja sakte, sirf reset |
| Galat PIN | Audit log mein (failed), **5 galat par 15 minute lock** (PIN sirf 10,000 mumkin hain) |
| Password | 8+ characters, sirf numbers nahi; galat try ka lock; badalne par baaki devices sign out |
| Audit log | Har zaroori kaam: kisne, kab, kya (secret kabhi nahi likha jata) |
| Security code | Har din band hone par ek code banta hai jo **kal ke code + aaj ki saari bills/entries** se hash hota hai. Purani entry badle to code match nahi karega |
| Din lock | Band din mein entry nahi ho sakti |
| Mahina freeze | Month close par report aur partners ke shares **save** ho jate hain. Baad mein salary ya share % badle to purana mahina nahi badalta. Har screen band mahine mein badlaav se inkaar karti hai |
| Secrets | `.env.local` git mein nahi jata |

---

## 9. Folder map

```
src/
  app/              Sirf pages (route). Patli files, koi hisaab nahi
    (auth)/login    Login page
    (app)/...       Baaki saari screens (sidebar ke saath)
    api/auth/       Better Auth ka endpoint
  proxy.ts          Bina login walon ko /login bhejna (jaldi jaanch)
  features/<naam>/  Har screen ka apna components/actions/service/queries
  components/       Shared UI (sidebar, stat card, form dialog...) aur ui/ (shadcn)
  lib/
    accounting/     ★ Saara hisaab (pure, tested)
    auth/           Login ke helpers, roles, session check
    security-code.ts, pin.ts, format.ts, business-date.ts ...
  db/
    schema/         Tables ka code
    queries/        Kai screens mein use hone wali reads
    audit.ts, pin-guard.ts
drizzle/            Migrations (SQL)
scripts/            Seed scripts (shuruati data)
docs/               Spec, prototype, yeh guide
```

**Kuch badalna ho to kahan jayein**

| Kya | Kahan |
|---|---|
| Commission / deal split / expected cash / net profit ka formula | `src/lib/accounting/*.ts` (aur uska test) |
| Naya screen | `src/features/<naam>/` + `src/app/(app)/<naam>/page.tsx` + `components/app-shell/nav-config.ts` |
| Sidebar mein kya dikhe / kis role ko | `src/components/app-shell/nav-config.ts` |
| Rang, font | `src/app/globals.css` |
| Naya column/table | `src/db/schema/` phir `pnpm db:generate` aur `pnpm db:migrate` |
| Kaun kya kar sakta hai | `src/lib/auth/roles.ts` aur har page ka `requireRole(...)` |

---

## 10. Commands

```bash
pnpm dev               # chalana (http://localhost:3000)
pnpm test              # 130 tests
pnpm lint
pnpm build             # production build
pnpm db:migrate        # tables banana/update
pnpm db:seed           # Owner aur Manager ke accounts (password khud banta hai aur screen par aata hai)
pnpm db:seed:sample    # sample services, deals, staff, customers, pehla din
pnpm db:seed:accounts  # 2 sample partners aur 4 fixed lines (rent, bijli...)
pnpm db:studio         # database dekhne ki screen
```

Sample staff PIN: **Arshad 1111, Hamid 2222, Sherry 3333**. Owner ka PIN `db:seed` khud banata hai aur screen par dikhata hai. Asli use se pehle sab kuch **Settings** aur **Staff & rates** se badlein.

---

## 11. Yeh code kisi dost ko dena ho to

### Kya dena hai
Sirf **GitHub repo ka link**. Repo mein koi secret nahi hai (check kar liya). Repo **private** rakhein aur dost ko **Collaborator** banayen (GitHub, Settings, Collaborators). Ya wo apne GitHub par fork kare.

### Kya NAHI dena
| Cheez | Kyun |
|---|---|
| `.env.local` file | Is mein database ka password aur login ka secret hai |
| Neon ki connection string | Neon mein role ka password **poore project** ka hota hai, branch ka nahi. String de di to dost aap ke asli data tak pahunch sakta hai |
| Owner/Manager ka password, PIN | Seed script har jagah naye banata hai |

### Dost ko **apna database** banana hai (ye sab se surakshit tareeqa)

Dost ko aap ke Neon ki zaroorat **nahi**. Wo apna free Neon (ya local Postgres) bana kar chalaye. Us ka data aap ke data se bilkul alag hoga.

1. **Zaroori software:** Node.js 20 ya naya, aur `pnpm` (`npm i -g pnpm`).
2. Repo clone karein: `git clone <repo-link>` phir folder mein jayein.
3. `pnpm install`
4. **Database banayein** (koi ek):
   - **Neon:** https://neon.tech par free account, naya project, "Connection string" copy karein (pooled).
   - **Ya local Postgres:** Docker se `docker run -e POSTGRES_PASSWORD=pass -p 5432:5432 postgres`, aur string `postgres://postgres:pass@localhost:5432/postgres`.
5. `.env.example` ko **`.env.local`** naam se copy karein aur bharein:
   ```
   DATABASE_URL=<uski apni connection string>
   BETTER_AUTH_SECRET=<koi lambi random cheez>
   BETTER_AUTH_URL=http://localhost:3000
   ```
   Random secret ke liye: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`
6. Tables aur shuruati data:
   ```bash
   pnpm db:migrate
   pnpm db:seed          # Owner/Manager ke password screen par aayenge, note kar lein
   pnpm db:seed:sample
   pnpm db:seed:accounts
   ```
7. `pnpm dev` phir http://localhost:3000, username `owner` ya `manager`.

**Yeh maine khud aazmaya hai:** naya clone, khali Neon database, sirf yehi steps: migrations, seeds, 130 tests, build, aur sign-in sab chale.

### Agar wo aap ka hi database use kare (na karna behtar)
Behtar hai ke pehle `neon branches create --name friend` se alag branch banayen, magar upar wali wajah se password phir bhi poore project ka hai. Agar dena hi pade to baad mein Neon dashboard se **role ka password reset** kar lein.

---

## 12. Testing

- `pnpm test`: 130 tests. Hisaab ke saare formula, deal split, day close, security code, partners, month close ke rules, sab spec ke asli misaalon se.
- Har screen ko maine browser mein asli data par chalaya aur numbers **haath ke hisaab se** milaye.
- **Test data ka usool:** asli database par test karte waqt pehle poori backup, test, phir hubahu wapas.

---

## 13. Abhi kya baaki hai

| Cheez | Halat |
|---|---|
| **Deployment (Vercel)** | Baad mein (plan mein hai) |
| Asli data (staff, PIN, prices, partners ke naam) | Owner khud daalega |
| Receipt print / thermal printer | Jaan-boojh kar chhoda |
| WhatsApp par summary/receipt bhejna | Abhi sirf preview |
| Band din ki bill cancel (sirf Owner), din dobara kholna | Nahi bana |
| Staff ki monthly receipt, bonus dena | Nahi bana |
| Band mahine ki galti agle mahine adjustment se sudharna | Nahi bana (abhi sirf rok hai) |
| Owner ko 3+ cancel ka alert bhejna | Sirf screen par note |
| Backup/restore ka pukka intezam, offline mode | Phase 4 |
| Customer ke special rates ki edit screen | Nahi bana |
