import { describe, expect, it } from "vitest";
import {
  closedWhileOfflineText,
  DEVICE_CODE_LETTERS,
  deviceCodeOf,
  deviceTagSchema,
  isDeviceTag,
  offlineDevicesNote,
  offlineWorkOf,
} from "./device";

const ID_A = "0f8fad5b-d9cb-469f-a165-70867728950e";
const ID_B = "7c9e6679-7425-40de-944b-e07fc1f90ae7";

describe("a computer's code (P7.10)", () => {
  it("is three letters from random bytes, never a vowel", () => {
    expect(deviceCodeOf([0, 1, 2])).toBe("BCD");
    expect(deviceCodeOf([19, 20, 255])).toBe("ZBT");
    for (let byte = 0; byte < 256; byte++) {
      expect(deviceCodeOf([byte, byte, byte])).toMatch(/^[BCDFGHJKLMNPQRSTVWXZ]{3}$/);
    }
    expect(DEVICE_CODE_LETTERS).not.toMatch(/[AEIOU]/);
  });

  it("needs three bytes", () => {
    expect(() => deviceCodeOf([1, 2])).toThrow();
  });
});

describe("a device tag", () => {
  it("is an id and a code", () => {
    expect(isDeviceTag({ id: ID_A, code: "KXR" })).toBe(true);
    expect(isDeviceTag({ id: "not-a-uuid", code: "KXR" })).toBe(false);
    expect(isDeviceTag({ id: ID_A, code: "kxr" })).toBe(false);
    expect(isDeviceTag({ id: ID_A, code: "KXRT" })).toBe(false);
    expect(isDeviceTag(null)).toBe(false);
    expect(isDeviceTag({ id: ID_A })).toBe(false);
  });

  it("is what the sync routes accept", () => {
    expect(deviceTagSchema.safeParse({ id: ID_A, code: "KXR" }).success).toBe(true);
    expect(deviceTagSchema.safeParse({ id: ID_A, code: "K1R" }).success).toBe(false);
    expect(deviceTagSchema.safeParse({ id: "x", code: "KXR" }).success).toBe(false);
  });
});

describe("the Owner's note when more than one computer worked offline (P7.10)", () => {
  it("says nothing for one computer, or none", () => {
    expect(offlineDevicesNote([])).toBeNull();
    expect(offlineDevicesNote([{ id: ID_A, code: "KXR", saved: 4, refused: 0 }])).toBeNull();
  });

  it("names both computers and what each sent", () => {
    const note = offlineDevicesNote([
      { id: ID_A, code: "KXR", saved: 5, refused: 0 },
      { id: ID_B, code: "MTP", saved: 2, refused: 1 },
    ]);
    expect(note).toMatch(/^Two computers worked offline on this day: KXR \(5 saved\) and MTP \(2 saved, 1 refused\)\./);
  });

  it("names the day when asked to", () => {
    const note = offlineDevicesNote(
      [
        { id: ID_A, code: "KXR", saved: 1, refused: 0 },
        { id: ID_B, code: "MTP", saved: 1, refused: 0 },
      ],
      "Thu, 24 Sep 2026",
    );
    expect(note).toMatch(/^Two computers worked offline on Thu, 24 Sep 2026: /);
  });

  it("counts computers by id, so two sharing a code are still two", () => {
    const note = offlineDevicesNote([
      { id: ID_A, code: "KXR", saved: 1, refused: 0 },
      { id: ID_B, code: "KXR", saved: 1, refused: 0 },
    ]);
    expect(note).toMatch(/^Two computers/);
  });
});

describe("what each computer sent for a day (P7.10)", () => {
  it("counts items, not audit rows: refused twice and then saved is one saved", () => {
    const work = offlineWorkOf([
      { deviceId: ID_A, deviceCode: "KXR", clientId: "b1", saved: true },
      { deviceId: ID_A, deviceCode: "KXR", clientId: "b2", saved: true },
      { deviceId: ID_B, deviceCode: "MTP", clientId: "b3", saved: false },
      { deviceId: ID_B, deviceCode: "MTP", clientId: "b3", saved: false },
      { deviceId: ID_B, deviceCode: "MTP", clientId: "b4", saved: false },
      { deviceId: ID_B, deviceCode: "MTP", clientId: "b4", saved: true },
    ]);
    expect(work).toEqual([
      { id: ID_A, code: "KXR", saved: 2, refused: 0 },
      { id: ID_B, code: "MTP", saved: 1, refused: 1 },
    ]);
  });

  it("has nothing for a day with no offline work", () => {
    expect(offlineWorkOf([])).toEqual([]);
  });
});

describe("the refusal of work that arrived after its day was closed (P7.10, QA-37)", () => {
  it("says why, and what the Owner can do", () => {
    const text = closedWhileOfflineText("Thu, 24 Sep 2026", "bill");
    expect(text).toMatch(/^ Thu, 24 Sep 2026 was closed while this computer was offline, so its count did not include this bill\./);
    expect(text).toMatch(/ask the Owner to reopen Thu, 24 Sep 2026/);
  });
});
