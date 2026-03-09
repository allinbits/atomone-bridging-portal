import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

const LOCKS_DIR = join(
  process.cwd(),
  ".tmp",
  "e2e-locks"
);
const DEFAULT_WAIT_TIMEOUT_MS = Number(process.env.TEST_LOCK_WAIT_TIMEOUT_MS ?? "300000");
const DEFAULT_STALE_TIMEOUT_MS = Number(process.env.TEST_LOCK_STALE_TIMEOUT_MS ?? "600000");
const DEFAULT_RETRY_INTERVAL_MS = Number(process.env.TEST_LOCK_RETRY_INTERVAL_MS ?? "250");

const sleep = (ms: number) => new Promise((resolve) => setTimeout(
  resolve,
  ms
));

const isStale = async (lockPath: string, staleTimeoutMs: number) => {
  try {
    const lockStat = await stat(lockPath);
    return Date.now() - lockStat.mtimeMs > staleTimeoutMs;
  } catch {
    return false;
  }
};

export const withFileLock = async <T>(name: string, work: () => Promise<T>): Promise<T> => {
  await mkdir(
    LOCKS_DIR,
    { recursive: true }
  );

  const lockPath = join(
    LOCKS_DIR,
    `${name}.lock`
  );
  const ownerPath = join(
    lockPath,
    "owner.json"
  );
  const startedAt = Date.now();

  while (true) {
    try {
      await mkdir(lockPath);
      await writeFile(
        ownerPath,
        JSON.stringify(
          { pid: process.pid,
            startedAt: new Date().toISOString() },
          null,
          2
        )
      );
      break;
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : String(error);
      const alreadyExists = message.includes("EEXIST");
      if (!alreadyExists) {
        throw error;
      }

      if (await isStale(
        lockPath,
        DEFAULT_STALE_TIMEOUT_MS
      )) {
        await rm(
          lockPath,
          { recursive: true,
            force: true }
        );
        continue;
      }

      if (Date.now() - startedAt > DEFAULT_WAIT_TIMEOUT_MS) {
        let ownerDetails = "unknown";
        try {
          ownerDetails = await readFile(
            ownerPath,
            "utf8"
          );
        } catch {
          // Ignore owner read failures and keep timeout error actionable.
        }
        throw new Error(`Timed out waiting for lock "${name}" after ${DEFAULT_WAIT_TIMEOUT_MS}ms. ` +
          `Current owner: ${ownerDetails}`);
      }

      await sleep(DEFAULT_RETRY_INTERVAL_MS);
    }
  }

  try {
    return await work();
  } finally {
    await rm(
      lockPath,
      { recursive: true,
        force: true }
    );
  }
};
