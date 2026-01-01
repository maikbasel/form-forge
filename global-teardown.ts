import { execSync } from "node:child_process";
import { backendProcess } from "./global-setup";

export default function globalTeardown() {
  console.info("🛑 Stopping backend server...");

  if (backendProcess) {
    try {
      backendProcess.kill();
      console.info("✅ Backend stopped!");
    } catch (error) {
      console.error("Failed to stop backend:", error);
    }
  }

  console.info("🧹 Stopping Docker infrastructure...");

  try {
    execSync("docker compose -f compose.test.yml down", { stdio: "inherit" });
    console.info("✅ Infrastructure stopped!");
  } catch (error) {
    console.error("Failed to stop Docker infrastructure:", error);
    // Don't throw - we want teardown to be best-effort
  }
}
