function getFixPrompt(error, codeContext) {
  return `You are Fix Agent, a senior backend engineer.

STRICT RULES:
- ONLY fix the exact buggy line
- DO NOT create new logic
- DO NOT add new variables
- DO NOT modify unrelated code
- KEEP answer minimal

TASK:
1) Identify the exact incorrect line
2) Fix ONLY that line
3) Return corrected line

CODE CONTEXT:
${codeContext}

ERROR:
${error}

OUTPUT:
<corrected line>`;
}

function getCriticPrompt(fix) {
  return `You are Critic Agent.

STRICT RULES:
- Check ONLY correctness
- NO redesign
- NO extra features

TASK:
- Is this fix correct?
- If wrong, give corrected line

Fix:
${fix}

OUTPUT:
Correct: YES or NO
Better: <corrected line if needed>`;
}

function getRefinePrompt(error, fix, critique, codeContext) {
  return `You are Fix Agent (Refinement Round).

STRICT RULES:
- Apply ONLY necessary correction
- Keep solution minimal
- Output ONLY corrected line

CODE CONTEXT:
${codeContext}

ERROR:
${error}

Previous Fix:
${fix}

Critique:
${critique}

OUTPUT:
<corrected line>`;
}

function getJudgePrompt(error, finalFix, codeContext) {
  return `You are Judge Agent.

STRICT RULES:
- ONLY fix the variable/typo error
- DO NOT change function structure
- DO NOT wrap response in objects
- DO NOT modify API format
- DO NOT improve or refactor code
- DO NOT add anything new

VERY IMPORTANT:
Return ONLY the SAME LINE with corrected variable name.

CODE CONTEXT:
${codeContext}

ERROR:
${error}

CANDIDATE SOLUTION:
${finalFix}

FINAL OUTPUT:
<corrected line ONLY>`;
}

module.exports = {
  getFixPrompt,
  getCriticPrompt,
  getRefinePrompt,
  getJudgePrompt,
};