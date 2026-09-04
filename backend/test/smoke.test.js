/**
 * Isolated, SQLite-backed smoke test.
 *
 * Runs the whole Express app against an in-memory SQLite database (set via
 * DB_DIALECT=sqlite before any app module is required) and exercises every
 * endpoint added/kept in this delivery, covering success, validation
 * failure, and permission failure cases, per MASTER_PROMPT section 0 / 11.5.
 *
 * Usage: npm test   (from backend/)
 * Requires: npm install (express, sequelize, sqlite3, bcryptjs, jsonwebtoken,
 * multer, cors, express-validator) to have been run first.
 */
process.env.DB_DIALECT = "sqlite";
process.env.DB_STORAGE = ":memory:";
process.env.JWT_SECRET = "test-secret";
process.env.NODE_ENV = "test";
// Run the whole suite against the mock gateway: no Stripe account, no
// network, no card details - but the exact same controller and ledger code
// paths a real Stripe payment takes.
process.env.PAYMENT_PROVIDER = "mock";

// Keep this suite hermetic. A developer's real .env may well have live
// Stripe and AI credentials in it, and dotenv will not overwrite a variable
// that is already set - so blanking these here means the test always
// exercises the mock gateway and the built-in assistant fallback, and never
// makes a paid API call or a network request just because someone happened
// to have keys configured.
process.env.STRIPE_SECRET_KEY = "";
process.env.STRIPE_PUBLISHABLE_KEY = "";
process.env.AI_API_KEY = "";

const http = require("http");

let passed = 0;
let failed = 0;

function assert(cond, message) {
  if (cond) {
    passed += 1;
    console.log(`  ok - ${message}`);
  } else {
    failed += 1;
    console.error(`  FAIL - ${message}`);
  }
}

