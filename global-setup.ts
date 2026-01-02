import { type ChildProcess, execSync, spawn } from "node:child_process";

let backendProcess: ChildProcess | null = null;

export default async function globalSetup() {
  console.info("🐳 Starting Docker infrastructure...");

  try {
    execSync("docker compose -f compose.test.yml up -d", { stdio: "inherit" });
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
  // Check if backend binary exists, build if not (for local testing)
  // In CI, this will be pre-built by the workflow step
  try {
    execSync(
      "cargo build --release --message-format=short 2>&1 | grep -q 'Finished'",
      {
        cwd: "./apps/api",
        stdio: "ignore",
        shell: "/bin/bash",
      }
    );
    console.info("✅ Backend already built");
  } catch {
    console.info("🔨 Building backend (this may take a few minutes)...");
    try {
      execSync("cargo build --release", {
        cwd: "./apps/api",
        stdio: "inherit",
      });
      console.info("✅ Backend build complete!");
    } catch (error) {
      console.error("Failed to build backend:", error);
      throw error;
    }
  }

  backendProcess = spawn("cargo", ["run", "--release"], {
    cwd: "./apps/api",
    stdio: "inherit",
    detached: false,
    env: {
      ...process.env,
      APP_ENV: "test", // Backend will load .env.test
      RUST_LOG: "error", // Only show errors to reduce log overhead during tests
    },
  });

  // Wait for backend to be ready (should be quick since it's pre-built)
  const maxRetries = 60; // 1 minute for startup
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
      // Log progress every 10 seconds
      if (i > 0 && i % 10 === 0) {
        console.info(`⏳ Still waiting for backend... (${i}s elapsed)`);
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }
}

export { backendProcess };
