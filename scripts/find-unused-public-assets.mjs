import { readdir, readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";

const root = process.cwd();
const publicRoot = join(root, "public");
const runtimeRoots = ["src", "app", "components", "lib"].map((directory) => join(root, directory));
const textExtensions = new Set([".css", ".js", ".jsx", ".mjs", ".ts", ".tsx", ".json", ".md"]);

async function walk(directory) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) files.push(...(await walk(absolute)));
      else files.push(absolute);
    }
    return files;
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

function publicPath(file) {
  return `/${relative(publicRoot, file).split(sep).join("/")}`;
}

function isReferenced(assetPath, source) {
  const normalized = assetPath.slice(1);
  const basename = normalized.split("/").pop();
  if ([assetPath, normalized, `public/${normalized}`, basename].some((token) => token && source.includes(token))) return true;

  // These directories are resolved from persisted taxonomy/media values rather than literal filenames.
  if (normalized.startsWith("images/categories/") && source.includes("images/categories/")) return true;
  if (normalized.startsWith("images/products/placeholder-") && source.includes("images/products/placeholder-")) return true;
  if (normalized.startsWith("images/families/") && source.includes("images/families/")) return true;
  return false;
}

const [publicFiles, runtimeFiles] = await Promise.all([walk(publicRoot), Promise.all(runtimeRoots.map(walk)).then((groups) => groups.flat())]);
const source = (await Promise.all(runtimeFiles.filter((file) => textExtensions.has(file.slice(file.lastIndexOf(".")).toLowerCase())).map((file) => readFile(file, "utf8")))).join("\n");
const assets = publicFiles.filter((file) => !file.endsWith("SOURCES.md")).map(publicPath).sort();
const unused = assets.filter((asset) => !isReferenced(asset, source));

const result = { scannedRuntimeFiles: runtimeFiles.length, publicAssets: assets.length, unused };
if (process.argv.includes("--json")) console.log(JSON.stringify(result, null, 2));
else {
  console.log(`Runtime files scanned: ${result.scannedRuntimeFiles}`);
  console.log(`Public assets scanned: ${result.publicAssets}`);
  console.log("Unused by application source:");
  for (const asset of unused) console.log(`- ${asset}`);
}
