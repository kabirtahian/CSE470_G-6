<<<<<<< HEAD
# MFNet — Microfinance NGO Management System

CSE470 Software Engineering course project, BRAC University.
**Team:** Md. Tahian Kabir (23201411) · Sadia Hayder Deesha (22301263) · Maitry Biswas (22299430)

A full-stack app for running a microfinance NGO: staff auth, branches,
member/KYC records, borrower groups, loan products, the loan
application/approval workflow, guarantors & collateral, disbursement,
repayment scheduling, overdue detection, savings accounts, expenses, field
officer views, meeting scheduling, in-app notifications, donor/contribution
tracking, a reports dashboard, and an audit log.

## Tech stack

- Backend: Node.js + Express 4 (CommonJS), Sequelize 6, MySQL (`mysql2`)
- Auth: `jsonwebtoken` + `bcryptjs`, JWT in `Authorization: Bearer <token>`
- Uploads: `multer`, 5MB limit, `.pdf/.png/.jpg/.jpeg`
- Frontend: React 18 + Vite 5, `react-router-dom` v6, `axios`
- Payments: Stripe (`stripe` server-side, `@stripe/react-stripe-js` Elements client-side)
- AI assistant: provider-agnostic; Google Gemini by default, proxied server-side
- Styling: plain CSS with custom properties (no Tailwind/CSS-in-JS)
- Fonts: Inter for everything, plus the system monospace stack for numbers

## Getting started

### Backend

```bash
cd backend
npm install
cp .env.example .env   # then set a real JWT_SECRET and your MySQL credentials
npm start               # boots on PORT (default 5000), sync({ alter: true })
```

Requires a running MySQL server matching the `.env` credentials — the app
creates/updates tables on boot via `sequelize.sync({ alter: true })`; there
are no migration files yet (documented, matching the original spec).

### Frontend

```bash
cd frontend
npm install
cp .env.example .env   # VITE_API_URL, defaults to http://localhost:5000/api
npm run dev             # boots on port 5173
```

### Automated smoke test (SQLite-backed, no MySQL required)

```bash
cd backend
npm install
npm test
```

This boots the real Express app against an in-memory SQLite database and
exercises every endpoint below — success, validation-failure, and
permission-failure cases — end to end.

## What's implemented

**Original foundation (already built per the master prompt, unchanged):**
FR-01 Auth · FR-02 User/Staff registration · FR-03 Client Registration,
Profile & KYC · FR-04 Borrower Group Management · FR-05 Loan Product
Configuration · FR-06 Loan Application Management · FR-07 Loan Approval
Workflow · FR-14 Branch Management · Public home page.

**Newly built in this delivery:**

| FR | Feature | Key new endpoints |
|---|---|---|
| FR-08 | Guarantor & Collateral Management | `POST/GET /api/loan-applications/:id/guarantors`, `POST/GET /api/loan-applications/:id/collateral` |
| FR-09 | Loan Disbursement Management | `POST /api/loan-applications/:id/disburse` |
| FR-10 | Repayment & Installment Scheduling | `GET /api/loans`, `GET /api/loans/:id`, `POST /api/loans/:id/repayments` |
| FR-11 | Overdue / Default Detection & Alerts | `POST /api/admin/run-overdue-check` |
| FR-12 | Savings Account Management | `POST /api/members/:id/savings-account`, `POST /api/savings-accounts/:id/deposit`, `POST /api/savings-accounts/:id/withdraw` |
| FR-13 | Financial Transaction & Expense Management | `GET/POST/PATCH/DELETE /api/expenses` |
| FR-15 | Field Officer Management | Read-only UI + existing `PATCH /api/groups/:id` for reassignment |
| FR-16 | Meeting & Collection Scheduling | `POST /api/groups/:id/meetings`, `GET /api/meetings`, `PATCH /api/meetings/:id` |
| FR-17 | Notification & Reminder System (in-app only) | `GET /api/notifications`, `PATCH /api/notifications/:id/read` |
| FR-18 | Donor & Funding Source Management | `GET/POST/PATCH/DELETE /api/donors`, `POST /api/donors/:id/contributions` |
| FR-19 | Reports & Analytics Dashboard | `GET /api/reports/summary` |
| FR-20 | Document Management (extended) | `docType` ENUM extended; auto-generated `loan_agreement` Document on disbursement |
| FR-21 | Audit Log & Activity Tracking | `GET /api/audit-logs`, automatic middleware on every mutating `/api` request |
| FR-22 | Borrower Portal (self-service) | `POST /api/portal/auth/register`, `POST /api/portal/auth/login`, `GET /api/portal/auth/me`, `GET/POST /api/portal/loan-applications`, `GET /api/portal/loans`, `GET/POST /api/portal/savings-account` |
| FR-23 | Payment Gateway (Stripe) | `GET /api/portal/payments/config`, `POST /api/portal/payments/initiate`, `POST /api/portal/payments/:tranId/confirm`, `POST /api/payments/webhook`, `GET /api/payments` (staff) |
| FR-24 | AI Assistant | `POST /api/assistant/chat`, `GET /api/assistant/status` |

