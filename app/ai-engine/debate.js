const fs = require("fs");
const path = require("path");

const { askGroq } = require("./groqClient");
const {
  getFixPrompt,
  getCriticPrompt,
  getRefinePrompt,
  getJudgePrompt,
} = require("./prompts");

// Extract ONLY the corrected line
function extractCodeLine(text) {
  try {
    const safeText = String(text || "").trim();

    // If model outputs "Code: ..."
    const codeMatch = safeText.match(/Code:\s*(.*)/i);
    if (codeMatch) return codeMatch[1].trim();

    // Otherwise return last line (fallback)
    const lines = safeText.split("\n").filter(Boolean);
    return lines[lines.length - 1].trim();
  } catch (err) {
    console.error("extractCodeLine error:", err);
    return "";
  }
}

async function runDebate(errorLog) {
  try {
    const errorText = String(errorLog || "");

    // 🧠 Load backend code context
    const codeContext = fs.readFileSync(
      path.resolve(__dirname, "../backend/server.js"),
      "utf-8"
    );

    // ROUND 1 — Agent A (Initial Fix)
    const agentAResponse = await askGroq(
      getFixPrompt(errorText, codeContext)
    );
    console.log("\nAgent A Response\n", agentAResponse);

    // ROUND 1 — Agent B (Critique)
    const agentBCritique1 = await askGroq(
      getCriticPrompt(agentAResponse)
    );
    console.log("\nAgent B Critique\n", agentBCritique1);

    // ROUND 2 — Agent A (Refinement)
    const refinedFix = await askGroq(
      getRefinePrompt(errorText, agentAResponse, agentBCritique1, codeContext)
    );
    console.log("\nAgent A Response\n", refinedFix);

    // ROUND 2 — Agent B (Deeper Critique)
    const agentBCritique2 = await askGroq(
      getCriticPrompt(refinedFix)
    );
    console.log("\nAgent B Critique\n", agentBCritique2);

    // FINAL — Judge Agent
    const judgeInput = `${refinedFix}\n\nSecond Critique:\n${agentBCritique2}`;

    const finalAnswerText = await askGroq(
      getJudgePrompt(errorText, judgeInput, codeContext)
    );
    console.log("\nFinal Answer\n", finalAnswerText);

    // 🧠 Extract final corrected line
    const finalLine = extractCodeLine(finalAnswerText);

    return {
      explanation: "Minimal fix applied based on AI debate.",
      finalFix: finalLine,
      code: finalLine,
    };
  } catch (error) {
    console.error("runDebate error:", error);

    return {
      explanation: "Debate pipeline failed.",
      finalFix: "Check logs and retry.",
      code: "",
    };
  }
}

module.exports = { runDebate };