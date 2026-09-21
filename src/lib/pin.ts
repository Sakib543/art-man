import { hashPassword, verifyPassword } from "better-auth/crypto";

/** A staff PIN is exactly four digits. It confirms receipts; it is not a login. */
export const PIN_PATTERN = /^\d{4}$/;

export const isValidPin = (pin: string): boolean => PIN_PATTERN.test(pin);

/** Store only the hash. A PIN can be reset but never read back. */
export const hashPin = (pin: string): Promise<string> => hashPassword(pin);

export const verifyPin = (pin: string, hash: string): Promise<boolean> =>
  verifyPassword({ hash, password: pin });
