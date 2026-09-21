# Art Men's Salon — POS & Accounts System
## Developer Flow & Specification (for the Next.js build)

**Status:** functional spec for the approved prototype. The HTML file `art-saloon.html` is the **approved UX/visual reference** — build the Next.js app to match its look, layout and flows. This document explains *what the system does and why*; the HTML shows *how it should look*.

**Audience:** the developer(s) who will build the production system in Next.js.

**Currency:** PKR (Rs). All money uses tabular/monospaced digits in the UI.

---

## 1. What the system is for
A single men's salon in Karachi. It replaces a paper register. Two problems it must solve every day:

1. **Daily cash match** — every night, the cash that *should* be in the drawer (expected) vs what *actually* is (counted) must reconcile, with any difference explained.
2. **Clean monthly accounts** — at month end, sales, expenses, staff pay and **net profit** are unambiguous, and each **partner** can see their share.

The owner must be able to see live status from his phone.

**Design principle throughout:** the software should mirror how the salon already works on paper (per-person columns, running staff ledgers, month-end settlements) so training is minimal. Keep the UX extremely simple.

---

## 2. Roles & access
Three actors. **Only Owner and Manager log in.** Staff never log in and have no PIN.

> **Changed 2026-09-22 (client decision).** Staff used to confirm receipt of money with a 4-digit PIN. The client asked for this to be removed and wanted no replacement. Staff advances and payments are now recorded on the Manager's word alone. The **Owner's** PIN is unchanged: the Owner still confirms cash taken from or added to the drawer. The trade-off was put to the client: without the staff PIN, neither side has evidence if a payment is later disputed.

| Role | Who | Can do |
|---|---|---|
| **Super Admin / Owner** | Saud Sahab | Everything: rates, staff pay, bonuses, monthly accounts, net profit, partners, capital, month close. |
| **Manager (Admin)** | Counter person | Billing, daily expenses, staff payments, day close, daily reports, staff khata (balances). **Cannot** see monthly totals, net profit, rent, partner accounts or capital. |
| **Staff (Karigar)** | Arshad, Hamid, Sherry… | No login, no PIN. Their earnings and payments are recorded by the Manager. |

**Default landing = Manager**, on the Billing screen. Owner is an explicit switch/login, never the default.

**Access matrix (key rows):**

| Action | Owner | Manager |
|---|---|---|
| Billing, daily expenses, staff payments, day close, daily reports, staff khata | ✓ | ✓ |
| Cancel *today's* bill (reason required) | ✓ | ✓ |
| Cancel a bill in a *closed day* (before month close) | ✓ | — |
| Reopen a closed day | ✓ | — |
| Monthly expenses, capital/outstanding, rates/deals/special rates | ✓ | — |
| Staff salary/commission, bonuses | ✓ | — |
| Monthly report, net profit, Owner account, Partners, Month close | ✓ | — |
| **Edit or delete any financial entry** | **No** | **No** |

> **Config vs financial entries (critical distinction).**
> - **Financial entries** (bills, payments, cash movements) are **never edited or deleted** — not even by the Owner. Mistakes are fixed by **voiding** the entry and creating a corrected one; both stay in the record (see §11 Audit).
> - **Configuration** (staff, services, prices, commission %, partner %) **can be edited**, but changes **apply forward only** — past records never recompute. Prefer **deactivate** over delete for staff/services so history is preserved.

---

## 3. Core domain objects (data model)
Model these as first-class entities. Field lists are the minimum; add ids, timestamps, `active` flags, and `createdBy`.

- **Service** — `{ id, name, category, price, active }`. Owner-managed (CRUD).
- **Deal** — `{ id, name, price, serviceIds[], active }`. A bundle sold at a fixed price; the price is **split across its services by list price** so each staff member earns correct commission (see §6.3).
- **Staff** — `{ id, name, payType (1|2|3), salary, dailyWage, commissionRate, active }`.
  - Type 1: monthly salary only.
  - Type 2: monthly salary + commission.
  - Type 3: daily wage + commission.
