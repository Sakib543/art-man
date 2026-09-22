import type { Role } from "@/lib/auth/roles";

/** One row of the Users screen. Plain data, safe to pass to a Client Component. */
export interface UserRow {
  id: string;
  name: string;
  username: string;
  role: Role;
  active: boolean;
  /** Only the Owner has a PIN, and a new Owner has none until they set one in Settings. */
  hasPin: boolean;
  createdAt: string;
}

/** Everything the screen needs, already narrowed to what this viewer may see. */
export interface UsersData {
  rows: UserRow[];
  /** Roles this viewer may create. Empty means the create form is not shown. */
  creatable: Role[];
  /** How many Owner accounts are open, so the screen can explain why the last one cannot be closed. */
  activeOwners: number;
}
