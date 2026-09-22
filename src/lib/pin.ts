import { hashPassword, verifyPassword } from "better-auth/crypto";

/** The Owner's PIN is exactly four digits. It confirms cash movements; it is not a login. */
export const PIN_PATTERN = /^\d{4}$/;

export const isValidPin = (pin: string): boolean => PIN_PATTERN.test(pin);

/** Store only the hash. A PIN can be reset but never read back. */
export const hashPin = (pin: string): Promise<string> => hashPassword(pin);

export const verifyPin = (pin: string, hash: string): Promise<boolean> =>
  verifyPassword({ hash, password: pin });
