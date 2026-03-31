const fs = require("fs");
const { exec } = require("child_process");
const path = require("path");

// backup file before modifying
function backupFile(filePath) {
  const backupPath = filePath + ".bak";
  fs.copyFileSync(filePath, backupPath);
  console.log("📦 Backup created:", backupPath);
}

// replace ONLY exact line
function replaceLine(filePath, lineNumber, fixedLine) {
  const lines = fs.readFileSync(filePath, "utf-8").split("\n");

  if (!Number.isInteger(lineNumber) || lineNumber < 1 || lineNumber > lines.length) {
    console.log("❌ Invalid line number, skipping");
    return false;
  }

  lines[lineNumber - 1] = fixedLine;

  fs.writeFileSync(filePath, lines.join("\n"));
  console.log("✅ Fix applied at line", lineNumber);

  return true;
}

// restart server (simple method)
function restartServer() {
  console.log("🔁 Restarting server...");

  console.log("📂 Current __dirname:", __dirname);

  // kill old node process on port 3000
  exec("fuser -k 3000/tcp", (err) => {
    if (err) {
      console.log("⚠️ Could not kill process (may not exist)");
    }

    // restart server using absolute path resolved from this module
    const serverPath = path.resolve(__dirname, "../backend/server.js");
    console.log("🚀 Starting server from:", serverPath);

    exec(`node ${serverPath}`, (err, stdout, stderr) => {
      if (err) {
        console.error("❌ Failed to restart server:", err);
        return;
      }

      console.log("🚀 Server restarted");
    });
  });
}

async function checkServerHealth() {
  try {
    const res = await fetch("http://localhost:3000/notes");
    if (!res.ok) return false;

    const data = await res.json();
    console.log("📊 API response:", data);

    if (!data) return false;
    if (!Array.isArray(data)) return false;
    if (data.some((item) => !item || typeof item !== "object")) return false;

    return true;
  } catch (_) {
    return false;
  }
}

// main function
async function applyFix({ filePath, originalLine, fixedLine, lineNumber }) {
  try {
    console.log("\n🛠 Applying auto-fix...");

    // safety check
    if (!filePath || !originalLine || !fixedLine) {
      console.log("❌ Missing required data");
      return;
    }

    backupFile(filePath);

    const success = replaceLine(filePath, lineNumber, fixedLine);

    if (!success) return;

    fs.appendFileSync("fix.log",
      `[${new Date().toISOString()}]
File: ${filePath}
Line: ${lineNumber}
Old: ${originalLine}
New: ${fixedLine}
-----------------------
`
    );

    restartServer();

    await new Promise((resolve) => setTimeout(resolve, 2000));
    const isHealthy = await checkServerHealth();

    if (!isHealthy) {
      console.log("❌ Fix failed, rolling back...");
      fs.copyFileSync(filePath + ".bak", filePath);
      console.log("♻️ Backup restored");
      restartServer();
    } else {
      console.log("✅ Fix successful");
    }

  } catch (error) {
    console.error("autoFix error:", error);
  }
}

module.exports = { applyFix };