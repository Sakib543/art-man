import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every feature has the same shape (backlog P4.1).
 *
 * The shape was written down in `docs/ARCHITECTURE.md` from the start and drifted
 * anyway, because a document cannot fail a build. This test can. It reads the
 * feature folders and checks the rules the document states, so a file in the
 * wrong place or a pure file that quietly grew a database import is caught on
 * the next `pnpm test` rather than at the next argument about it.
 *
 * It deliberately does not demand that every feature have all five role files.
 * `staff-khata` had no writes until P3.1 and `monthly-report` has no queries of
 * its own — empty files to satisfy a rule would be worse than the rule.
 */

const FEATURES = "src/features";

/** The five names that mean something. Everything else in a feature is pure logic. */
const ROLES = ["actions.ts", "service.ts", "queries.ts", "schemas.ts", "types.ts"];

/** A pure file may not pull in any of these at runtime. Types are fine: they vanish. */
const NOT_PURE = [/^@\/db/, /^react$/, /^react-dom/, /^next$/, /^next\//];

const read = (path: string) => readFileSync(path, "utf8");
const featureNames = readdirSync(FEATURES).filter((name) => statSync(join(FEATURES, name)).isDirectory());
const filesIn = (dir: string) => readdirSync(dir).filter((name) => statSync(join(dir, name)).isFile());

const isTest = (name: string) => name.endsWith(".test.ts") || name.endsWith(".test.tsx");
const isPure = (name: string) => name.endsWith(".ts") && !isTest(name) && !ROLES.includes(name);

/** Every module a file imports a *value* from. `import type` is left out. */
function valueImports(source: string): string[] {
  const found: string[] = [];
  for (const [, clause, module] of source.matchAll(/import\s+([\s\S]*?)from\s+"([^"]+)";/g)) {
    const trimmed = clause.trim();
    if (trimmed.startsWith("type ")) continue;
    // `import { type A, type B } from "x"` is type-only as well.
    const named = trimmed.match(/^\{([\s\S]*)\}$/);
    if (named && named[1].split(",").every((part) => part.trim() === "" || part.trim().startsWith("type "))) continue;
    found.push(module);
  }
  return found;
}

/** Every file inside a feature, including its components. */
function everyFile(feature: string): string[] {
  const root = join(FEATURES, feature);
  const here = filesIn(root).map((name) => join(root, name));
  const components = join(root, "components");
  let inside: string[] = [];
  try {
    inside = filesIn(components).map((name) => join(components, name));
  } catch {
    // A feature need not have components — `month-close` has none.
  }
  return [...here, ...inside];
}

describe("every feature has the same shape", () => {
  it("finds the features", () => {
    // A guard on the test itself: a wrong path would make everything below pass
    // by looking at nothing at all.
    expect(featureNames.length).toBeGreaterThan(10);
  });

  it.each(featureNames)("%s holds only role files, pure logic, tests and components/", (feature) => {
    const root = join(FEATURES, feature);
    const stray = readdirSync(root).filter((name) => {
      if (statSync(join(root, name)).isDirectory()) return name !== "components";
      // A component belongs in components/, where the folder rule can see it.
      return name.endsWith(".tsx");
    });
    expect(stray).toEqual([]);
  });

  it.each(featureNames)("%s: actions.ts is a Server Action file", (feature) => {
    const path = join(FEATURES, feature, "actions.ts");
    let source: string;
    try {
      source = read(path);
    } catch {
      return; // A feature with no writes has no actions.ts. `overview` is one.
    }
    expect(source.startsWith('"use server";')).toBe(true);
    // The permission check lives next to the data, not only in the proxy.
    expect(source).toMatch(/require(User|Role)/);
  });

  it.each(featureNames)("%s: its pure files stay pure", (feature) => {
    for (const name of filesIn(join(FEATURES, feature)).filter(isPure)) {
      const source = read(join(FEATURES, feature, name));
      expect(source, `${feature}/${name} is pure logic, so it carries no directive`).not.toMatch(
        /^"use (client|server)";/,
      );
      const forbidden = valueImports(source).filter((module) => NOT_PURE.some((pattern) => pattern.test(module)));
      expect(forbidden, `${feature}/${name} imports ${forbidden.join(", ")} at runtime`).toEqual([]);
    }
  });

  it.each(featureNames)("%s: every pure file is exercised by a test beside it", (feature) => {
    const names = filesIn(join(FEATURES, feature));
    const tests = names.filter(isTest).map((name) => read(join(FEATURES, feature, name)));
    for (const name of names.filter(isPure)) {
      const specifier = `./${name.replace(/\.ts$/, "")}`;
      expect(
        tests.some((source) => source.includes(`"${specifier}"`)),
        `${feature}/${name} is pure logic with no test importing it`,
      ).toBe(true);
    }
  });

  it("no feature imports another feature (ARCHITECTURE rule 5)", () => {
    const crossing: string[] = [];
    for (const feature of featureNames) {
      for (const path of everyFile(feature)) {
        for (const [, module] of read(path).matchAll(/from\s+"(@\/features\/[^"]+)"/g)) {
          if (!module.startsWith(`@/features/${feature}/`)) crossing.push(`${path} -> ${module}`);
        }
      }
    }
    // Shared pieces move up into components/ or lib/ instead.
    expect(crossing).toEqual([]);
  });
});
