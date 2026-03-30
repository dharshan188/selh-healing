const fs = require("fs");
const { exec } = require("child_process");

// backup file before modifying
function backupFile(filePath) {
  const backupPath = filePath + ".bak";
  fs.copyFileSync(filePath, backupPath);
  console.log("📦 Backup created:", backupPath);
}

// replace ONLY exact line
function replaceLine(filePath, originalLine, fixedLine) {
  const content = fs.readFileSync(filePath, "utf-8").split("\n");

  function normalize(line) {
    return line
      .replace(/\s+/g, " ")
      .replace(/;/g, "")
      .trim();
  }

  const normalizedOriginal = normalize(originalLine);
  const matchedIndexes = content
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => normalize(line).includes(normalizedOriginal))
    .map(({ index }) => index);

  if (matchedIndexes.length === 0) {
    console.log("❌ No match found, skipping");
    return false;
  }

  if (matchedIndexes.length > 1) {
    console.log("⚠️ Multiple matches found, skipping");
    return false;
  }

  const index = matchedIndexes[0];

  content[index] = fixedLine;

  fs.writeFileSync(filePath, content.join("\n"));
  console.log("✅ Fix applied at line", index + 1);

  return true;
}

// restart server (simple method)
function restartServer() {
  console.log("🔁 Restarting server...");

  // kill old node process on port 3000
  exec("fuser -k 3000/tcp", (err) => {
    if (err) {
      console.log("⚠️ Could not kill process (may not exist)");
    }

    // restart server
    exec("node app/backend/server.js", (err, stdout, stderr) => {
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
    const response = await fetch("http://localhost:3000/notes");
    return response.ok;
  } catch (_) {
    return false;
  }
}

// main function
async function applyFix({ filePath, originalLine, fixedLine }) {
  try {
    console.log("\n🛠 Applying auto-fix...");

    // safety check
    if (!filePath || !originalLine || !fixedLine) {
      console.log("❌ Missing required data");
      return;
    }

    backupFile(filePath);

    const success = replaceLine(filePath, originalLine, fixedLine);

    if (!success) return;

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