import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, unlinkSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");
const { parse: parseJsonc } = require("comment-json");

const DEFAULT_LOCAL_EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";
const args = new Set(process.argv.slice(2));
const prewarmEmbedding = args.has("--prewarm-embedding");

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const agentRoot = resolve(root, "..", "..", "..");
const userConfigPath = resolve(homedir(), ".pi", "agent", "magic-context.jsonc");
const projectConfigPath = resolve(process.cwd(), ".pi", "magic-context.jsonc");
const storageDir = resolve(homedir(), ".pi", "agent", "pi-magic-context");
const modelCacheDir = resolve(storageDir, "models");
const dbPath = resolve(storageDir, "context.db");
const checks = [];

function pass(name, detail = "") {
   checks.push({ status: "PASS", name, detail });
}

function warn(name, detail = "") {
   checks.push({ status: "WARN", name, detail });
}

function fail(name, detail = "") {
   checks.push({ status: "FAIL", name, detail });
}

function check(name, ok, detail = "") {
   (ok ? pass : fail)(name, detail);
}

function readJson(file) {
   return JSON.parse(readFileSync(file, "utf8"));
}

const settingsPath = resolve(agentRoot, "settings.json");
if (existsSync(settingsPath)) {
   const settings = readJson(settingsPath);
   const packages = Array.isArray(settings.packages) ? settings.packages : [];
   const expected = root.replaceAll("/", "\\\\");
   const hasRoot = packages.some((entry) => typeof entry === "object" && entry?.source === expected);
   check("Pi extension registered", hasRoot, expected);
} else {
   fail("Pi settings readable", settingsPath);
}

const loadedConfig = loadEffectiveConfig();
if (loadedConfig.errors.length > 0) {
   for (const error of loadedConfig.errors) fail("Magic Context config parses", error);
} else if (loadedConfig.loaded.length > 0) {
   pass("Magic Context config parses", loadedConfig.loaded.join(", "));
} else {
   warn("Magic Context config present", "missing, runtime will use defaults");
}

const embedding = normalizeEmbeddingConfig(loadedConfig.config.embedding);
if (embedding.provider === "local") {
   pass("Embedding provider is local", embedding.model);
   check("Local embedding model is Xenova MiniLM", embedding.model === DEFAULT_LOCAL_EMBEDDING_MODEL, embedding.model);
   checkModuleResolvable("@huggingface/transformers", "Transformers dependency installed");
   checkModelCacheDirectory();
   if (prewarmEmbedding) {
      await prewarmLocalEmbeddingModel(embedding.model);
      checkModelCacheContents();
   } else {
      const cached = checkModelCacheContents();
      if (cached) {
         pass("Embedding model prewarm", "not needed, model cache is present");
      } else {
         warn("Embedding model prewarm", "skipped, run doctor --prewarm-embedding to download and load the model now");
      }
   }
} else if (embedding.provider === "openai-compatible") {
   pass("Embedding provider is openai-compatible", embedding.model || "model missing");
   check(
      "Embedding endpoint configured",
      typeof embedding.endpoint === "string" && embedding.endpoint.trim().length > 0,
   );
   check("Embedding model configured", typeof embedding.model === "string" && embedding.model.trim().length > 0);
} else if (embedding.provider === "off") {
   warn("Embedding provider disabled", "semantic memory search will fall back to text search only");
} else {
   fail("Embedding provider is valid", String(embedding.provider));
}

if (existsSync(dbPath)) {
   try {
      const db = new Database(dbPath, { readonly: true });
      const row = db.prepare("PRAGMA integrity_check").get();
      db.close();
      const value = Object.values(row ?? {})[0];
      check("Magic Context SQLite integrity", value === "ok", String(value));
   } catch (error) {
      fail("Magic Context SQLite integrity", error instanceof Error ? error.message : String(error));
   }
} else {
   warn("Magic Context SQLite exists", `not created yet at ${dbPath}`);
}

