import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const nextDir = join(process.cwd(), ".next");
const buildIdPath = join(nextDir, "BUILD_ID");

if (!existsSync(nextDir)) {
  mkdirSync(nextDir, { recursive: true });
}

if (!existsSync(buildIdPath)) {
  const buildId = `veltrix-${Date.now().toString(36)}`;
  writeFileSync(buildIdPath, `${buildId}\n`, "utf8");
  console.log(`[ensure-build-id] Created missing BUILD_ID: ${buildId}`);
} else {
  console.log("[ensure-build-id] BUILD_ID already present.");
}