All 21 functional requirements from the original SRS are implemented, plus
three additive features built on request: a customer-facing Borrower Portal
(FR-22), a Stripe payment integration for self-service repayments and
deposits (FR-23), and an AI assistant (FR-24).

## New/modified files in this delivery

**New backend models:** `Guarantor.js`, `Collateral.js`, `Loan.js`,
`RepaymentSchedule.js`, `Transaction.js`, `Notification.js`,
`SavingsAccount.js`, `Expense.js`, `Meeting.js`, `Donor.js`,
`Contribution.js`, `AuditLog.js`

**New backend controllers:** `guarantorController.js`,
`collateralController.js`, `loanController.js`, `adminController.js`,
`savingsController.js`, `expenseController.js`, `meetingController.js`,
`notificationController.js`, `donorController.js`, `reportController.js`,
`auditLogController.js`

**New backend routes:** `loanRoutes.js`, `savingsRoutes.js`,
`expenseRoutes.js`, `meetingRoutes.js`, `notificationRoutes.js`,
`donorRoutes.js`, `reportRoutes.js`, `auditLogRoutes.js`, `adminRoutes.js`

**New backend middleware:** `auditLog.js`

**Modified backend files:** `models/index.js` (new associations),
`memberController.js` / `memberRoutes.js` (savings-account opening endpoint
added), `groupController.js` / `groupRoutes.js` (meeting-scheduling route
added), `loanApplicationController.js` / `loanApplicationRoutes.js`
(guarantor/collateral/disburse routes added), `Document.js` (docType ENUM
extended), `server.js` (all new routes mounted + audit middleware wired)

**New frontend pages:** `Loans.jsx`, `Savings.jsx`, `Expenses.jsx`,
`FieldOfficers.jsx`, `Meetings.jsx`, `Notifications.jsx`, `Donors.jsx`,
`Reports.jsx`, `AuditLogs.jsx`

**Modified frontend files:** `App.jsx` (new routes), `AppLayout.jsx` (new
nav links), `Dashboard.jsx` (real metrics from `/api/reports/summary` +
quick-links to every new page), `api/resources.js` (new `*API` objects),
`Members.jsx` (KYC + document upload + "open savings account" action),
`Groups.jsx` (officer reassignment + meeting scheduling from the group
card), `LoanApplications.jsx` (guarantors/collateral/disburse UI on the
expandable card)

**New backend test:** `test/smoke.test.js`

## Borrower Portal, Payments & AI Assistant (FR-22 / FR-23 / FR-24)

Everything above this section is staff-facing. This section is the
customer-facing addition: real borrowers now have their own login,
separate from staff, where they can apply for a loan, track it, and pay.

### Why a separate auth system

Members were originally data records only (created and managed by staff),
not login accounts. Rather than bolting portal access onto the existing
staff `User`/JWT system, this adds a fully independent one:

- `Member.passwordHash` (nullable) - a member has no portal access until
  they activate it.
- **Activation, not open registration.** `POST /api/portal/auth/register`
  requires an *existing* Member record (created by staff first) and
  verifies the caller knows both the `nationalId` and the `phone` number
  already on file before letting them set a password. This stands in for
  an OTP/SMS verification step without requiring a second third-party
  integration - flagged here as a deliberate scope trade-off, not an
  oversight.
- **Separate JWTs, tagged by `type`.** Staff tokens carry `type: "staff"`,
  member tokens carry `type: "member"`. `requireAuth` and the new
  `requireMemberAuth` middleware both check this field and reject a token
  of the wrong type outright. This matters because `Member` and `User` are
  different tables with independent auto-increment ids - without the type
  check, a member's token could theoretically be replayed against a
  staff-only endpoint (or vice versa) whenever the two ids happened to
  collide.
- **Every portal query is scoped server-side** to `req.member.id` (never
  to an id supplied by the client) - a borrower can only ever see or act
  on their own applications, loans, and savings account.

### Payment gateway: Stripe, behind a provider abstraction

The gateway was originally SSLCommerz; it is now **Stripe**. More
importantly, the controller no longer knows or cares which gateway it is
talking to.

`src/utils/gateways/` is a small registry. Each provider is one adapter file
implementing a fixed interface:

```
isConfigured()                        -> boolean
createIntent({ payment, member, ... }) -> { providerRef, clientSecret, publishableKey }
retrieveIntent(providerRef)            -> { raw, succeeded, status, tranId }
constructWebhookEvent(rawBody, sig)    -> verified event
currency() / toMinorUnits(amount)
```