- **Customer** — `{ id, phone, name, visits, lastVisit, specialRates:{serviceId:price} }`. Looked up by phone; special rate auto-applies.
- **Bill** — `{ no, businessDate, time, customerId, lines:[{serviceId, name, amount, staffId}], cash, online, status: active|cancelled, reason, voidOf? }`.
- **CashFolderEntry** — one of four folders (see §5.2): `{ type: expense|staff|ownerCash|online, amount, businessDate, meta, pinConfirmed?, status, voidOf? }`. `pinConfirmed` applies to Owner cash only.
- **KhataEntry (staff ledger line)** — `{ staffId, businessDate, kind: earning|payment|advance|bonus|adjustment, label, amount(+/−) }`.
- **DaySnapshot** — created at Day Close: `{ businessDate, sale, cash, online, expenses, staffPaid, dayProfit, openingCash, expectedCash, countedCash, difference, diffReason, securityCode, locked:true }`.
- **MonthlyExpense** — `{ month, kind: fixed|other, label, amount, reason? }`.
- **CapitalItem** — `{ id, name, totalCost, contributions:[{partnerId, amount}], repayments:[{date, partnerId, amount}] }`.
- **Partner** — `{ id, name, sharePct }` (shares sum to 100).
- **AuditLog** — `{ actor, action, target, before, after, timestamp, success }` (includes failed attempts).

> **Business date, not clock date.** An entry after midnight belongs to the **business day that is still open**. The date does not roll over on the clock — it rolls over only when the day is closed. A new day cannot start until the previous day is closed.

---

## 4. Screen map
**Counter section (Manager + Owner):**
`Billing` · `Daily worksheet` · `Daily folders` · `Day close` · `Daily report` · `Staff khata`

**Owner section (Owner only):**
`Overview` · `Monthly report` · `Monthly expenses` · `Capital / Outstanding` · `Partners` · `Staff & rates`

---

## 5. Daily operations

### 5.1 Billing
- Search/select services (and deals) into a cart. Each line records **which staff member** performed it → commission is derived from this.
- **"One person did everything" shortcut:** a single staff picker that assigns one staff member to **all** cart lines at once; per-line override still allowed for mixed cases.
- Payment: **Cash**, **Online (QR)**, or a mix of both.
- Customer lookup by phone loads visit history and any **special rate** (e.g. a fixed haircut price for a regular). Special rates auto-apply.
- Every bill prints a **receipt**.
- Commission is calculated on the **amount actually charged** (special rate / deal share), not the list price.

