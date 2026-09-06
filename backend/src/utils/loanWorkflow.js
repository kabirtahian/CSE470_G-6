// Loan approval routing by requestedAmount (BDT, placeholder thresholds -
// confirm with the team before changing; see MASTER_PROMPT section 9).
const THRESHOLDS = {
  LOW: 50000,
  MID: 200000,
};

const STAGE_LABELS = {
  loan_officer: "Loan Officer",
  branch_manager: "Branch Manager",
  admin: "Admin",
};

function getRequiredStages(requestedAmount) {
  const amount = Number(requestedAmount);
  if (amount <= THRESHOLDS.LOW) return ["loan_officer"];
  if (amount <= THRESHOLDS.MID) return ["loan_officer", "branch_manager"];
  return ["loan_officer", "branch_manager", "admin"];
}

module.exports = { getRequiredStages, STAGE_LABELS, THRESHOLDS };
