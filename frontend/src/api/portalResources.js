import portalClient from "./portalClient";

export const portalAuthAPI = {
  register: (data) => portalClient.post("/portal/auth/register", data).then((r) => r.data),
  login: (data) => portalClient.post("/portal/auth/login", data).then((r) => r.data),
  me: () => portalClient.get("/portal/auth/me").then((r) => r.data.member),
};

export const portalAPI = {
  listLoanProducts: () => portalClient.get("/portal/loan-products").then((r) => r.data.products),

  listApplications: () => portalClient.get("/portal/loan-applications").then((r) => r.data.applications),
  getApplication: (id) => portalClient.get(`/portal/loan-applications/${id}`).then((r) => r.data.application),
  applyForLoan: (data) => portalClient.post("/portal/loan-applications", data).then((r) => r.data.application),

  listLoans: () => portalClient.get("/portal/loans").then((r) => r.data.loans),
  getLoan: (id) => portalClient.get(`/portal/loans/${id}`).then((r) => r.data.loan),

  getSavingsAccount: () => portalClient.get("/portal/savings-account").then((r) => r.data.savingsAccount),
  openSavingsAccount: () => portalClient.post("/portal/savings-account").then((r) => r.data.savingsAccount),
};

export const paymentAPI = {
  // Which gateway is live, and its publishable key. Read before rendering a
  // payment UI so the portal never hardcodes a provider.
  config: () => portalClient.get("/portal/payments/config").then((r) => r.data),
  initiate: (data) => portalClient.post("/portal/payments/initiate", data).then((r) => r.data),
  get: (tranId) => portalClient.get(`/portal/payments/${tranId}`).then((r) => r.data.payment),
  // Asks the backend to re-verify with the provider and credit the ledger.
  // Resolves for both 200 (settled) and 202 (accepted but not yet settled),
  // so the caller can tell the difference instead of treating 202 as failure.
  confirm: (tranId) =>
    portalClient
      .post(`/portal/payments/${tranId}/confirm`, {}, { validateStatus: (s) => s === 200 || s === 202 })
      .then((r) => r.data),
  mockComplete: (tranId, outcome) =>
    portalClient.post(`/portal/payments/${tranId}/mock-complete`, { outcome }).then((r) => r.data.payment),
};
