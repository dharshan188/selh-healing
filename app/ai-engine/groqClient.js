require("dotenv").config();

let Groq;

// Read API key from .env via process.env
const apiKey = process.env.GROQ_API_KEY;

console.log("Loaded environment variables");
console.log(`GROQ_API_KEY detected: ${apiKey ? "yes" : "no"}`);

try {
  // Importing the official Groq SDK (CommonJS)
  Groq = require("groq-sdk");
} catch (error) {
  // Keep module load safe even if dependency is missing
  Groq = null;
}

let client = null;

function getClient() {
  try {
    if (!apiKey) {
      return null;
    }

    if (!Groq) {
      return null;
    }

    if (!client) {
      client = new Groq({ apiKey });
    }

    return client;
  } catch (error) {
    console.error("groqClient initialization error:", error);
    return null;
  }
}

async function askGroq(prompt) {
  try {
    if (!process.env.GROQ_API_KEY) {
      console.error("Missing GROQ_API_KEY in .env file");
      return "Mock response: GROQ_API_KEY is missing. Add it to .env to enable real Groq suggestions.";
    }

    const groq = getClient();

    // Graceful fallback when API key/sdk is unavailable
    if (!groq) {
      return "Groq unavailable: set GROQ_API_KEY and install groq-sdk to enable live responses.";
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2,
    });

    const content = completion?.choices?.[0]?.message?.content;
    return content || "No response text returned by Groq.";
  } catch (error) {
    console.error("askGroq error:", error);
    return "Groq request failed. Check API key, network, and payload.";
  }
}

module.exports = { askGroq };
