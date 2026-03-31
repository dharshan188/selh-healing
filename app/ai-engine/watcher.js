const fs = require("fs");
const path = require("path");

const { runDebate } = require("./debate");
const { applyFix } = require("./autoFix");
const { getRelatedFiles, readFiles } = require("./contextBuilder");

const POLL_INTERVAL_MS = 2000;

// Log file paths
const LOG_PATH_CANDIDATES = [
  path.resolve(__dirname, "../app/backend/error.log"),
  path.resolve(__dirname, "../backend/error.log"),
  path.resolve(process.cwd(), "app/backend/error.log"),
];

let activeLogPath = LOG_PATH_CANDIDATES[0];
let lastReadSize = 0;
let lastErrorSignature = null;
const errorRetryMeta = {};
const MAX_RETRY = 3;
const RETRY_RESET_TIME = 5 * 60 * 1000;
const DEBUG_MODE = true;

// Resolve correct log file
async function resolveLogPath() {
  for (const candidate of LOG_PATH_CANDIDATES) {
    try {
      await fs.promises.access(candidate);
      return candidate;
    } catch (_) {}
  }
  return LOG_PATH_CANDIDATES[0];
}

// Read only new logs
async function readNewChunk(filePath, start, end) {
  const bytesToRead = end - start;
  if (bytesToRead <= 0) return "";

  const fileHandle = await fs.promises.open(filePath, "r");

  try {
    const buffer = Buffer.alloc(bytesToRead);
    await fileHandle.read(buffer, 0, bytesToRead, start);
    return buffer.toString("utf8");
  } finally {
    await fileHandle.close();
  }
}

// Print result cleanly
function printDebateResult(result) {
  console.log("\n🔥 === FINAL FIX === 🔥");
  console.log(result.code);
  console.log("=====================\n");
}

// Extract buggy line from error log
function extractBuggyLine(errorLog) {
  try {
    // Try the common format: at Object.fn (/path/to/file.js:18:14)
    let match = errorLog.match(/\((.*\.js):(\d+):(\d+)\)/);

    // Fallback to lines like: at /path/to/file.js:18:14
    if (!match) {
      match = errorLog.match(/at (\/.*\.js):(\d+):(\d+)/);
    }

    if (!match) return null;

    const filePath = match[1];
    const lineNumber = parseInt(match[2], 10);

    const fileContent = fs.readFileSync(filePath, 'utf-8').split('\n');

    return {
      filePath,
      lineNumber,
      line: fileContent[lineNumber - 1],
    };
  } catch (err) {
    console.error("extractBuggyLine error:", err);
    return null;
  }
}

function isValidFix(fixLine, originalLine) {
  if (!fixLine || typeof fixLine !== "string") return false;
  if (fixLine.includes("\n") || fixLine.includes("\r")) return false;

  const trimmed = fixLine.trim();
  if (!trimmed) return false;
  if (trimmed.length > 200) return false;
  if (trimmed.includes("```") || trimmed.includes("Explanation:") || trimmed.includes("Fix:")) {
    return false;
  }

  const looksLikeCode = trimmed.includes(";") || trimmed.includes("=") || trimmed.includes("()");
  if (!looksLikeCode) return false;

  return true;
}

// Main loop
async function checkForNewErrors() {
  try {
    const stats = await fs.promises.stat(activeLogPath);
    const currentSize = stats.size;

    if (currentSize < lastReadSize) {
      lastReadSize = 0;
    }

    if (currentSize === lastReadSize) return;

    const newContent = await readNewChunk(activeLogPath, lastReadSize, currentSize);
    lastReadSize = currentSize;

    const errorLog = newContent.trim();
    if (!errorLog) return;

    const errorSignature = errorLog
      .replace(/\[\d{4}-.*?\]/g, "")
      .split('\n')
      .slice(0, 3)
      .join('|');

    console.log("🧠 Error Signature:", errorSignature);

    const now = Date.now();

    if (!errorRetryMeta[errorSignature]) {
      errorRetryMeta[errorSignature] = {
        count: 0,
        firstSeen: now,
      };
    }

    const meta = errorRetryMeta[errorSignature];

    if (now - meta.firstSeen > RETRY_RESET_TIME) {
      meta.count = 0;
      meta.firstSeen = now;
    }

    meta.count++;

    if (DEBUG_MODE) console.log(`🔁 Retry count for this error: ${meta.count}`);

    if (meta.count > MAX_RETRY) {
      console.log("❌ Retry limit reached → skipping permanently");
      return;
    }

    if (errorSignature === lastErrorSignature) {
      console.log("⚠️ Same error detected → skipping to prevent loop");
      return;
    }

    if (DEBUG_MODE) console.log("🆕 New unique error detected → processing");

    console.log("\n🚨 New Error Detected:\n");
    console.log(errorLog);

    // 📍 locate bug to get file path for context
    const bug = extractBuggyLine(errorLog);

    if (!bug) {
      console.log("⚠️ Could not locate buggy line");
      return;
    }

    console.log("\n📍 Bug detected at:");
    console.log("File:", bug.filePath);
    console.log("Line:", bug.lineNumber);

    // 🧠 Build code context from related files
    const relatedFiles = getRelatedFiles(bug.filePath);
    const codeContext = readFiles([
      bug.filePath,
      ...relatedFiles
    ]);

    console.log("\n📂 Context files loaded:");
    console.log([bug.filePath, ...relatedFiles]);

    console.log("📏 Context size:", codeContext.length);

    // 🧠 AI debate with code context
    const result = await runDebate(errorLog, codeContext);
    printDebateResult(result);

    // 🛠 AUTO FIX
    if (!isValidFix(result.code, bug.line)) {
      console.log("❌ Invalid AI fix. Skipping.");
      return;
    }

    if (result.code && result.code.trim()) {
      if (!bug.filePath.includes("app/backend")) {
        console.log("⚠️ Skipping fix: file outside backend");
        return;
      }

      await applyFix({
        filePath: bug.filePath,
        lineNumber: bug.lineNumber,
        originalLine: bug.line,
        fixedLine: result.code.trim(),
      });
    } else {
      console.log("⚠️ No valid fix returned");
    }

    lastErrorSignature = errorSignature;

  } catch (error) {
    if (error.code === "ENOENT") {
      console.error(`Log file not found: ${activeLogPath}`);
    } else {
      console.error("Watcher error:", error);
    }
  }
}

// Start watcher
async function startWatcher() {
  try {
    activeLogPath = await resolveLogPath();

    try {
      const stats = await fs.promises.stat(activeLogPath);
      lastReadSize = stats.size;
    } catch (error) {
      if (error.code === "ENOENT") {
        lastReadSize = 0;
        console.warn(`⚠️ Waiting for log file: ${activeLogPath}`);
      } else {
        throw error;
      }
    }

    console.log("👀 Error watcher started");
    console.log(`📄 Watching: ${activeLogPath}`);
    console.log(`⏱ Polling every ${POLL_INTERVAL_MS / 1000}s`);

    setInterval(checkForNewErrors, POLL_INTERVAL_MS);
  } catch (error) {
    console.error("Failed to start watcher:", error);
  }
}

startWatcher();