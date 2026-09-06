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
