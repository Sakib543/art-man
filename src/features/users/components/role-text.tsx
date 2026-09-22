import type { Role } from "@/lib/auth/roles";

/** What each role may do, in the words the Owner would use. */
export const ROLE_TEXT: Record<Role, string> = {
  owner: "Everything: rates, monthly accounts, partners, and closed days.",
  manager: "The counter: billing, folders, day close and daily reports.",
  developer: "Everything the Owner can, plus the audit log and maintenance.",
};
