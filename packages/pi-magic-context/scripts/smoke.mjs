import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const packageRoot = resolve(import.meta.dirname, "..");
const result = spawnSync("pi list", {
   shell: true,
   encoding: "utf8",
   env: { ...process.env, MSYS_NO_PATHCONV: "1" }
});
const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
const badPatterns = [
   /Failed to load extension/i,
   /Cannot find module/i,
   /ERR_PACKAGE/i,
   /@magic-context\/core/i,
   /pi-magic-context[\\/]packages[\\/]pi-plugin/i
];

if (result.status !== 0) {
   console.error(output.split(/\r?\n/).slice(0, 120).join("\n"));
   process.exit(result.status ?? 1);
}
if (badPatterns.some((pattern) => pattern.test(output))) {
   console.error(output.split(/\r?\n/).slice(0, 120).join("\n"));
   process.exit(1);
}
if (!output.includes(packageRoot)) {
   console.error(`Magic Context package root is not registered in pi list: ${packageRoot}`);
   process.exit(1);
}

console.log("PASS Pi smoke: Magic Context package is registered with no package resolution errors");
