require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const sequelize = require("./config/db");
require("./models"); // load models + associations

const auditLog = require("./middleware/auditLog");

const authRoutes = require("./routes/authRoutes");
const branchRoutes = require("./routes/branchRoutes");
const memberRoutes = require("./routes/memberRoutes");
const groupRoutes = require("./routes/groupRoutes");
const userRoutes = require("./routes/userRoutes");
const loanProductRoutes = require("./routes/loanProductRoutes");
const loanApplicationRoutes = require("./routes/loanApplicationRoutes");
const loanRoutes = require("./routes/loanRoutes");
const savingsRoutes = require("./routes/savingsRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const meetingRoutes = require("./routes/meetingRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const donorRoutes = require("./routes/donorRoutes");
const reportRoutes = require("./routes/reportRoutes");
const auditLogRoutes = require("./routes/auditLogRoutes");
const adminRoutes = require("./routes/adminRoutes");
const portalAuthRoutes = require("./routes/portalAuthRoutes");
const portalRoutes = require("./routes/portalRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const chatbotRoutes = require("./routes/chatbotRoutes");

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173" }));

// The Stripe webhook must be mounted BEFORE express.json(). Signature
// verification hashes the exact bytes Stripe sent, so the body has to stay
// unparsed - once express.json() consumes and re-serialises the stream, the
// signature can no longer be verified and every webhook would be rejected.
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// FR-21 Audit Log & Activity Tracking - fires after any successful
// mutating request (POST/PATCH/DELETE) that reaches a mounted /api route.
app.use("/api", (req, res, next) => {
  if (["POST", "PATCH", "DELETE"].includes(req.method)) {
    return auditLog(`${req.method} ${req.baseUrl}${req.path}`)(req, res, next);
  }
  next();
});

app.use("/api/auth", authRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/users", userRoutes);
app.use("/api/loan-products", loanProductRoutes);
app.use("/api/loan-applications", loanApplicationRoutes);
app.use("/api/loans", loanRoutes);
app.use("/api/savings-accounts", savingsRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/meetings", meetingRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/donors", donorRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/audit-logs", auditLogRoutes);
app.use("/api/admin", adminRoutes);

// Borrower Portal / Payment Gateway. portal/auth is mounted before the
// broader /api/portal prefix so public register/login never fall through
// into portalRoutes' router.use(requireMemberAuth).
app.use("/api/portal/auth", portalAuthRoutes);
app.use("/api/portal", portalRoutes);
app.use("/api/payments", paymentRoutes);

// AI Assistant - server-side proxy so the provider key never reaches the
// browser. Public, with optional member/staff context taken from a token.
app.use("/api/assistant", chatbotRoutes);

app.get("/api/health", (req, res) => res.status(200).json({ status: "ok" }));

app.use((req, res) => res.status(404).json({ message: "Not found." }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: err.message || "Something went wrong." });
});

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    app.listen(PORT, () => console.log(`MFNet backend listening on port ${PORT}`));
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = app;