`paymentController` asks the registry for the active gateway and calls that
interface. **No provider name, key, URL, or currency is hardcoded anywhere
in a controller, route, or React component.** Switching gateways is one
line in `.env`:

```
PAYMENT_PROVIDER=stripe   # or mock
```

Adding a third provider means writing one adapter and adding one line to
`PROVIDERS` — no controller or frontend change. The smoke test asserts every
registered adapter implements the full interface.

**The publishable key is not in the frontend bundle.** It is returned by the
backend alongside the PaymentIntent, so rotating Stripe keys is a backend
`.env` edit with no frontend rebuild.

#### How a payment is confirmed

Three independent things have to agree before a Taka moves on the ledger:

1. **`initiate()`** creates a `Payment` row and a Stripe PaymentIntent. The
   local `tranId` is written into Stripe's `metadata`, so a webhook arriving
   minutes later can be matched back without trusting client input.
2. **Stripe Elements** collects the card in an iframe served by Stripe. Card
   numbers never reach MFNet's servers.
3. **`confirm()`** runs when Elements reports success — and *ignores* that
   claim. It re-reads the PaymentIntent from Stripe's API and credits the
   ledger only if Stripe itself says `succeeded`. A tampered client cannot
   talk its way into a paid installment.

`POST /api/payments/webhook` handles the same events server-to-server and is
the authoritative path in production. It is mounted with `express.raw()`
*before* `express.json()`, because signature verification hashes the exact
bytes Stripe sent — once `express.json()` reparses the body, the signature
can no longer be verified.

`confirm()` and the webhook can both fire for one payment. Both funnel into
`applyPaymentEffect()`, which is idempotent, so a race cannot double-credit
an account.

#### Currency

MFNet's ledger is BDT throughout. Stripe test accounts do not reliably have
BDT enabled as a charge currency, so `PAYMENT_CURRENCY` defaults to `usd`
while the ledger keeps recording BDT. Set `PAYMENT_CURRENCY=bdt` if your
Stripe account supports it. Zero-decimal currencies are handled correctly.

#### Mock mode

Set `PAYMENT_PROVIDER=mock`, or simply leave `STRIPE_SECRET_KEY` blank, and
the app falls back to its own simulator page. A missing key degrades to a
working demo rather than a crash. The mock path runs the exact same
`applyPaymentEffect()` ledger code, so the whole apply → pay → confirm loop
is demoable with no Stripe account and no internet.

### AI assistant

A floating assistant on the landing page, the Borrower Portal, and the staff
console.

- **The key never reaches the browser.** The widget POSTs to
  `/api/assistant/chat`; the server adds the system prompt and calls the
  provider.
- **Provider-agnostic, like the gateway.** `AI_PROVIDER=gemini` uses Google's
  *native* `generateContent` endpoint. This is deliberate: Google has begun
  issuing keys with an `AQ.` prefix alongside the older `AIza` format, and
  while the native endpoint accepts both, OpenAI-compatible shim routes
  reject the new format with a 401. `AI_PROVIDER=openai` targets any
  OpenAI-compatible `/chat/completions` endpoint instead.
- **Scoped context.** If a borrower is logged in, the server attaches a
  compact summary of *that borrower's own* loans, applications, and savings
  balance — so "what do I owe?" gets a real answer. Only their own records,
  and only a few fields: no national ID, no password hash, no other member.
- **It degrades instead of dying.** No key, an invalid key, an exhausted
  quota, a timeout, or a network failure all fall through to
  `utils/aiFallback.js`, a keyword responder written specifically around
  MFNet's own domain. A dead credential during a demo means a slightly less
  fluent assistant, not a broken chat window.
- **Rate limited** per user, in memory, so one visitor cannot burn the quota.

### Design system

The palette moved from green to **royal blue deepening into near-black**,
with the existing gold kept as the accent.

- `--royal-gradient: linear-gradient(135deg, #1e3a8a, #101c4d, #05081a)`
- Gold `#d4a94a` accent retained from the original brand
- **One plain font (Inter) at every size.** No decorative display face:
  this is a form-filling app used by people who may be on a cheap phone,
  and a fancy serif helps none of them. Numbers use the machine's own
  monospace stack so figures line up, with no second font to download.
- The old single "ledger line" motif on dark panels became a finer engraved
  pattern, built from layered repeating gradients. It is the one flourish;
  every other surface stays plain.

**Two-door landing page.** The product has two genuinely different
audiences, so the landing page gives each its own card stating who it is for
and what you can do inside, rather than a single ambiguous login. A thin
band under the top bar names which console you are in, so the Borrower
Portal and the Staff Console are never confused at a glance.

### Plain English, and one assumption removed

