// AI Assistant - server-side proxy.
//
// The browser never sees AI_API_KEY. It POSTs a message here, this
// controller adds the system prompt (and, for a logged-in borrower, a
// tightly-scoped summary of that borrower's own records), calls the
// provider, and returns only the reply text.
//
// If the provider is unreachable, unconfigured, rate-limited, or returns an
// error, the request falls through to utils/aiFallback so the assistant
// still answers something useful instead of showing a broken chat window.
const jwt = require("jsonwebtoken");
const { Member, Loan, LoanApplication, RepaymentSchedule, SavingsAccount, LoanProduct } = require("../models");
const aiProvider = require("../utils/aiProvider");
const { fallbackReply } = require("../utils/aiFallback");

const MAX_MESSAGE_LENGTH = 1000;
const MAX_HISTORY_TURNS = 10;

// --- Simple in-memory rate limiter ------------------------------------
// Keeps one anonymous visitor (or one member) from burning the project's
// AI quota. In-memory is deliberate: a course project shouldn't need Redis,
// and the limit resetting on restart is acceptable here.
const WINDOW_MS = Number(process.env.AI_RATE_WINDOW_MS || 60000);
const MAX_PER_WINDOW = Number(process.env.AI_RATE_MAX || 15);
const hits = new Map();

function rateLimited(key) {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

// Periodically drop expired buckets so the map can't grow without bound.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of hits) {
    if (now > entry.resetAt) hits.delete(key);
  }
}, WINDOW_MS).unref();

// --- Optional member context ------------------------------------------
// The chat endpoint is public (the assistant is available on the landing
// page too), so auth is optional rather than required. If a valid *member*
// token is present we load a compact summary of that member's own records
// so the assistant can answer "what do I owe?" concretely.
//
// Only the member's own data is ever read, and only these few fields - no
// national ID, no password hash, no other member's records.
async function loadMemberContext(req) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return null;

    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    if (payload.type !== "member") return null;

    const member = await Member.findByPk(payload.id, {
      attributes: ["id", "fullName", "kycStatus"],
    });
    if (!member) return null;

    const [loans, applications, savings] = await Promise.all([
      Loan.findAll({
        include: [
          { model: LoanApplication, as: "loanApplication", where: { memberId: member.id }, required: true },
          { model: RepaymentSchedule, as: "repaymentSchedules" },
        ],
      }),
      LoanApplication.findAll({
        where: { memberId: member.id },
        include: [{ model: LoanProduct, as: "loanProduct", attributes: ["productName"] }],
        order: [["id", "DESC"]],
        limit: 5,
      }),
      SavingsAccount.findOne({ where: { memberId: member.id } }),
    ]);

    const lines = [`Name: ${member.fullName}`, `KYC status: ${member.kycStatus}`];

    if (applications.length) {
      lines.push("Loan applications:");
      applications.forEach((a) => {
        const product = a.loanProduct ? a.loanProduct.productName : "unknown product";
        lines.push(`  - #${a.id}: ৳${a.requestedAmount} for "${product}" - status ${a.status}`);
      });
    } else {
      lines.push("Loan applications: none yet.");
    }

    if (loans.length) {
      lines.push("Active loans:");
      loans.forEach((loan) => {
        const next = (loan.repaymentSchedules || [])
          .filter((r) => r.status !== "paid")
          .sort((a, b) => a.installmentNo - b.installmentNo)[0];
        const nextText = next
          ? `next installment #${next.installmentNo} of ৳${next.amountDue} due ${next.dueDate} (${next.status})`
          : "no unpaid installments";
        lines.push(
          `  - Loan #${loan.id}: principal ৳${loan.principal}, outstanding ৳${loan.outstandingBalance}, status ${loan.status}, ${nextText}`
        );
      });
    } else {
      lines.push("Active loans: none.");
    }

    lines.push(
      savings
        ? `Savings account #${savings.id}: balance ৳${savings.balance}`
        : "Savings account: not opened yet."
    );

    return { audience: "member", summary: lines.join("\n"), key: `member:${member.id}` };
  } catch (err) {
    return null; // an invalid/expired token just means "anonymous visitor"
  }
}

// Detect a staff token so the assistant knows who it's talking to, without
// pulling any staff records into the prompt.
function detectStaff(req) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return null;
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    if (payload.type !== "staff") return null;
    return { audience: "staff", summary: "", key: `staff:${payload.id}` };
  } catch (err) {
    return null;
  }
}

// GET /api/assistant/status
async function status(req, res) {
  return res.status(200).json({
    available: true,
    provider: aiProvider.isConfigured() ? aiProvider.providerName() : "fallback",
    model: aiProvider.isConfigured() ? aiProvider.model() : null,
    liveAI: aiProvider.isConfigured(),
  });
}

// POST /api/assistant/chat  (public; member/staff context added if a token is sent)
async function chat(req, res) {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ message: "A message is required." });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ message: `Please keep messages under ${MAX_MESSAGE_LENGTH} characters.` });
    }

    const context = (await loadMemberContext(req)) || detectStaff(req) || { audience: "public", summary: "" };
    const rateKey = context.key || req.ip || "anon";

    if (rateLimited(rateKey)) {
      return res.status(429).json({
        message: "You're sending messages faster than I can answer. Give it a moment and try again.",
      });
    }

    const safeHistory = Array.isArray(history)
      ? history
          .filter((t) => t && typeof t.content === "string" && (t.role === "user" || t.role === "assistant"))
          .slice(-MAX_HISTORY_TURNS)
      : [];

    if (!aiProvider.isConfigured()) {
      return res.status(200).json({
        reply: fallbackReply(message),
        source: "fallback",
        reason: "No AI_API_KEY is configured, so the assistant is answering from its built-in guide.",
      });
    }

    try {
      const reply = await aiProvider.ask({
        systemPrompt: aiProvider.buildSystemPrompt(context),
        history: safeHistory,
        message: message.trim(),
      });
      return res.status(200).json({ reply, source: aiProvider.providerName() });
    } catch (err) {
      const detail = err.response ? JSON.stringify(err.response.data).slice(0, 500) : err.message;
      console.error("AI provider call failed, using fallback:", detail);
      return res.status(200).json({
        reply: fallbackReply(message),
        source: "fallback",
        reason: "The AI service could not be reached, so this answer comes from the built-in guide.",
      });
    }
  } catch (err) {
    console.error("Assistant error:", err);
    return res.status(500).json({ message: "The assistant is unavailable right now." });
  }
}

module.exports = { chat, status };
