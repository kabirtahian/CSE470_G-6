import client from "./client";

export const authAPI = {
  register: (data) => client.post("/auth/register", data).then((r) => r.data),
  login: (data) => client.post("/auth/login", data).then((r) => r.data),
  me: () => client.get("/auth/me").then((r) => r.data.user),
};

export const branchAPI = {
  list: () => client.get("/branches").then((r) => r.data.branches),
  create: (data) => client.post("/branches", data).then((r) => r.data.branch),
  update: (id, data) => client.patch(`/branches/${id}`, data).then((r) => r.data.branch),
  remove: (id) => client.delete(`/branches/${id}`).then((r) => r.data),
};

export const memberAPI = {
  list: (params) => client.get("/members", { params }).then((r) => r.data.members),
  get: (id) => client.get(`/members/${id}`).then((r) => r.data.member),
  create: (data) => client.post("/members", data).then((r) => r.data.member),
  update: (id, data) => client.patch(`/members/${id}`, data).then((r) => r.data.member),
  updateKyc: (id, status) => client.patch(`/members/${id}/kyc`, { status }).then((r) => r.data.member),
  uploadDocument: (id, formData) =>
    client
      .post(`/members/${id}/documents`, formData, { headers: { "Content-Type": "multipart/form-data" } })
      .then((r) => r.data.document),
  openSavingsAccount: (id) => client.post(`/members/${id}/savings-account`).then((r) => r.data.savingsAccount),
};

export const groupAPI = {
  list: () => client.get("/groups").then((r) => r.data.groups),
  create: (data) => client.post("/groups", data).then((r) => r.data.group),
  update: (id, data) => client.patch(`/groups/${id}`, data).then((r) => r.data.group),
  addMember: (id, memberId) => client.post(`/groups/${id}/members`, { memberId }).then((r) => r.data.member),
  removeMember: (id, memberId) => client.delete(`/groups/${id}/members/${memberId}`).then((r) => r.data.member),
  scheduleMeeting: (id, data) => client.post(`/groups/${id}/meetings`, data).then((r) => r.data.meeting),
};

export const userAPI = {
  list: (params) => client.get("/users", { params }).then((r) => r.data.users),
};

export const loanProductAPI = {
  list: () => client.get("/loan-products").then((r) => r.data.products),
  create: (data) => client.post("/loan-products", data).then((r) => r.data.product),
  update: (id, data) => client.patch(`/loan-products/${id}`, data).then((r) => r.data.product),
};

export const loanApplicationAPI = {
  list: (params) => client.get("/loan-applications", { params }).then((r) => r.data.applications),
  get: (id) => client.get(`/loan-applications/${id}`).then((r) => r.data.application),
  create: (data) => client.post("/loan-applications", data).then((r) => r.data.application),
  decide: (id, decision, comments) =>
    client.post(`/loan-applications/${id}/decision`, { decision, comments }).then((r) => r.data.application),
  addGuarantor: (id, data) => client.post(`/loan-applications/${id}/guarantors`, data).then((r) => r.data.guarantor),
  addCollateral: (id, data) => client.post(`/loan-applications/${id}/collateral`, data).then((r) => r.data.collateral),
  disburse: (id) => client.post(`/loan-applications/${id}/disburse`).then((r) => r.data.loan),
};

export const loanAPI = {
  list: () => client.get("/loans").then((r) => r.data.loans),
  get: (id) => client.get(`/loans/${id}`).then((r) => r.data.loan),
  recordRepayment: (id, amount) => client.post(`/loans/${id}/repayments`, { amount }).then((r) => r.data),
};

export const savingsAPI = {
  list: () => client.get("/savings-accounts").then((r) => r.data.savingsAccounts),
  deposit: (id, amount) => client.post(`/savings-accounts/${id}/deposit`, { amount }).then((r) => r.data),
  withdraw: (id, amount) => client.post(`/savings-accounts/${id}/withdraw`, { amount }).then((r) => r.data),
};

export const expenseAPI = {
  list: (params) => client.get("/expenses", { params }).then((r) => r.data.expenses),
  create: (data) => client.post("/expenses", data).then((r) => r.data.expense),
  update: (id, data) => client.patch(`/expenses/${id}`, data).then((r) => r.data.expense),
  remove: (id) => client.delete(`/expenses/${id}`).then((r) => r.data),
};

export const meetingAPI = {
  list: (params) => client.get("/meetings", { params }).then((r) => r.data.meetings),
  update: (id, data) => client.patch(`/meetings/${id}`, data).then((r) => r.data.meeting),
};

export const notificationAPI = {
  list: () => client.get("/notifications").then((r) => r.data.notifications),
  markRead: (id) => client.patch(`/notifications/${id}/read`).then((r) => r.data.notification),
};

export const donorAPI = {
  list: () => client.get("/donors").then((r) => r.data.donors),
  create: (data) => client.post("/donors", data).then((r) => r.data.donor),
  update: (id, data) => client.patch(`/donors/${id}`, data).then((r) => r.data.donor),
  remove: (id) => client.delete(`/donors/${id}`).then((r) => r.data),
  addContribution: (id, data) => client.post(`/donors/${id}/contributions`, data).then((r) => r.data.contribution),
};

export const reportAPI = {
  summary: () => client.get("/reports/summary").then((r) => r.data.summary),
};

export const auditLogAPI = {
  list: (params) => client.get("/audit-logs", { params }).then((r) => r.data),
};

export const adminAPI = {
  runOverdueCheck: () => client.post("/admin/run-overdue-check").then((r) => r.data),
};

// Staff-side read access to Borrower Portal gateway payments. Named
// "gatewayPaymentAPI" (not "paymentAPI") to avoid any confusion with the
// member-scoped paymentAPI in api/portalResources.js - they hit different
// endpoints under different auth systems and are never imported together.
export const gatewayPaymentAPI = {
  // Returns { payments, gateway } so the staff view can also show which
  // provider is currently handling payments.
  list: () => client.get("/payments").then((r) => r.data),
};