let failed = 0;
let warned = 0;
let passed = 0;
for (const item of checks) {
   console.log(`${item.status} ${item.name}${item.detail ? ` (${item.detail})` : ""}`);
   if (item.status === "FAIL") failed++;
   else if (item.status === "WARN") warned++;
   else passed++;
}
console.log(`\nSummary: PASS ${passed} / WARN ${warned} / FAIL ${failed}`);
process.exit(failed ? 1 : 0);

function walk(dir) {
   if (!existsSync(dir)) return [];
   const out = [];
   for (const name of readdirSync(dir)) {
      const file = resolve(dir, name);
      const stat = statSync(file);
      if (stat.isDirectory()) out.push(...walk(file));
      else out.push(file);
   }
   return out;
}

function loadEffectiveConfig() {
   const loaded = [];
   const errors = [];
   const config = {};
   for (const file of [userConfigPath, projectConfigPath]) {
      if (!existsSync(file)) continue;
      try {
         const parsed = parseJsonc(readFileSync(file, "utf8"));
         if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            mergeDeep(config, parsed);
            loaded.push(file);
         }
      } catch (error) {
         errors.push(`${file}: ${error instanceof Error ? error.message : String(error)}`);
      }
   }

   return { config, loaded, errors };
}

function mergeDeep(target, source) {
   for (const [key, value] of Object.entries(source)) {
      if (isPlainObject(value) && isPlainObject(target[key])) {
         mergeDeep(target[key], value);
      } else {
         target[key] = value;
      }
   }
   return target;
}

function isPlainObject(value) {
   return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeEmbeddingConfig(value) {
   const input = isPlainObject(value) ? value : {};
   const provider = typeof input.provider === "string" ? input.provider : "local";
   if (provider === "local") {
      const model =
         typeof input.model === "string" && input.model.trim() ? input.model.trim() : DEFAULT_LOCAL_EMBEDDING_MODEL;
      return { provider, model };
   }
   if (provider === "openai-compatible") {
      return {
         provider,
         endpoint: typeof input.endpoint === "string" ? input.endpoint.trim() : "",
         model: typeof input.model === "string" ? input.model.trim() : "",
      };
   }
   return { provider };
}

function checkModuleResolvable(moduleName, label) {
   try {
      require.resolve(moduleName);
      pass(label, moduleName);
   } catch (error) {
      fail(label, error instanceof Error ? error.message : String(error));
   }
}

function checkModelCacheDirectory() {
   try {
      mkdirSync(modelCacheDir, { recursive: true });
      const probe = resolve(modelCacheDir, ".doctor-write-test");
      writeFileSync(probe, "ok");
      unlinkSync(probe);
      pass("Embedding model cache writable", modelCacheDir);
   } catch (error) {
      fail("Embedding model cache writable", error instanceof Error ? error.message : String(error));
   }
}

function checkModelCacheContents() {
   if (!existsSync(modelCacheDir)) {
      warn("Xenova model cache", "model cache directory does not exist yet");
      return false;
   }
   const files = walk(modelCacheDir);
   const hasMiniLm = files.some((file) => file.includes("all-MiniLM-L6-v2") || file.includes("all-MiniLM"));
   if (hasMiniLm) {
      pass("Xenova model cache", "all-MiniLM files found");
      return true;
   }
   warn("Xenova model cache", "not downloaded yet, first embedding use will download it");
   return false;
}

async function prewarmLocalEmbeddingModel(model) {
   try {
      mkdirSync(modelCacheDir, { recursive: true });
      const transformers = await import("@huggingface/transformers");
      if (transformers.env && typeof transformers.env === "object") {
         transformers.env.cacheDir = modelCacheDir;
      }
      const pipeline = await transformers.pipeline("feature-extraction", model, { dtype: "fp32" });
      const output = await pipeline("doctor embedding probe", { pooling: "mean", normalize: true });
      await pipeline.dispose?.();
      const data = output?.data;
      check(
         "Embedding model prewarm",
         data instanceof Float32Array && data.length > 0,
         `${model}, ${data?.length ?? 0} dims`,
      );
   } catch (error) {
      fail("Embedding model prewarm", error instanceof Error ? error.message : String(error));
   }
}
