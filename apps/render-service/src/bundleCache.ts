import path from "node:path";
import { existsSync } from "node:fs";
import { bundle } from "@remotion/bundler";

let cachedBundleLocation: string | null = null;
let inflight: Promise<string> | null = null;

function findRepoRoot(startDir: string) {
  let dir = startDir;
  for (let i = 0; i < 12; i++) {
    const hasPkg = existsSync(path.join(dir, "package.json"));
    const hasPackagesDir = existsSync(path.join(dir, "packages"));
    const hasAppsDir = existsSync(path.join(dir, "apps"));
    if (hasPkg && (hasPackagesDir || hasAppsDir)) return dir;

    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return startDir;
}

const repoRoot = findRepoRoot(process.cwd());
const entryRel = process.env.REMOTION_ENTRYPOINT || "packages/remotion-video/src/index.ts";
const entryPoint = path.resolve(repoRoot, entryRel);

export async function getBundleLocation(): Promise<string> {
  if (cachedBundleLocation) return cachedBundleLocation;
  if (inflight) return inflight;

  inflight = (async () => {
    const loc = await bundle({
      entryPoint,
      webpackOverride: (c) => c,
    });

    cachedBundleLocation = loc;
    inflight = null;
    console.log("[render] cachedBundleLocation=", cachedBundleLocation);
    return loc;
  })();

  return inflight;
}