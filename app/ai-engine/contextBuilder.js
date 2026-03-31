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
    // collect from the backend root so we can surface files across layers
    const backendRoot = path.resolve(__dirname, '../backend');

    const allFiles = collectJSFiles(backendRoot);

    // keep files that are likely relevant (controllers, services, routes, server)
    const related = allFiles.filter((f) => {
      const lower = f.toLowerCase();
      return (
        lower.includes('controller') ||
        lower.includes('service') ||
        lower.includes('route') ||
        lower.includes('server')
      );
    });

    // Ensure the buggy file is first, then add related files
    const files = [baseFilePath, ...related.filter(f => f !== baseFilePath)];

    // Remove duplicates while preserving order
    const uniqueFiles = Array.from(new Set(files));

    return uniqueFiles.slice(0, MAX_FILES);
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