All user-facing text was rewritten in simple English: short sentences,
everyday words, and banking terms explained where they appear. Many people
using the Borrower Portal do not read English as a first language, and some
are on a small phone. The AI assistant's system prompt now instructs it to
answer the same way, and the built-in fallback answers were rewritten to
match.

The copy also **claimed MFNet was founded as a women's lending circle by
former schoolteachers and a microfinance economist**. Nothing in the
codebase supported that — it was invented detail that had been sitting in
the landing page and login screen, and it narrowed who the NGO appears to
serve. It has been replaced with neutral text: MFNet lends to families,
farmers, shop owners, and small traders, and anyone who qualifies can
apply. A test fixture group named "Women's Circle A" was renamed too.

### Bugs found and fixed in this round

**1. The logout button was invisible.** `.btn-ghost` sets dark ink on a
transparent background; on the dark top bar that rendered at a measured
**1.00:1 contrast ratio** — literally the same colour as its background.
This is the same failure mode as the `brand-mark-light` bug fixed last
round, so it is now fixed in two ways: an explicit `.btn-ghost-light`
modifier, *and* a contextual rule that lightens any ghost button inside a
dark panel even if the modifier is forgotten. Measured after the fix:
**10.36:1 to 19.88:1** depending on the gradient stop. All AA.

**2. The Borrower Portal was leaking bcrypt password hashes.** This was a
real security bug, shipped in the previous round.

`portalController` reused `includeAll` from `loanApplicationController`,
which eagerly joins the full `Member` record. When `passwordHash` was added
to `Member` for portal auth, it silently rode along into every portal
loan-application response. The comment on the column claimed it was "never
returned by any endpoint" — that claim was false.

The previous round's own smoke test caught this (`member submits their own
loan application` was failing), but that round had no network access and
could not run `npm install && npm test`, so it went unseen.

Fixed in depth, not just at the call site:

- A `defaultScope` on the `Member` model excludes `passwordHash`, so it is
  hidden **structurally** rather than by every future query remembering to
  exclude it.
- The two queries that legitimately need the hash (portal activation and
  login) use `Member.unscoped()`.
- Explicit exclusions added to the five other controllers that join
  `Member`.
- Five new regression assertions deep-scan API responses for a
  `passwordHash` key anywhere in the payload.

### New/changed files for this round

**New backend:** `utils/gateways/index.js` (provider registry),
`utils/gateways/stripeGateway.js`, `utils/gateways/mockGateway.js`,
`utils/aiProvider.js`, `utils/aiFallback.js`,
`controllers/chatbotController.js`, `routes/chatbotRoutes.js`,
`scripts/verify-integrations.js`

**Removed backend:** `utils/sslcommerz.js`

**Modified backend:** `controllers/paymentController.js` (rewritten,
provider-agnostic), `models/Payment.js` (`provider`/`providerRef` replace
`valId`), `models/Member.js` (defaultScope), `controllers/portalController.js`,
`controllers/loanApplicationController.js`, `controllers/loanController.js`,
`controllers/groupController.js`, `controllers/savingsController.js`,
`controllers/adminController.js`, `controllers/portalAuthController.js`,
`routes/paymentRoutes.js`, `routes/portalRoutes.js`, `server.js` (raw-body
webhook mount + assistant routes), `test/smoke.test.js`, `.env.example`

**New frontend:** `components/Assistant.jsx`, `components/StripePayment.jsx`

**Modified frontend:** `index.css` (rewritten), `index.html` (fonts,
favicon, meta), `components/AppLayout.jsx`, `components/PortalLayout.jsx`,
`components/AuthLayout.jsx`, `components/PublicNav.jsx`, `pages/Home.jsx`,
`pages/Payments.jsx`, `pages/portal/PortalLoans.jsx`,
`pages/portal/PortalSavings.jsx`, `pages/portal/PortalPaymentResult.jsx`,
`pages/portal/PortalMockPayment.jsx`, `api/portalResources.js`,
`api/resources.js`

### Trying it locally

```bash
cd backend
npm install
cp .env.example .env     # then paste your keys in
npm test                 # 95 assertions, SQLite, no MySQL or Stripe needed
npm run verify           # one real call to Stripe + your AI provider
npm start

