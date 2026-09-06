// AI provider adapter for the MFNet assistant.
//
// Like the payment gateways, nothing here is hardcoded: the key, model,
// endpoint, and provider name all come from environment variables, so the
// assistant can be repointed or the key rotated without a code change.
//
// Default provider is Google Gemini, called over its *native* REST endpoint
// with the x-goog-api-key header. That matters: Google has begun issuing
// keys with an "AQ." prefix alongside the older "AIza" format, and while the
// native endpoint accepts both, OpenAI-compatible shim routes reject the new
// format with a 401. Talking to the native endpoint keeps either key format
// working.
const axios = require("axios");

const DEFAULT_GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";

function isConfigured() {
  return Boolean(process.env.AI_API_KEY);
}

function providerName() {
  return (process.env.AI_PROVIDER || "gemini").toLowerCase();
}

function model() {
  return process.env.AI_MODEL || "gemini-2.0-flash";
}

// Builds the instruction that defines what the assistant is and, crucially,
// what it must not do. The assistant answers questions about how MFNet
// works; it never quotes balances it wasn't given, and never promises an
// approval decision.
function buildSystemPrompt(context) {
  const base = [
    "You are the MFNet Foundation assistant, embedded in a microfinance NGO management system in Bangladesh.",
    "MFNet serves two kinds of users: borrowers (members) using the Borrower Portal, and staff (loan officers, branch managers, admins) using the staff console.",
    "",
    "What you help with:",
    "- Explaining how loans, applications, approvals, repayment schedules, savings accounts, and payments work at MFNet.",
    "- Walking someone through using the site: applying for a loan, checking application status, paying an installment, opening a savings account.",
    "- Explaining money words in simple terms (guarantor, collateral, instalment, principal, interest, disbursement, KYC).",
    "",
    "Rules you must follow:",
    "- WRITE IN SIMPLE, PLAIN ENGLISH. Short sentences. Common everyday words. Many people using MFNet do not speak English as a first language, and some are reading on a small phone screen. If you must use a banking word like 'instalment' or 'collateral', explain it in the same sentence.",
    "- Do not assume anything about who you are talking to - not their gender, their job, their income, or their family. MFNet lends to anyone who qualifies.",
    "- Amounts are in Bangladeshi Taka (৳).",
    "- Never invent a specific balance, due date, interest rate, or application status. If it isn't in the context below, tell the person where to find it in the app instead.",
    "- Never promise that a loan will be approved. Approval is a staff decision that follows an amount-based approval chain.",
    "- You cannot perform actions - you cannot approve, disburse, pay, or change any record. Point the person at the right page instead.",
    "- Never ask for or repeat a password, PIN, full card number, or one-time code.",
    "- Keep answers short: three or four sentences at most.",
    "- If a question is outside MFNet (general trivia, homework, code), say that's outside what you can help with here.",
  ];

  if (context && context.audience === "member") {
    base.push(
      "",
      "You are currently talking to a logged-in borrower about their own account.",
      "Here is their real data - you may reference it directly:",
      context.summary
    );
  } else if (context && context.audience === "staff") {
    base.push("", "You are currently talking to an MFNet staff user.");
  } else {
    base.push("", "You are talking to a website visitor who is not logged in. Keep answers general and don't ask for personal details.");
  }

  return base.join("\n");
}

// Calls Gemini's native generateContent endpoint.
async function askGemini({ systemPrompt, history, message }) {
  const baseUrl = process.env.AI_API_URL || DEFAULT_GEMINI_URL;
  const url = `${baseUrl}/${model()}:generateContent`;

  // Gemini expects alternating user/model turns under "contents", with the
  // standing instruction supplied separately as system_instruction.
  const contents = [
    ...history.map((turn) => ({
      role: turn.role === "assistant" ? "model" : "user",
      parts: [{ text: String(turn.content).slice(0, 4000) }],
    })),
    { role: "user", parts: [{ text: message }] },
  ];

  const { data } = await axios.post(
    url,
    {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 600,
      },
    },
    {
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.AI_API_KEY,
      },
      timeout: Number(process.env.AI_TIMEOUT_MS || 20000),
    }
  );

  const candidate = data && data.candidates && data.candidates[0];
  const parts = candidate && candidate.content && candidate.content.parts;
  const text = Array.isArray(parts) ? parts.map((p) => p.text || "").join("").trim() : "";

  if (!text) {
    throw new Error("The AI provider returned an empty response.");
  }
  return text;
}

// OpenAI-compatible chat completions, for anyone who wants to point this at
// OpenAI, Groq, OpenRouter, a local Ollama, etc. Selected with
// AI_PROVIDER=openai and AI_API_URL set to the provider's base URL.
async function askOpenAICompatible({ systemPrompt, history, message }) {
  const baseUrl = process.env.AI_API_URL || "https://api.openai.com/v1";
  const { data } = await axios.post(
    `${baseUrl}/chat/completions`,
    {
      model: model(),
      temperature: 0.3,
      max_tokens: 600,
      messages: [
        { role: "system", content: systemPrompt },
        ...history.map((t) => ({
          role: t.role === "assistant" ? "assistant" : "user",
          content: String(t.content).slice(0, 4000),
        })),
        { role: "user", content: message },
      ],
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
      },
      timeout: Number(process.env.AI_TIMEOUT_MS || 20000),
    }
  );
  const text = data && data.choices && data.choices[0] && data.choices[0].message.content;
  if (!text) throw new Error("The AI provider returned an empty response.");
  return text.trim();
}

async function ask({ systemPrompt, history = [], message }) {
  if (!isConfigured()) {
    throw new Error("AI_API_KEY is not set.");
  }
  if (providerName() === "openai") {
    return askOpenAICompatible({ systemPrompt, history, message });
  }
  return askGemini({ systemPrompt, history, message });
}

module.exports = { ask, isConfigured, providerName, model, buildSystemPrompt };
