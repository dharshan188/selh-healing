const fs = require("fs");
const path = require("path");

const MAX_FILES = 6;
const MAX_CHARS = 12000;

// recursively collect .js files
function collectJSFiles(dir, fileList = []) {
  try {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const fullPath = path.join(dir, file);

      if (fs.statSync(fullPath).isDirectory()) {
        // skip node_modules for performance
        if (file === "node_modules") continue;
        collectJSFiles(fullPath, fileList);
      } else if (file.endsWith(".js")) {
        fileList.push(fullPath);
      }
    }
  } catch (_) {}

  return fileList;
}

// get related files near base file
function getRelatedFiles(baseFilePath) {
  try {
    const baseDir = path.dirname(baseFilePath);

    const allFiles = collectJSFiles(baseDir);

    // prioritize nearby files
    const filtered = allFiles
      .filter(fp => fp !== baseFilePath)
      .slice(0, MAX_FILES);

    return filtered;
  } catch (err) {
    console.error("getRelatedFiles error:", err);
    return [];
  }
}

// read file contents safely
function readFiles(filePaths) {
  let combined = "";

  for (const fp of filePaths) {
    try {
      const content = fs.readFileSync(fp, "utf-8");

      combined += `\n\nFILE: ${fp}\n${content}`;

      if (combined.length > MAX_CHARS) break;
    } catch (_) {}
  }

  return combined.slice(0, MAX_CHARS);
}

module.exports = {
  getRelatedFiles,
  readFiles,
};