cd ../frontend
npm install
cp .env.example .env
npm run dev
```

`npm run verify` is the pre-flight check. It creates a test-mode
PaymentIntent, asserts the amount converted to minor units correctly and
that `tranId` survived the metadata round-trip, then cancels the intent so
nothing is left in your dashboard. It also sends one short prompt to the AI
provider. Run it before a demo.

To exercise a card payment: register a member as staff, activate portal
access at `/portal/register`, apply for a loan, approve and disburse it as
staff, then pay an installment from `/portal/loans` with Stripe's test card
`4242 4242 4242 4242`, any future expiry, any CVC.

For webhooks locally:

```bash
stripe listen --forward-to localhost:5000/api/payments/webhook
```

Paste the printed `whsec_...` into `STRIPE_WEBHOOK_SECRET`. Without it the
flow still completes — `confirm()` re-verifies with Stripe server-side.

## Honest notes on deviations and shortcuts

- **`config/db.js`** adds an opt-in `DB_DIALECT=sqlite` branch used only by
  the smoke test. The default is still MySQL — additive, not a change to
  production config.
- **`Guarantor`/`Collateral` primary keys** are `guarantorId`/`collateralId`,
  as originally specified — a deliberate exception to the `id` convention.
- **FR-20 document generation** uses a placeholder `.txt` file for the loan
  agreement rather than a rendered PDF.
- **Portal activation stands in for OTP verification** with a
  nationalId + phone-on-file check rather than a real SMS one-time code.
- **`PAYMENT_CURRENCY` defaults to `usd`,** not BDT, for the Stripe-account
  reason described above. The ledger is unaffected and still records BDT.
- **What was and was not verified in this delivery.** `npm install` and
  `npm test` were run for real: **95 assertions pass, 0 fail**, against
  SQLite, exercising the mock gateway and the assistant fallback. The
  frontend `npm run build` succeeds. CSS was audited programmatically —
  every class referenced in JSX exists, and contrast ratios were computed
  rather than eyeballed.

  **Not verified:** live calls to `api.stripe.com` and
  `generativelanguage.googleapis.com`. Both hosts were blocked by the
  assembly environment's egress proxy (`host_not_allowed`), so while the
  Stripe adapter was confirmed to select correctly, load the key from
  `.env`, and issue the HTTPS request, the round-trip could not complete
  here. The same applies to the Gemini key — its format was checked and the
  correct endpoint chosen for it, but it was never exchanged for a real
  completion. `npm run verify` exists precisely to close that gap on your
  machine, and is the **first thing to run** after unzipping. Note also that
  no browser was available, so the redesign was verified by computation and
  a clean production build, not by looking at rendered pages.

## Known gaps (carried over / documented, not silently fixed)

- Registration is still open to any role (`POST /api/auth/register` accepts
  a `role`) — a known gap noted in the original spec, not fixed here since
  it wasn't asked for.
- FR-11's overdue check is on-demand (`POST /api/admin/run-overdue-check`),
  not a real cron job — explicitly acceptable stretch scope per the spec.
- FR-17 notifications are in-app only; no real SMS/email provider is wired
  up — explicitly acceptable per the spec for a course project.
- Borrower Portal activation uses nationalId + phone-on-file instead of a
  real SMS OTP.
- The AI assistant answers questions and explains the system; it cannot take
  actions (approve, disburse, pay) by design.
=======
# MFNet Foundation — Feature Assignment

## Maitry Biswas — 22299430
### Domain: Identity, People, Organisation & Field Operations

You own everything about *who* is in the system and *how the NGO is
structured*: staff authentication, member records and KYC, borrower groups,
branches, field officers, meeting schedules, notifications, document storage,
and the audit log that records every mutation the other two features make.

**8 assignable features + the shared auth foundation · difficulty weight 28 / 84 (33%)**

| FR | Feature | Difficulty (1–6) |
|---|---|---|
| FR-01 | Authentication (shared foundation) | 4 |
| FR-02 | User / Staff Registration (shared foundation) | 2 |
| FR-03 | Client Registration, Profile & KYC | 4 |
| FR-04 | Borrower Group Management | 4 |
| FR-14 | Branch Management | 2 |
| FR-15 | Field Officer Management | 2 |
| FR-16 | Meeting & Collection Scheduling | 3 |
| FR-17 | Notification & Reminder System | 2 |
| FR-20 | Document Management | 2 |
| FR-21 | Audit Log & Activity Tracking | 3 |
| | **Total** | **28** |

Team split for reference: Tahian 27 · Maitry 28 · Deesha 29.

> **Note on FR-01/FR-02.** These are access-control plumbing that every other
> feature depends on, not standalone functional features — which is why the
> feature count is 21 rather than 24. They are counted here in the difficulty
> weighting because somebody has to own, explain and defend them, and that is
> you.

---

## FR-01 — Authentication (staff)

**What it does.** Staff log in with email and password, get a JWT, and every
protected endpoint verifies it. Roles (`admin`, `branch_manager`,
`loan_officer`) gate what each token can do.

**Backend files**
- `backend/src/models/User.js`
- `backend/src/controllers/authController.js`
- `backend/src/routes/authRoutes.js`
- `backend/src/utils/token.js`
- `backend/src/middleware/auth.js` — `requireAuth`, `requireRole`, `requireMemberAuth`

**Frontend files**
- `frontend/src/pages/Login.jsx`
- `frontend/src/context/AuthContext.jsx`
- `frontend/src/components/ProtectedRoute.jsx`
- `frontend/src/components/AuthLayout.jsx`

**Endpoints**
```
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

