import { type ChildProcess, execSync, spawn } from "node:child_process";

let backendProcess: ChildProcess | null = null;

export default async function globalSetup() {
  console.info("🐳 Starting Docker infrastructure...");

  try {
    execSync("docker compose -f compose.dev.yml up -d", { stdio: "inherit" });
  } catch (error) {
    console.error("Failed to start Docker infrastructure:", error);
    throw error;
  }

  console.info("⏳ Waiting for database to be ready...");
  await waitForDatabase();

  console.info("🚀 Starting backend server...");
  await startBackend();

  console.info("✅ Infrastructure ready!");
}

async function waitForDatabase(): Promise<void> {
  const maxRetries = 30;
  const retryDelay = 1000;

  for (let i = 0; i < maxRetries; i++) {
    try {
      // Check if PostgreSQL is ready
      execSync(
        "docker exec $(docker ps -q -f ancestor=postgres:17) pg_isready -U postgres",
        {
          stdio: "ignore",
        }
      );

      // Verify we can actually connect and query the database
      execSync(
        'docker exec $(docker ps -q -f ancestor=postgres:17) psql -U postgres -d form-forge -c "SELECT 1"',
        {
          stdio: "ignore",
        }
      );

      console.info("✅ Database is ready!");
      // Give it a bit more time to ensure connection pool can be established
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return;
    } catch {
      if (i === maxRetries - 1) {
        throw new Error(
          `Database failed to become ready after ${maxRetries} attempts`
        );
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }
}

async function startBackend(): Promise<void> {
  backendProcess = spawn("cargo", ["run"], {
    cwd: "./apps/api",
    stdio: "inherit",
    detached: false,
  });

  // Wait for backend to be ready
  const maxRetries = 60;
  const retryDelay = 1000;

  for (let i = 0; i < maxRetries; i++) {
    try {
      execSync("curl -f http://localhost:8081/health", { stdio: "ignore" });
      console.info("✅ Backend is ready!");
      return;
    } catch {
      if (i === maxRetries - 1) {
        throw new Error(
          `Backend failed to become ready after ${maxRetries} attempts`
        );
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }
}

export { backendProcess };