async function request(server, method, path, { token, body, isMultipart } = {}) {
  return new Promise((resolve, reject) => {
    const data = body && !isMultipart ? JSON.stringify(body) : null;
    const headers = {};
    if (data) {
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = Buffer.byteLength(data);
    }
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const { port } = server.address();
    const req = http.request(
      { host: "127.0.0.1", port, path, method, headers },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          let json = null;
          try {
            json = raw ? JSON.parse(raw) : null;
          } catch (e) {
            json = raw;
          }
          resolve({ status: res.statusCode, body: json });
        });
      }
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  const sequelize = require("../src/config/db");
  const models = require("../src/models");
  const app = require("../src/server");

  await sequelize.sync({ force: true });

  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));

  console.log("\n== FR-01 Auth ==");
  let r = await request(server, "POST", "/api/auth/register", {
    body: { fullName: "Admin User", email: "admin@mfnet.test", password: "password123", role: "admin" },
  });
  assert(r.status === 201 && r.body.token, "admin registers successfully");
  const adminToken = r.body.token;

  r = await request(server, "POST", "/api/auth/register", {
    body: { fullName: "Short Pass", email: "shortpass@mfnet.test", password: "abc" },
  });
  assert(r.status === 400, "registration rejects password under 8 chars");

  r = await request(server, "POST", "/api/auth/register", {
    body: { fullName: "Admin User", email: "admin@mfnet.test", password: "password123" },
  });
  assert(r.status === 409, "duplicate email registration returns 409");

  r = await request(server, "POST", "/api/auth/login", {
    body: { email: "admin@mfnet.test", password: "wrongpassword" },
  });
  assert(r.status === 401, "login with wrong password returns 401");

  r = await request(server, "GET", "/api/auth/me", { token: adminToken });
  assert(r.status === 200 && r.body.user.email === "admin@mfnet.test", "GET /auth/me returns current user");
  assert(r.body.user.passwordHash === undefined, "passwordHash is never returned");

  r = await request(server, "POST", "/api/auth/register", {
    body: { fullName: "Branch Mgr", email: "bm@mfnet.test", password: "password123", role: "branch_manager" },
  });
  const bmToken = r.body.token;

  r = await request(server, "POST", "/api/auth/register", {
    body: { fullName: "Loan Officer", email: "lo@mfnet.test", password: "password123", role: "loan_officer" },
  });
  const loToken = r.body.token;
  const loUserId = r.body.user.id;

  console.log("\n== FR-14 Branch Management ==");
  r = await request(server, "POST", "/api/branches", {
    token: adminToken,
    body: { branchName: "Dhaka Main", address: "Dhaka", contactNumber: "01700000000" },
  });
  assert(r.status === 201, "admin creates a branch");
  const branchId = r.body.branch.id;

  r = await request(server, "POST", "/api/branches", {
    token: loToken,
    body: { branchName: "Should fail" },
  });
  assert(r.status === 403, "non-admin cannot create a branch");

  r = await request(server, "GET", "/api/branches", { token: loToken });
  assert(r.status === 200 && r.body.branches.length === 1, "any authenticated user can list branches");

  console.log("\n== FR-04 Group Management ==");
  r = await request(server, "POST", "/api/groups", {
    token: adminToken,
    body: { groupName: "Riverside Group A", branchId, loanOfficerId: loUserId },
  });
  assert(r.status === 201, "creates a group with a loan officer assigned");
  const groupId = r.body.group.id;

  console.log("\n== FR-03 Member / KYC Management ==");
  r = await request(server, "POST", "/api/members", {
    token: loToken,
    body: { fullName: "Amina Begum", nationalId: "NID-0001", branchId, groupId, phone: "01711111111" },
  });
  assert(r.status === 201, "creates a member");
  const memberId = r.body.member.id;

  r = await request(server, "POST", "/api/members", {
    token: loToken,
    body: { fullName: "Duplicate", nationalId: "NID-0001" },
  });
  assert(r.status === 409, "duplicate nationalId returns 409");

  r = await request(server, "PATCH", `/api/members/${memberId}/kyc`, {
    token: loToken,
    body: { status: "verified" },
  });
  assert(r.status === 200 && r.body.member.kycStatus === "verified", "KYC status updates");

  console.log("\n== FR-05 Loan Product Configuration ==");
  r = await request(server, "POST", "/api/loan-products", {
    token: adminToken,
    body: { productName: "Micro Growth", interestRate: 12, maxAmount: 100000, tenureMonths: 12 },
  });
  assert(r.status === 201, "admin creates a loan product");
  const productId = r.body.product.id;

  console.log("\n== FR-06/07 Loan Application + Approval Workflow ==");
  r = await request(server, "POST", "/api/loan-applications", {
    token: loToken,
    body: { memberId, loanProductId: productId, requestedAmount: 40000, purpose: "Sewing machine" },
  });
  assert(r.status === 201, "creates a loan application under threshold 1 (single stage)");
  const appId = r.body.application.id;
  assert(
    JSON.stringify(r.body.application.requiredStages) === JSON.stringify(["loan_officer"]),
    "amount <= 50000 requires only loan_officer stage"
  );

  r = await request(server, "POST", "/api/loan-applications", {
    token: loToken,
    body: { memberId, loanProductId: productId, requestedAmount: 999999 },
  });
  assert(r.status === 400, "requestedAmount exceeding product maxAmount is rejected");

  r = await request(server, "POST", `/api/loan-applications/${appId}/decision`, {
    token: bmToken,
    body: { decision: "approved" },
  });
  assert(r.status === 403, "wrong-stage role cannot decide the application");

  r = await request(server, "POST", `/api/loan-applications/${appId}/decision`, {
    token: loToken,
    body: { decision: "approved", comments: "Looks good" },
  });
  assert(r.status === 200 && r.body.application.status === "approved", "loan_officer approval finalizes single-stage application");

  r = await request(server, "POST", `/api/loan-applications/${appId}/decision`, {
    token: loToken,
    body: { decision: "approved" },
  });
  assert(r.status === 400, "cannot decide an already-decided application");

  console.log("\n== FR-08 Guarantor & Collateral Management ==");
  r = await request(server, "POST", `/api/loan-applications/${appId}/guarantors`, {
    token: loToken,
    body: { fullName: "Karim Sheikh", relationToApplicant: "Brother", contactNumber: "01755555555" },
  });
  assert(r.status === 201, "adds a guarantor to an application");

  r = await request(server, "POST", `/api/loan-applications/${appId}/collateral`, {
    token: loToken,
    body: { description: "Sewing machine", estimatedValue: 15000 },
  });
  assert(r.status === 201, "adds collateral to an application");

  r = await request(server, "GET", `/api/loan-applications/${appId}`, { token: loToken });
  assert(
    r.body.application.guarantors.length === 1 && r.body.application.collaterals.length === 1,
    "application detail includes guarantors and collateral"
  );

  console.log("\n== FR-09 Loan Disbursement ==");
  r = await request(server, "POST", `/api/loan-applications/${appId}/disburse`, { token: loToken });
  assert(r.status === 403, "loan_officer cannot disburse (admin/branch_manager only)");

  r = await request(server, "POST", `/api/loan-applications/${appId}/disburse`, { token: bmToken });
  assert(r.status === 201 && r.body.loan.outstandingBalance == 40000, "branch_manager disburses the loan");
  const loanId = r.body.loan.id;

  r = await request(server, "POST", `/api/loan-applications/${appId}/disburse`, { token: bmToken });
  assert(r.status === 409, "cannot disburse the same application twice");

  console.log("\n== FR-10 Repayment Scheduling & Repayments ==");
  r = await request(server, "GET", `/api/loans/${loanId}`, { token: loToken });
  assert(r.body.loan.repaymentSchedules.length === 12, "disbursement generates a 12-month repayment schedule");

  r = await request(server, "POST", `/api/loans/${loanId}/repayments`, {
    token: loToken,
    body: { amount: 3733.33 },
  });
  assert(r.status === 201, "records a repayment against the earliest unpaid installment");

  r = await request(server, "GET", `/api/loans/${loanId}`, { token: loToken });
  const paidCount = r.body.loan.repaymentSchedules.filter((s) => s.status === "paid").length;
  assert(paidCount === 1, "exactly one installment marked paid after one repayment");

  console.log("\n== FR-11 Overdue Detection ==");
  r = await request(server, "POST", "/api/admin/run-overdue-check", { token: loToken });
  assert(r.status === 403, "non-admin cannot run the overdue check");

  r = await request(server, "POST", "/api/admin/run-overdue-check", { token: adminToken });
  assert(r.status === 200, "admin can run the overdue check");

  console.log("\n== FR-12 Savings Accounts ==");
  r = await request(server, "POST", "/api/members", {
    token: loToken,
    body: { fullName: "Rina Akter", nationalId: "NID-0002" },
  });
  const member2Id = r.body.member.id;

  r = await request(server, "POST", `/api/members/${member2Id}/savings-account`, { token: loToken });
  assert(r.status === 201, "opens a savings account for a member");
  const savingsId = r.body.savingsAccount.id;

  r = await request(server, "POST", `/api/savings-accounts/${savingsId}/deposit`, {
    token: loToken,
    body: { amount: 5000 },
  });
  assert(r.status === 201 && Number(r.body.savingsAccount.balance) === 5000, "deposit increases balance");

  r = await request(server, "POST", `/api/savings-accounts/${savingsId}/withdraw`, {
    token: loToken,
    body: { amount: 10000 },
  });
  assert(r.status === 400, "withdrawal exceeding balance is rejected");

  r = await request(server, "POST", `/api/savings-accounts/${savingsId}/withdraw`, {
    token: loToken,
    body: { amount: 2000 },
  });
  assert(r.status === 201 && Number(r.body.savingsAccount.balance) === 3000, "valid withdrawal decreases balance");

  console.log("\n== FR-13 Expense Management ==");
  r = await request(server, "POST", "/api/expenses", {
    token: loToken,
    body: { category: "Rent", amount: 1000 },
  });
  assert(r.status === 403, "non-manager cannot create an expense");

  r = await request(server, "POST", "/api/expenses", {
    token: adminToken,
    body: { category: "Rent", amount: 20000, branchId },
  });
  assert(r.status === 201, "admin creates an expense");

  console.log("\n== FR-15 Field Officer Management ==");
  r = await request(server, "PATCH", `/api/groups/${groupId}`, {
    token: adminToken,
    body: { loanOfficerId: loUserId },
  });
  assert(r.status === 200, "PATCH /api/groups/:id reassigns loanOfficerId");

  console.log("\n== FR-16 Meeting Scheduling ==");
  r = await request(server, "POST", `/api/groups/${groupId}/meetings`, {
    token: loToken,
    body: { scheduledDate: "2026-09-01T10:00:00.000Z", location: "Community hall" },
  });
  assert(r.status === 201, "schedules a group meeting");
  const meetingId = r.body.meeting.id;

  r = await request(server, "PATCH", `/api/meetings/${meetingId}`, {
    token: loToken,
    body: { status: "completed" },
  });
  assert(r.status === 200 && r.body.meeting.status === "completed", "updates meeting status");

  console.log("\n== FR-17 Notifications ==");
  r = await request(server, "GET", "/api/notifications", { token: loToken });
  assert(r.status === 200 && Array.isArray(r.body.notifications), "lists notifications for logged-in user");

  console.log("\n== FR-18 Donor & Funding Source Management ==");
  r = await request(server, "POST", "/api/donors", {
    token: loToken,
    body: { donorName: "Should fail" },
  });
  assert(r.status === 403, "non-admin cannot create a donor");

  r = await request(server, "POST", "/api/donors", {
    token: adminToken,
    body: { donorName: "Global Impact Fund", contactInfo: "contact@gif.example" },
  });
  assert(r.status === 201, "admin creates a donor");
  const donorId = r.body.donor.id;

  r = await request(server, "POST", `/api/donors/${donorId}/contributions`, {
    token: adminToken,
    body: { amount: 500000, branchId },
  });
  assert(r.status === 201, "records a contribution from a donor");

  console.log("\n== FR-19 Reports & Analytics ==");
  r = await request(server, "GET", "/api/reports/summary", { token: loToken });
  assert(
    r.status === 200 && r.body.summary.totalActiveLoans === 1 && r.body.summary.totalMembers === 2,
    "reports summary aggregates across tables"
  );

  console.log("\n== FR-20 Document Management (extended) ==");
  r = await request(server, "GET", `/api/members/${memberId}`, { token: loToken });
  const hasLoanAgreement = r.body.member.documents.some((d) => d.docType === "loan_agreement");
  assert(hasLoanAgreement, "disbursement auto-generates a loan_agreement Document row");

  console.log("\n== FR-21 Audit Log & Activity Tracking ==");
  r = await request(server, "GET", "/api/audit-logs", { token: loToken });
  assert(r.status === 403, "non-admin cannot read the audit log");

  r = await request(server, "GET", "/api/audit-logs", { token: adminToken });
  assert(r.status === 200 && r.body.auditLogs.length > 0, "audit log recorded prior mutating requests");

  console.log("\n== Borrower Portal: activation & login ==");
  r = await request(server, "POST", "/api/portal/auth/register", {
    body: { nationalId: "NID-0001", phone: "wrong-number", password: "borrowerpass1" },
  });
  assert(r.status === 400, "portal activation rejects a phone number that doesn't match records");

  r = await request(server, "POST", "/api/portal/auth/register", {
    body: { nationalId: "NID-9999", phone: "01711111111", password: "borrowerpass1" },
  });
  assert(r.status === 404, "portal activation rejects an unknown nationalId");

  r = await request(server, "POST", "/api/portal/auth/register", {
    body: { nationalId: "NID-0001", phone: "01711111111", password: "borrowerpass1" },
  });
  assert(r.status === 201 && r.body.token, "member (Amina) activates portal access with matching nationalId + phone");
  const memberToken = r.body.token;

  r = await request(server, "POST", "/api/portal/auth/register", {
    body: { nationalId: "NID-0001", phone: "01711111111", password: "anotherpass1" },
  });
  assert(r.status === 409, "cannot activate portal access twice for the same member");

  r = await request(server, "POST", "/api/portal/auth/login", {
    body: { nationalId: "NID-0001", password: "wrongpassword" },
  });
  assert(r.status === 401, "portal login rejects a wrong password");

  r = await request(server, "POST", "/api/portal/auth/login", {
    body: { nationalId: "NID-0001", password: "borrowerpass1" },
  });
  assert(r.status === 200 && r.body.token, "member logs in to the portal");

  r = await request(server, "GET", "/api/portal/auth/me", { token: memberToken });
  assert(r.status === 200 && r.body.member.nationalId === "NID-0001", "GET /api/portal/auth/me returns the logged-in member");
  assert(r.body.member.passwordHash === undefined, "portal passwordHash is never returned");

  // Second member's portal account, for ownership-isolation checks below.
  r = await request(server, "POST", "/api/portal/auth/register", {
    body: { nationalId: "NID-0002", phone: "", password: "borrowerpass2" },
  });
  assert(r.status === 400, "portal activation rejects a member with no phone on file yet");

  console.log("\n== Token type separation (staff vs member) ==");
  r = await request(server, "GET", "/api/branches", { token: memberToken });
  assert(r.status === 401, "a member token is rejected by staff-only requireAuth");

  r = await request(server, "GET", "/api/portal/auth/me", { token: loToken });
  assert(r.status === 401, "a staff token is rejected by requireMemberAuth");

  console.log("\n== Borrower Portal: self-service loan application ==");
  r = await request(server, "GET", "/api/portal/loan-products", { token: memberToken });
  assert(r.status === 200 && r.body.products.length >= 1, "member can browse active loan products");

  r = await request(server, "POST", "/api/portal/loan-applications", {
    token: memberToken,
    body: { loanProductId: productId, requestedAmount: 20000, purpose: "Poultry stock" },
  });
  assert(r.status === 201 && r.body.application.member === undefined, "member submits their own loan application");
  const selfAppId = r.body.application.id;

  r = await request(server, "GET", "/api/portal/loan-applications", { token: memberToken });
  assert(
    r.status === 200 && r.body.applications.every((a) => a.id === selfAppId || a.id === appId),
    "member's application list only contains their own applications"
  );

  console.log("\n== Borrower Portal: ownership isolation ==");
  r = await request(server, "POST", "/api/portal/auth/login", { body: { nationalId: "NID-0002", password: "wontexist1" } });
  assert(r.status === 401, "second member cannot log in before activating portal access");

  r = await request(server, "GET", `/api/portal/loans/${loanId}`, { token: memberToken });
  assert(r.status === 200, "member can view their own disbursed loan");

  console.log("\n== Payment Gateway (mock mode): loan repayment ==");
  r = await request(server, "GET", `/api/portal/loans/${loanId}`, { token: memberToken });
  const beforeBalance = Number(r.body.loan.outstandingBalance);
  const paidBefore = r.body.loan.repaymentSchedules.filter((s) => s.status === "paid").length;

  r = await request(server, "POST", "/api/portal/payments/initiate", {
    token: memberToken,
    body: { purpose: "loan_repayment", loanId, amount: 3733.33 },
  });
  assert(r.status === 201 && r.body.mock === true && r.body.tranId, "initiating a repayment returns a mock gateway redirect (PAYMENT_PROVIDER=mock)");
  const repaymentTranId = r.body.tranId;

  r = await request(server, "GET", `/api/portal/payments/${repaymentTranId}`, { token: memberToken });
  assert(r.status === 200 && r.body.payment.status === "initiated", "payment starts in 'initiated' status");

  r = await request(server, "POST", `/api/portal/payments/${repaymentTranId}/mock-complete`, {
    token: memberToken,
    body: { outcome: "success" },
  });
  assert(r.status === 200 && r.body.payment.status === "valid", "simulating a successful gateway payment marks it valid");

  r = await request(server, "POST", `/api/portal/payments/${repaymentTranId}/mock-complete`, {
    token: memberToken,
    body: { outcome: "success" },
  });
  assert(r.status === 400, "a settled payment cannot be completed twice");

  r = await request(server, "GET", `/api/portal/loans/${loanId}`, { token: memberToken });
  const afterBalance = Number(r.body.loan.outstandingBalance);
  const paidAfter = r.body.loan.repaymentSchedules.filter((s) => s.status === "paid").length;
  assert(afterBalance < beforeBalance, "gateway repayment decreases the loan's outstanding balance");
  assert(paidAfter === paidBefore + 1, "gateway repayment marks exactly one more installment paid");

  console.log("\n== Payment Gateway (mock mode): savings deposit + cancellation ==");
  r = await request(server, "POST", "/api/members", { token: loToken, body: { fullName: "Portal Tester", nationalId: "NID-0003", phone: "01799999999" } });
  const member3Id = r.body.member.id;
  r = await request(server, "POST", `/api/members/${member3Id}/savings-account`, { token: loToken });
  const savings3Id = r.body.savingsAccount.id;
  r = await request(server, "POST", "/api/portal/auth/register", { body: { nationalId: "NID-0003", phone: "01799999999", password: "borrowerpass3" } });
  const member3Token = r.body.token;

  r = await request(server, "POST", "/api/portal/payments/initiate", {
    token: member3Token,
    body: { purpose: "savings_deposit", savingsAccountId: savingsId, amount: 500 },
  });
  assert(r.status === 404, "a member cannot initiate a payment against another member's savings account");

  r = await request(server, "POST", "/api/portal/payments/initiate", {
    token: member3Token,
    body: { purpose: "savings_deposit", savingsAccountId: savings3Id, amount: 1200 },
  });
  const depositTranId = r.body.tranId;

  r = await request(server, "POST", `/api/portal/payments/${depositTranId}/mock-complete`, {
    token: member3Token,
    body: { outcome: "cancel" },
  });
  assert(r.status === 200 && r.body.payment.status === "cancelled", "simulating a cancelled payment marks it cancelled, not valid");

  r = await request(server, "POST", "/api/portal/payments/initiate", {
    token: member3Token,
    body: { purpose: "savings_deposit", savingsAccountId: savings3Id, amount: 1200 },
  });
  const depositTranId2 = r.body.tranId;
  await request(server, "POST", `/api/portal/payments/${depositTranId2}/mock-complete`, { token: member3Token, body: { outcome: "success" } });

  r = await request(server, "GET", "/api/savings-accounts", { token: loToken });
  const acct3 = r.body.savingsAccounts.find((a) => a.id === savings3Id);
  assert(Number(acct3.balance) === 1200, "a valid gateway deposit credits the savings account balance");

  console.log("\n== Payment Gateway: staff visibility ==");
  r = await request(server, "GET", "/api/payments", { token: loToken });
  assert(r.status === 403, "loan_officer cannot list gateway payments (admin/branch_manager only)");

  r = await request(server, "GET", "/api/payments", { token: adminToken });
  assert(r.status === 200 && r.body.payments.length >= 3, "admin can list all gateway payment attempts");

  console.log("\n== Security: password hashes never leave the server ==");
  // Regression test. The Borrower Portal added Member.passwordHash, and the
  // portal reused the staff include set, which eagerly loads the whole
  // Member row - so every portal loan-application response was shipping the
  // borrower's bcrypt hash to the browser. Guard every path that joins a
  // Member.
  function hasPasswordHash(value) {
    if (value === null || typeof value !== "object") return false;
    if (Array.isArray(value)) return value.some(hasPasswordHash);
    return Object.entries(value).some(
      ([k, v]) => k === "passwordHash" || hasPasswordHash(v)
    );
  }

  r = await request(server, "GET", "/api/portal/loan-applications", { token: memberToken });
  assert(
    r.status === 200 && !hasPasswordHash(r.body),
    "portal loan applications never expose a password hash"
  );

  r = await request(server, "GET", "/api/portal/loans", { token: memberToken });
  assert(r.status === 200 && !hasPasswordHash(r.body), "portal loans never expose a password hash");

  r = await request(server, "GET", "/api/loan-applications", { token: adminToken });
  assert(
    r.status === 200 && !hasPasswordHash(r.body),
    "staff loan applications never expose a member password hash"
  );

  r = await request(server, "GET", "/api/members", { token: adminToken });
  assert(r.status === 200 && !hasPasswordHash(r.body), "staff member list never exposes a password hash");

  r = await request(server, "GET", "/api/groups", { token: adminToken });
  assert(r.status === 200 && !hasPasswordHash(r.body), "group members never expose a password hash");

  console.log("\n== Payment gateway: provider abstraction ==");
  r = await request(server, "GET", "/api/portal/payments/config", { token: memberToken });
  assert(
    r.status === 200 && r.body.provider === "mock" && r.body.mock === true,
    "portal can read which gateway is active without hardcoding one"
  );
  assert(
    r.status === 200 && !r.body.publishableKey,
    "no publishable key is advertised when the mock gateway is active"
  );

  r = await request(server, "GET", "/api/payments", { token: adminToken });
  assert(
    r.status === 200 && r.body.gateway && r.body.gateway.provider === "mock",
    "staff payment list reports the active gateway"
  );

  const { PROVIDERS } = require("../src/utils/gateways");
  const IFACE = ["isConfigured", "createIntent", "retrieveIntent", "constructWebhookEvent", "currency", "toMinorUnits"];
  assert(
    Object.values(PROVIDERS).every((p) => IFACE.every((m) => typeof p[m] === "function")),
    "every registered gateway implements the full provider interface"
  );

  const stripeAdapter = PROVIDERS.stripe;
  assert(
    stripeAdapter.toMinorUnits(120.5) === 12050,
    "stripe adapter converts a decimal amount to minor units"
  );
  assert(
    typeof stripeAdapter.isConfigured() === "boolean" && stripeAdapter.isConfigured() === false,
    "stripe adapter reports itself unconfigured when no secret key is set"
  );

  console.log("\n== AI assistant ==");
  r = await request(server, "GET", "/api/assistant/status");
  assert(r.status === 200 && r.body.available === true, "assistant reports its status");
  assert(
    r.body.liveAI === false && r.body.provider === "fallback",
    "assistant reports fallback mode when no AI key is configured"
  );

  r = await request(server, "POST", "/api/assistant/chat", { body: { message: "How do I pay an installment?" } });
  assert(
    r.status === 200 && typeof r.body.reply === "string" && r.body.reply.length > 20,
    "assistant answers without an AI key configured (built-in fallback)"
  );
  assert(r.body.source === "fallback", "assistant labels a fallback answer as such");

  r = await request(server, "POST", "/api/assistant/chat", { body: { message: "" } });
  assert(r.status === 400, "assistant rejects an empty message");

  r = await request(server, "POST", "/api/assistant/chat", { body: { message: "x".repeat(1500) } });
  assert(r.status === 400, "assistant rejects an over-long message");

  r = await request(server, "POST", "/api/assistant/chat", {
    token: memberToken,
    body: { message: "What do I owe?" },
  });
  assert(r.status === 200 && typeof r.body.reply === "string", "assistant answers a logged-in borrower");

  console.log("\n== Cross-cutting ==");
  r = await request(server, "GET", "/api/branches", {});
  assert(r.status === 401, "unauthenticated requests are rejected");

  r = await request(server, "GET", "/api/health");
  assert(r.status === 200 && r.body.status === "ok", "health check responds");

  server.close();
  await sequelize.close();

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Smoke test crashed:", err);
  process.exit(1);
});