**Talking points for the viva**
- Passwords are stored as bcrypt hashes; the plaintext never leaves the
  request handler.
- **Tokens are tagged by type.** Staff tokens carry `type: "staff"`, borrower
  tokens carry `type: "member"`, and both middlewares reject a token of the
  wrong type outright. This matters because `User` and `Member` are separate
  tables with independent auto-increment ids — without the type check, a
  borrower token could be replayed against a staff endpoint whenever the two
  ids happened to collide. This is the single sharpest security point in the
  project; know it cold.
- `requireRole` is composable middleware, so authorisation is declared on the
  route rather than buried in a controller `if`.

## FR-02 — User / Staff Registration

**Backend:** `authController.register`, `backend/src/controllers/userController.js`,
`backend/src/routes/userRoutes.js`
**Frontend:** `frontend/src/pages/Register.jsx`

Staff accounts are created with a role and a branch. `GET /api/users` backs
the officer dropdowns used by FR-04 and FR-15.

---

## FR-03 — Client Registration, Profile & KYC

**What it does.** The member record: personal details, national ID, phone,
address, branch, plus a KYC verification state and supporting document
uploads. Every loan in the system hangs off one of these records.

**Backend files**
- `backend/src/models/Member.js`
- `backend/src/controllers/memberController.js`
- `backend/src/routes/memberRoutes.js`
- `backend/src/middleware/upload.js` (multer, 5 MB, `.pdf/.png/.jpg/.jpeg`)

**Frontend files**
- `frontend/src/pages/Members.jsx` (231 lines)

**Endpoints**
```
GET   /api/members
GET   /api/members/:id
POST  /api/members
PATCH /api/members/:id
PATCH /api/members/:id/kyc
POST  /api/members/:id/documents      (multipart)
```

**UI route:** `/members`

**Talking points for the viva**
- **`Member` has a `defaultScope` that excludes `passwordHash`.** This is the
  fix for a real security bug that shipped in an earlier round: the borrower
  portal was returning bcrypt hashes in loan-application responses because a
  controller eagerly joined the full Member record. The fix is *structural* —
  the column is hidden by the model, so a future query cannot forget to
  exclude it — rather than a per-query patch. Only the two portal auth queries
  use `Member.unscoped()`. Five regression assertions in the smoke test now
  deep-scan every API response for a `passwordHash` key.
- KYC is a separate endpoint from the general profile update because
  verification is a supervised action, not a field edit.
- Uploads are constrained by MIME type *and* size in middleware, before the
  controller sees the request.

---

## FR-04 — Borrower Group Management

**What it does.** Members are organised into borrower groups, each with an
assigned loan officer. Groups can take group loans and hold scheduled
collection meetings.

**Backend files**
- `backend/src/models/Group.js`
- `backend/src/controllers/groupController.js`
- `backend/src/routes/groupRoutes.js`

**Frontend files**
- `frontend/src/pages/Groups.jsx` (265 lines — includes officer reassignment
  and meeting scheduling from the group card)

**Endpoints**
```
GET    /api/groups
POST   /api/groups
PATCH  /api/groups/:id
POST   /api/groups/:id/members
DELETE /api/groups/:id/members/:memberId
```

**UI route:** `/groups`

**Talking points for the viva**
- Membership is managed through dedicated add/remove endpoints rather than by
  PATCHing an array, so each change is individually auditable.
- A member cannot be added to a group in a different branch — checked
  server-side.

---

## FR-14 — Branch Management

**Backend:** `models/Branch.js`, `controllers/branchController.js`, `routes/branchRoutes.js`
**Frontend:** `frontend/src/pages/Branches.jsx` · **route** `/branches`

```
GET    /api/branches
POST   /api/branches      (admin only)
PATCH  /api/branches/:id  (admin only)
DELETE /api/branches/:id  (admin only)
```

The organisational root — users, members and expenses all carry a `branchId`,
which is what makes per-branch reporting possible in FR-19.

---

## FR-15 — Field Officer Management

**Frontend:** `frontend/src/pages/FieldOfficers.jsx` · **route** `/field-officers`
**Backend:** reuses `GET /api/users` and `PATCH /api/groups/:id`

A read-and-reassign view: each loan officer with their groups, member count
and portfolio, plus the ability to reassign a group to another officer.

**Talking point:** this feature deliberately introduced **no new table**.
Officers are already `User` rows and assignment is already a `Group` column —
adding a third entity would have duplicated state. Say this explicitly if
asked why FR-15 has no model of its own; "we reused existing entities" is the
answer, not "we skipped it".

---