### 5.2 Daily folders (four)
1. **Expenses** — tea, lunch, towels, etc. If the owner paid an expense from his own pocket/bank instead of the drawer, record that separately (it doesn't leave the drawer).
2. **Staff** — advances, or paying a staff member their earning (commission/wage/bonus). Recorded by the Manager; no confirmation (see §2).
3. **Owner cash** — owner took cash from the drawer (personal / bank deposit) or added cash (change). **Confirmed by the owner's PIN.**
4. **Online** — QR/online payments. These go **straight to the owner's bank** and **never enter the drawer** — so they are excluded from the cash-drawer formula.

### 5.3 Daily worksheet (the paper method)
A grid that mirrors the salon's register:
- **One column per active staff member**, plus a final **"Owner / Account"** column for online/account money that goes directly to the owner.
- Each billed service is a **row** in the relevant staff column (the amount). Column totals at the bottom; grand total for the day.
- It is a **view of the same underlying bills + folder data**, not a separate ledger.
- Optional **quick-add** per column (amount → Enter) that creates a minimal same-day bill so commission and day-close stay correct.

### 5.4 Day Close (nightly reconciliation)
Runs in this order:
1. **Attendance** — mark which daily-wage staff were present.
2. **Staff earnings** — system computes each staff member's earning for the day (commission + daily wage).
3. **Staff payments** — the Manager records what was handed over. No confirmation (see §2).
4. **Cash count** — Manager enters notes by denomination (5000 × n, 1000 × n …). System reveals expected only **after** counting (honest count).
5. **Difference** — short → reason **required**; extra → recorded too.
6. **Lock** — day locks; no further entries. A **daily summary + security code** goes to the owner on WhatsApp.

**Expected-cash formula:**
```
Opening cash (yesterday's leftover, auto-carried)
+ today's CASH sales
+ owner added to drawer
− today's expenses paid from drawer
− staff advances
− staff payments (commission / wage / bonus / salary)
− owner took from drawer
= Expected cash (drawer should hold this)
```
Online payments are **not** in this formula (never enter the drawer).

**Per-day P&L snapshot** (stored on close, drives the monthly report):
```
Day sale      = cash sales + online sales
Day expenses  = expenses paid that day
Day staff pay = staff earnings that day (commission + wage + bonus)   [see §7 note]
Day profit    = Day sale − Day expenses − Day staff pay
```

**Rules:** previous day must be closed before a new day starts; only the **Owner** can reopen a closed day (recorded); the first day's opening cash is entered by the Owner, thereafter it auto-carries.

### 5.5 Offline fallback
If internet/power is down, the counter uses a **numbered manual bill book**; when back online, all bills are entered **before** that day's Day Close, tagged with the bill-book number. Recommend UPS + a 4G backup device. (For Next.js: design for an offline-tolerant entry path / later PWA.)

---

## 6. Staff pay & the Khata

### 6.1 Pay types
| Type | Salary | Daily wage | Commission |
|---|---|---|---|
| 1 — Monthly salary | fixed | — | — |
| 2 — Salary + commission | fixed | — | % of work |
| 3 — Daily wage + commission | — | per present day | % of work |

- **Bonus:** Owner can give any staff member any amount at any time, **with a reason**.
- **Material cost is not deducted** — commission is on the full charged amount.
- Commission + daily wage compute **nightly at Day Close**; monthly salary is added at month end.

### 6.2 The Khata (running ledger) — the heart of staff pay
Each staff member has a **khata** like a shop account. Earnings **credit** it; payments/advances **debit** it; the remaining **balance** is what they're owed.
- **Daily or monthly, staff's choice:** they can take commission daily or leave it to accumulate. Anything not taken stays in the balance and is paid with salary.
- **Advance:** if a staff member takes more than they've earned, it's recorded as an **advance** and auto-adjusted against next month.
- **Cancelled bill:** if a bill is cancelled and its commission was already taken, that commission is **automatically reversed** from the staff member's khata.

**Worked example — Sherry (Type 3), one day:**
```
Work today                 5,000
Daily wage                   800
Commission (10% of 5,000)    500
Earning today              1,300
Paid today                −1,300
Balance                        0
```

### 6.3 Deal commission split
A deal's fixed price is split across its services **by list price**, and the parts always sum to the deal price. Commission is on the **split share**, not the list price.
```
VIP deal = Rs 2,000     List price   Deal share
Haircut                    800           533
Beard                      400           267
Facial                   1,800         1,200
Total                    3,000         2,000
```
If Hamid did the facial at 10%, his commission = 10% of 1,200 = **Rs 120**.

### 6.4 Staff monthly receipt
At month end (and provisionally mid-month), generate a per-staff printable statement:
- Dated **earnings** (commission / wage / bonus) and dated **takings** (payments / advances), then **payable now**.
- Mid-month copies are marked **"Provisional — may change at month end."** After Month Close they are **final**.
- Deliverable via print + WhatsApp.

### 6.5 Rate-change rule
Changing a staff member's rate/salary affects **future** calculations only; past records never change.

---

## 7. Monthly accounts

### 7.1 Net profit
```
Total sales (cash + online)
− daily expenses (sum of daily snapshots)
− monthly expenses (rent, bills, supplies, others)     [§8]
− staff earnings (salary + commission + wage + bonus)
= Net profit
```
**Two rules that keep the maths honest:**
- **A staff advance is NOT an expense.** The expense is what a staff member *earned*, not what they *withdrew*. Counting the advance too would subtract the same money twice.
- **Cash the owner took from the drawer is NOT an expense.** It's business money moving to the owner; counting it as an expense understates profit.

> **Implementation note:** the monthly figures should be the **sum of the daily snapshots** (§5.4) **plus** monthly/other expenses (§8). Do not hard-code monthly totals. Keep "staff pay" in the day snapshot vs "staff earnings" in the month consistent — settle on **staff *earnings*** as the expense line (advances excluded), and treat *payments/withdrawals* as cash movements only.

### 7.2 Owner account
The monthly report also shows how much of the profit has **reached the owner** and how much is **still in the business**.
```
Example A                              Rs
Net profit                        250,000
− Online received in owner's bank −100,000
− Cash owner took from drawer      −80,000
= Balance held by the business     70,000
```
If the owner paid a business cost (e.g. rent) from his **own** bank, that amount is **credited back** to him so the report never wrongly shows him as having over-drawn:
```
Example B                              Rs
Reached owner (online + cash)     180,000
− Owner paid rent from own bank    −60,000
= Net reached owner               120,000
Balance with business (250k−120k) 130,000
```

### 7.3 Partners
- Partners each hold a **profit-share %** (default sample 50/50), **editable by the Owner**; shares must sum to 100%.
- Each partner has a **panel/tab** showing: their **share of net profit**, **capital they injected** (§8), **repayments received**, and **net position**.
- Changing a % recomputes all partners' shares. Editing the % is **forward-looking** for future months; label historical months as settled.

### 7.4 Month Close
Owner reviews the monthly report, then **Month Close**:
- The month **freezes** — no entry can be cancelled. Later corrections become an **adjustment entry in the next month**.
- Staff monthly slips finalise (drop the "Provisional" marker).

---

## 8. Monthly expenses, capital & outstanding (Owner only)

### 8.1 Monthly expenses
- **Fixed** recurring lines: Rent, Electricity, Internet/Bills, Supplies (Owner can add fixed lines).
- **Others:** ad-hoc entries, each with **amount + reason (required)**.
- These feed the monthly net-profit expense side (§7.1).

### 8.2 Capital / Outstanding (partner-funded investments)
For large one-off investments funded by a partner and **repaid to that partner in installments** (e.g. a solar system):
- Record: **name**, **total cost**, and **which partner(s) contributed how much**.
- This is **capital, not an operating expense** → it **does not reduce net profit**. It creates a **liability owed to the contributing partner**.
- Record **repayments** (installments) back to that partner over time; show **total / paid / remaining** and a repayment history.
- Repayments are **cash movements** (business → partner), not expenses and not profit.

```
Example: Solar system, total 300,000, funded by Partner A 300,000
  → Business owes Partner A: 300,000  (outstanding liability)
  → Pay installment 50,000  → remaining 250,000
  → Net profit is unaffected throughout.
```

> Ask the client whether depreciation of such assets should ever appear in profit. For this salon the assumption is **no** — treat it purely as a capital/loan account. Confirm before building.

---

## 9. Implementation phases (suggested)
Each phase must be independently usable — never ship a half-finished flow live.

| Phase | Scope | Success test |
|---|---|---|
| 1. Daily operations | Billing, daily worksheet, 4 folders, void/cancel, Day Close (+ per-day snapshot), staff daily earning & payments, security code, Manager reports | Register + system run in parallel; 7 straight days difference = 0 |
| 2. Customers & staff | Customer history, special rates, staff monthly settlement + monthly receipts, Staff & Rates CRUD | One month of staff accounts matches manual 100% |
| 3. Monthly accounts | Monthly expenses, capital/outstanding, net profit, Owner account, Partners, Month Close, owner mobile dashboard | One month's full accounts match manual 100% |
| 4. Reliability | Backup/restore, WhatsApp receipts, automatic nightly summary, offline mode (PWA) | Restore from backup verified |

**Future enhancements (after core is stable):** lapsed-customer list, which deals are loss-making, material-theft detection, alerts on unusual entries.

---

## 10. Confirmed business decisions (from the client Q&A)
1. Commission is on the **amount actually charged** (special rate / deal share).
2. **Tips are outside the system.**
3. **No customer credit** — every bill is paid in full at the time.
4. Manager **cannot** give discretionary discounts — only Owner-set rates apply.
5. One Manager at the counter; **one Day Close per day.**
6. "Extra cash" = cash found **over** the expected count.
7. Manager **can** see past **daily** reports, but not monthly.
8. Monthly-salary staff: **full salary** on leave / mid-month join (confirm edge cases in build).
9. Daily-wage staff who showed up but got no work: **full daily wage.**
10. Only the **Owner** can give bonuses.

---

## 11. Data security & audit (non-negotiable)
- **No edit / no delete** of financial entries — not even the Owner.
- Fix mistakes by **voiding** and re-entering; both lines remain. Example:
  ```
  #101  Haircut — Ashfaq Bhai      500   Cancelled
  #102  Reversal of #101          −500   Auto
  #103  Haircut — Ashfaq Bhai    1,500   Active
  Report sums: 500 − 500 + 1,500 = 1,500 (correct, and the mistake is still visible)
  ```
- **≥3 cancellations in one day → instant alert to the Owner.**
- Every Day Close emits a **security code** to the Owner; if historical data is later tampered with, the code won't match and it's detected.
- **Audit log:** who / when / what for every important action, **including failed attempts**.
- Only a **customer's name and phone** may be edited (with a record).
- Cancellation authority:
  - Today's bill (before Day Close): **Manager** (reason required).
  - A closed day's bill (before Month Close): **Owner only**.
  - A closed month's bill: **nobody** — correct via next-month adjustment.

---

## 12. Notes for the Next.js build
- Preserve the **look and flows** of `art-saloon.html`; that file is the approved UX contract.
- Suggested stack direction (developer's call): Next.js (App Router), a relational DB (Postgres) since accounting needs integrity, an append-only/void model for financial tables, role-based auth for Owner/Manager only, a PIN for the Owner's own cash movements (not a login).
- Money as integer minor units; never floats. All computations (commission, deal split, expected cash, net profit, partner shares) must be reproducible from stored entries — snapshots are derived, entries are the source of truth.
- Build for a **narrow/tablet** screen first (counter device), scaling up for the Owner's desktop/phone dashboard.
- Everything auditable, nothing destructive.

---

*This spec pairs with `art-saloon.html` (visual/UX reference) and `CLAUDE_CODE_PROMPT.md` (the prototype-update brief). Sample figures throughout are illustrative, not real accounts.*
