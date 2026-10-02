import { readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { count, notLike } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { setMaintenance } from "@/db/app-settings";
import { auditLog, bills, businessDays, cashEntries, khataEntries } from "@/db/schema";
import { setUserActive } from "@/features/users/service";
import type { Role } from "@/lib/auth/roles";
import { asRequest } from "./request";
import { seedSalon, signIn, type Salon } from "./salon";

/**
 * The role matrix (backlog P7.9; the QA audit did it by hand over HTTP): every
 * Server Action, called directly as each role with `{}`. Each checks the role
 * before it reads its input, so an allowed call ends at the input check and a
 * refused one is sent away — and nothing is written either way. The table
 * below is the matrix; a new action with no row in it fails the first test.
 */
type Allowed = readonly Role[];
const ANYONE: Allowed = ["manager", "owner", "developer"];
const OWNER: Allowed = ["owner", "developer"];
const DEVELOPER: Allowed = ["developer"];

const MATRIX: Record<string, Record<string, Allowed>> = {
  account: { changePasswordAction: ANYONE, changePinAction: OWNER },
  billing: {
    createBillAction: ANYONE,
    editBillAction: OWNER,
    cancelBillAction: ANYONE,
    lookupCustomerAction: ANYONE,
    findSavedBillAction: ANYONE,
    discardOfflineBillAction: ANYONE,
  },
  capital: { addInvestmentAction: OWNER, addRepaymentAction: OWNER },
  customers: { editCustomerAction: OWNER, setRateAction: OWNER, removeRateAction: OWNER },
  "daily-report": { cancelClosedBillAction: OWNER },
  "day-close": {
    reviewCloseAction: ANYONE,
    closeDayAction: ANYONE,
    discardOfflineCloseAction: ANYONE,
    reopenDayAction: OWNER,
    startNextDayAction: ANYONE,
    openFirstDayAction: OWNER,
  },
  developer: {
    resetPasswordAction: DEVELOPER,
    changeUsernameAction: DEVELOPER,
    resetPinAction: DEVELOPER,
    setMaintenanceAction: DEVELOPER,
    editBillRowAction: DEVELOPER,
  },
  folders: { addEntryAction: ANYONE, voidEntryAction: ANYONE, discardOfflineEntryAction: ANYONE },
  "month-adjustments": { recordAdjustmentAction: OWNER, cancelAdjustmentAction: OWNER },
  "month-close": { closeMonthAction: OWNER },
  "monthly-expenses": { setFixedAction: OWNER, addFixedLineAction: OWNER, addOtherAction: OWNER, voidOtherAction: OWNER },
  partners: { saveSharesAction: OWNER, addPartnerAction: OWNER, addDrawingAction: OWNER, voidDrawingAction: OWNER },
  "staff-khata": {
    giveBonusAction: OWNER,
    // P3.18: the client's decision of 2026-10-02 — overtime and deductions by either; cancelling, the Owner's.
    addOvertimeAction: ANYONE,
    addDeductionAction: ANYONE,
    cancelKhataLineAction: OWNER,
  },
  "staff-rates": { saveStaffAction: OWNER, saveServiceAction: OWNER, saveDealAction: OWNER, previewLeaverAction: OWNER },
  users: { createUserAction: OWNER, resetUserPasswordAction: OWNER, setUserActiveAction: OWNER },
};

type Action = (input?: unknown) => Promise<unknown>;

/** Every exported function of every feature's `actions.ts`, by feature. */
async function loadActions(): Promise<Record<string, Record<string, Action>>> {
  const root = resolve("src/features");
  const found: Record<string, Record<string, Action>> = {};
  for (const feature of readdirSync(root).filter((name) => statSync(join(root, name)).isDirectory())) {
    const file = join(root, feature, "actions.ts");
    try {
      statSync(file);
    } catch {
      continue; // A feature with no writes has no actions.ts.
    }
    const exported = (await import(pathToFileURL(file).href)) as Record<string, unknown>;
    found[feature] = Object.fromEntries(
      Object.entries(exported).filter((entry): entry is [string, Action] => typeof entry[1] === "function"),
    );
  }
  return found;
}

/** Where a refused call was sent, or null when it was let in. */
async function sentTo(action: Action): Promise<string | null> {
  try {
    await action({});
    return null;
  } catch (error) {
    const digest = (error as { digest?: unknown }).digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT;")) return digest.split(";")[2];
    throw error;
  }
}

/** Rows a refused or an input-less call must never write. Sign-ins write `login.*` audit rows; nothing else may appear. */
async function writes() {
  const tally = async (table: PgTable) => (await db.select({ n: count() }).from(table))[0].n;
  return {
    audit: (await db.select({ n: count() }).from(auditLog).where(notLike(auditLog.action, "login.%")))[0].n,
    days: await tally(businessDays),
    bills: await tally(bills),
    cash: await tally(cashEntries),
    khata: await tally(khataEntries),
  };
}

let salon: Salon;
let actions: Record<string, Record<string, Action>>;
const cookies: Partial<Record<Role, string>> = {};

beforeAll(async () => {
  // No business day is opened, so even an allowed call that takes no input
  // (Start next business day) is refused by the service and writes nothing.
  salon = await seedSalon();
  actions = await loadActions();
  for (const role of ["manager", "owner", "developer"] as const) cookies[role] = await signIn(salon[role]);
});

const rows = Object.entries(MATRIX).flatMap(([feature, names]) =>
  Object.entries(names).map(([name, allowed]) => ({ feature, name, allowed })),
);

describe("the role matrix", () => {
  it("has a row for every Server Action there is, and no other", () => {
    const actual = Object.entries(actions).flatMap(([feature, names]) => Object.keys(names).map((name) => `${feature}/${name}`));
    expect(actual.sort()).toEqual(rows.map((row) => `${row.feature}/${row.name}`).sort());
    expect(actual).toHaveLength(50);
  });

  it.each(["manager", "owner", "developer"] as const)("as the %s, every action allows or refuses as the table says", async (role) => {
    const before = await writes();
    const outcome: Record<string, string> = {};
    const expected: Record<string, string> = {};
    for (const { feature, name, allowed } of rows) {
      asRequest(cookies[role]!);
      const where = await sentTo(actions[feature][name]);
      outcome[`${feature}/${name}`] = where === null ? "allowed" : `sent to ${where}`;
      expected[`${feature}/${name}`] = allowed.includes(role) ? "allowed" : "sent to /billing";
    }
    expect(outcome).toEqual(expected);
    expect(await writes()).toEqual(before);
  });

  it("signed out, every action is sent to the login page", async () => {
    const before = await writes();
    for (const { feature, name } of rows) {
      asRequest(null);
      expect(await sentTo(actions[feature][name]), `${feature}/${name}`).toBe("/login");
    }
    expect(await writes()).toEqual(before);
  });

  it("with a cookie that was never signed in, likewise", async () => {
    for (const { feature, name } of rows) {
      asRequest("better-auth.session_token=forged.value");
      expect(await sentTo(actions[feature][name]), `${feature}/${name}`).toBe("/login");
    }
  });
});

describe("maintenance mode", () => {
  it("sends the Owner and the Manager to the maintenance page, and lets the developer through", async () => {
    await setMaintenance(salon.developer.username, true);
    try {
      for (const { feature, name } of rows) {
        for (const role of ["manager", "owner"] as const) {
          asRequest(cookies[role]!);
          expect(await sentTo(actions[feature][name]), `${role}: ${feature}/${name}`).toBe("/maintenance");
        }
        asRequest(cookies.developer!);
        expect(await sentTo(actions[feature][name]), `developer: ${feature}/${name}`).toBeNull();
      }
    } finally {
      await setMaintenance(salon.developer.username, false);
    }
  });
});

describe("a closed account", () => {
  it("is signed out at once: its cookie reaches no action", async () => {
    await setUserActive(salon.owner, salon.manager.id, false);
    for (const { feature, name } of rows) {
      asRequest(cookies.manager!);
      expect(await sentTo(actions[feature][name]), `${feature}/${name}`).toBe("/login");
    }
  });
});