## FR-16 — Meeting & Collection Scheduling

**Backend:** `models/Meeting.js`, `controllers/meetingController.js`, `routes/meetingRoutes.js`
**Frontend:** `frontend/src/pages/Meetings.jsx` · **route** `/meetings`

```
POST  /api/groups/:id/meetings     (create — mounted on the group route)
GET   /api/meetings
PATCH /api/meetings/:id            (attendance / collected amount / status)
```

Creation is nested under the group because a meeting belongs to a group;
listing and updating are flat because staff work from a calendar view across
all groups. Worth explaining — it looks inconsistent until you say why.

---

## FR-17 — Notification & Reminder System

**Backend:** `models/Notification.js`, `controllers/notificationController.js`, `routes/notificationRoutes.js`
**Frontend:** `frontend/src/pages/Notifications.jsx` · **route** `/notifications`

```
GET   /api/notifications
PATCH /api/notifications/:id/read
```

**Talking point:** in-app only, by design. Notifications are *written* by
other features — Tahian's overdue sweep (FR-11) is the main producer, and
approval and disbursement also raise them. SMS/email delivery would need a
third-party integration; the scope boundary is documented, not accidental.
Every row is scoped to a recipient user, so an officer sees only their own.

---

## FR-20 — Document Management

**Backend:** `models/Document.js`, plus `middleware/upload.js` (shared with FR-03)

Files are stored on disk under `backend/uploads/` and served from
`/uploads`; the database holds the metadata and the path.

**Talking points**
- The `docType` ENUM covers KYC documents, loan agreements and general
  attachments. `loan_agreement` exists because Tahian's disbursement (FR-09)
  auto-generates one — that is the cross-feature dependency to mention.
- Filenames are generated server-side (`type-id-timestamp`), never taken from
  the upload, so a hostile filename cannot escape the uploads directory.

---

## FR-21 — Audit Log & Activity Tracking

**What it does.** Every successful mutating request against `/api` — POST,
PATCH, DELETE — is recorded automatically: who, what action, which entity,
when.

**Backend files**
- `backend/src/models/AuditLog.js`
- `backend/src/middleware/auditLog.js`
- `backend/src/controllers/auditLogController.js`
- `backend/src/routes/auditLogRoutes.js`
- the audit block in `backend/src/server.js`

**Frontend files**
- `frontend/src/pages/AuditLogs.jsx` · **route** `/audit-logs`

**Endpoints**
```
GET /api/audit-logs
```

**Talking points for the viva**
- **This is middleware, not twenty controller calls.** It is mounted once at
  the `/api` prefix and inspects the method, so a feature added next semester
  is audited automatically without its author writing a single line. That is
  the design argument to make.
- It logs *after* the response succeeds, so failed and rejected requests do
  not pollute the trail.
- The log is append-only and read-only over the API — there is no endpoint to
  edit or delete an entry, which is the whole point of an audit log.

---

## Files that are yours alone

```
backend/src/models/User.js
backend/src/models/Member.js
backend/src/models/Group.js
backend/src/models/Branch.js
backend/src/models/Meeting.js
backend/src/models/Notification.js
backend/src/models/Document.js
backend/src/models/AuditLog.js
backend/src/controllers/authController.js
backend/src/controllers/userController.js
backend/src/controllers/memberController.js
backend/src/controllers/groupController.js
backend/src/controllers/branchController.js
backend/src/controllers/meetingController.js
backend/src/controllers/notificationController.js
backend/src/controllers/auditLogController.js
backend/src/routes/authRoutes.js
backend/src/routes/userRoutes.js
backend/src/routes/memberRoutes.js
backend/src/routes/groupRoutes.js
backend/src/routes/branchRoutes.js
backend/src/routes/meetingRoutes.js
backend/src/routes/notificationRoutes.js
backend/src/routes/auditLogRoutes.js
backend/src/middleware/auth.js
backend/src/middleware/upload.js
backend/src/middleware/auditLog.js
backend/src/utils/token.js
frontend/src/pages/Login.jsx
frontend/src/pages/Register.jsx
frontend/src/pages/Members.jsx
frontend/src/pages/Groups.jsx
frontend/src/pages/Branches.jsx
frontend/src/pages/FieldOfficers.jsx
frontend/src/pages/Meetings.jsx
frontend/src/pages/Notifications.jsx
frontend/src/pages/AuditLogs.jsx
frontend/src/context/AuthContext.jsx
frontend/src/components/ProtectedRoute.jsx
frontend/src/components/AuthLayout.jsx
```

## Shared files — announce before you edit

| File | Your part |
|---|---|
| `backend/src/server.js` | auth/branch/member/group/user/meeting/notification/auditLog mounts **and the audit middleware block** |
| `backend/src/models/index.js` | associations for User, Member, Group, Branch, Meeting, Notification, Document, AuditLog |
| `frontend/src/App.jsx` | `/login`, `/register`, `/members`, `/groups`, `/branches`, `/field-officers`, `/meetings`, `/notifications`, `/audit-logs` |
| `frontend/src/components/AppLayout.jsx` | nav links for the above |
| `frontend/src/api/resources.js` | `authAPI`, `memberAPI`, `groupAPI`, `branchAPI`, `userAPI`, `meetingAPI`, `notificationAPI`, `auditLogAPI` |
| `backend/test/smoke.test.js` | your feature's assertions |

**Two lines in your files belong to other people's features — do not delete them:**
- `memberRoutes.js` → `POST /:id/savings-account` calls `savingsController.open` (Deesha, FR-12)
- `groupRoutes.js` → `POST /:id/meetings` is yours (FR-16), but it sits in a
  route file the group feature owns; keep the `// FR-16` comment so it is obvious

---

## Suggested commit sequence

You own the foundation, so **commit first** — Tahian's and Deesha's features
import your models and middleware. Run `cd backend && npm test` before each push.

```bash
git checkout -b feature/identity-and-operations

# 1 — foundation, must land first
git add backend/src/models/User.js backend/src/controllers/authController.js \
        backend/src/routes/authRoutes.js backend/src/utils/token.js \
        backend/src/middleware/auth.js frontend/src/pages/Login.jsx \
        frontend/src/context/AuthContext.jsx \
        frontend/src/components/ProtectedRoute.jsx \
        frontend/src/components/AuthLayout.jsx
git commit -m "FR-01: JWT authentication with type-tagged staff tokens and role middleware"

# 2
git add backend/src/controllers/userController.js backend/src/routes/userRoutes.js \
        frontend/src/pages/Register.jsx
git commit -m "FR-02: staff registration with role and branch assignment"

# 3
git add backend/src/models/Branch.js backend/src/controllers/branchController.js \
        backend/src/routes/branchRoutes.js frontend/src/pages/Branches.jsx
git commit -m "FR-14: branch management with admin-only mutation"

# 4
git add backend/src/models/Member.js backend/src/controllers/memberController.js \
        backend/src/routes/memberRoutes.js backend/src/middleware/upload.js \
        frontend/src/pages/Members.jsx
git commit -m "FR-03: member records, KYC verification and document upload; passwordHash excluded via defaultScope"

# 5
git add backend/src/models/Document.js
git commit -m "FR-20: document metadata model with server-generated filenames"

# 6
git add backend/src/models/Group.js backend/src/controllers/groupController.js \
        backend/src/routes/groupRoutes.js frontend/src/pages/Groups.jsx
git commit -m "FR-04: borrower groups with per-member add/remove endpoints"

# 7
git add frontend/src/pages/FieldOfficers.jsx
git commit -m "FR-15: field officer portfolio view and group reassignment (no new entity)"

# 8
git add backend/src/models/Meeting.js backend/src/controllers/meetingController.js \
        backend/src/routes/meetingRoutes.js frontend/src/pages/Meetings.jsx
git commit -m "FR-16: group meeting scheduling with attendance and collection tracking"

# 9
git add backend/src/models/Notification.js \
        backend/src/controllers/notificationController.js \
        backend/src/routes/notificationRoutes.js frontend/src/pages/Notifications.jsx
git commit -m "FR-17: per-recipient in-app notifications with read state"

# 10
git add backend/src/models/AuditLog.js backend/src/middleware/auditLog.js \
        backend/src/controllers/auditLogController.js \
        backend/src/routes/auditLogRoutes.js frontend/src/pages/AuditLogs.jsx
git commit -m "FR-21: append-only audit log via middleware on every mutating /api request"

# shared files last
git add backend/src/server.js backend/src/models/index.js \
        frontend/src/App.jsx frontend/src/components/AppLayout.jsx \
        frontend/src/api/resources.js backend/test/smoke.test.js
git commit -m "Wire identity and operations routes, associations and tests (FR-01..FR-21)"

git push -u origin feature/identity-and-operations
```

---

## Demo path you should be able to run cold

1. Register a staff account → log in → show the JWT gating `/dashboard`.
2. `/branches` → create a branch.
3. `/members` → create a member, upload a KYC document, mark KYC verified.
4. `/groups` → create a group, assign an officer, add the member.
5. `/field-officers` → show the officer's portfolio, reassign the group.
6. `/meetings` → schedule a collection meeting from the group card, then
   record attendance.
7. `/notifications` → show a notification raised by another feature.
8. `/audit-logs` → show every action from steps 2–6 already recorded, with no
   feature having called the logger explicitly. This is your strongest demo
   moment — save it for last.
>>>>>>> eafd4abfcbb3531099a1ec218aabafd3cef4aa1c
