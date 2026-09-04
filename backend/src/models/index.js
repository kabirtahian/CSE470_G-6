const sequelize = require("../config/db");

const User = require("./User");
const Branch = require("./Branch");
const Member = require("./Member");
const Group = require("./Group");
const Document = require("./Document");
const LoanProduct = require("./LoanProduct");
const LoanApplication = require("./LoanApplication");
const ApprovalStep = require("./ApprovalStep");
const Guarantor = require("./Guarantor");
const Collateral = require("./Collateral");
const Loan = require("./Loan");
const RepaymentSchedule = require("./RepaymentSchedule");
const Transaction = require("./Transaction");
const Notification = require("./Notification");
const SavingsAccount = require("./SavingsAccount");
const Expense = require("./Expense");
const Meeting = require("./Meeting");
const Donor = require("./Donor");
const Contribution = require("./Contribution");
const AuditLog = require("./AuditLog");
const Payment = require("./Payment");

// ---------------------------------------------------------------------
// Original associations (sections 1-9 of MASTER_PROMPT) - unchanged.
// ---------------------------------------------------------------------
Branch.hasMany(User, { foreignKey: "branchId", as: "staff" });
User.belongsTo(Branch, { foreignKey: "branchId", as: "branch" });

Branch.hasMany(Member, { foreignKey: "branchId", as: "members" });
Member.belongsTo(Branch, { foreignKey: "branchId", as: "branch" });

Branch.hasMany(Group, { foreignKey: "branchId", as: "groups" });
Group.belongsTo(Branch, { foreignKey: "branchId", as: "branch" });

Group.hasMany(Member, { foreignKey: "groupId", as: "members" });
Member.belongsTo(Group, { foreignKey: "groupId", as: "group" });

Group.belongsTo(User, { foreignKey: "loanOfficerId", as: "loanOfficer" });
User.hasMany(Group, { foreignKey: "loanOfficerId", as: "managedGroups" });

Member.hasMany(Document, { foreignKey: "memberId", as: "documents" });
Document.belongsTo(Member, { foreignKey: "memberId", as: "member" });

Member.hasMany(LoanApplication, { foreignKey: "memberId", as: "loanApplications" });
LoanApplication.belongsTo(Member, { foreignKey: "memberId", as: "member" });

LoanProduct.hasMany(LoanApplication, { foreignKey: "loanProductId", as: "applications" });
LoanApplication.belongsTo(LoanProduct, { foreignKey: "loanProductId", as: "loanProduct" });

LoanApplication.hasMany(ApprovalStep, { foreignKey: "loanApplicationId", as: "approvalSteps" });
ApprovalStep.belongsTo(LoanApplication, { foreignKey: "loanApplicationId", as: "loanApplication" });

User.hasMany(ApprovalStep, { foreignKey: "approverId", as: "approvalActions" });
ApprovalStep.belongsTo(User, { foreignKey: "approverId", as: "approver" });

// ---------------------------------------------------------------------
// New associations for FR-08 through FR-21 (section 10 of MASTER_PROMPT).
// ---------------------------------------------------------------------

// FR-08 Guarantor & Collateral Management
LoanApplication.hasMany(Guarantor, { foreignKey: "loanApplicationId", as: "guarantors" });
Guarantor.belongsTo(LoanApplication, { foreignKey: "loanApplicationId", as: "loanApplication" });

LoanApplication.hasMany(Collateral, { foreignKey: "loanApplicationId", as: "collaterals" });
Collateral.belongsTo(LoanApplication, { foreignKey: "loanApplicationId", as: "loanApplication" });

// FR-09 Loan Disbursement Management
LoanApplication.hasOne(Loan, { foreignKey: "loanApplicationId", as: "loan" });
Loan.belongsTo(LoanApplication, { foreignKey: "loanApplicationId", as: "loanApplication" });

// FR-10 Repayment & Installment Scheduling + Transaction family
Loan.hasMany(RepaymentSchedule, { foreignKey: "loanId", as: "repaymentSchedules" });
RepaymentSchedule.belongsTo(Loan, { foreignKey: "loanId", as: "loan" });

Loan.hasMany(Transaction, { foreignKey: "loanId", as: "transactions" });
Transaction.belongsTo(Loan, { foreignKey: "loanId", as: "loan" });

// FR-12 Savings Account Management
Member.hasOne(SavingsAccount, { foreignKey: "memberId", as: "savingsAccount" });
SavingsAccount.belongsTo(Member, { foreignKey: "memberId", as: "member" });

SavingsAccount.hasMany(Transaction, { foreignKey: "savingsAccountId", as: "transactions" });
Transaction.belongsTo(SavingsAccount, { foreignKey: "savingsAccountId", as: "savingsAccount" });

// FR-13 Financial Transaction & Expense Management
Branch.hasMany(Expense, { foreignKey: "branchId", as: "expenses" });
Expense.belongsTo(Branch, { foreignKey: "branchId", as: "branch" });

// FR-16 Meeting & Collection Scheduling
Group.hasMany(Meeting, { foreignKey: "groupId", as: "meetings" });
Meeting.belongsTo(Group, { foreignKey: "groupId", as: "group" });

// FR-17 Notification & Reminder System
User.hasMany(Notification, { foreignKey: "recipientId", as: "notifications" });
Notification.belongsTo(User, { foreignKey: "recipientId", as: "recipient" });

// FR-18 Donor & Funding Source Management
Donor.hasMany(Contribution, { foreignKey: "donorId", as: "contributions" });
Contribution.belongsTo(Donor, { foreignKey: "donorId", as: "donor" });

Branch.hasMany(Contribution, { foreignKey: "branchId", as: "contributions" });
Contribution.belongsTo(Branch, { foreignKey: "branchId", as: "branch" });

// FR-21 Audit Log & Activity Tracking
User.hasMany(AuditLog, { foreignKey: "userId", as: "auditLogs" });
AuditLog.belongsTo(User, { foreignKey: "userId", as: "user" });

// Borrower Portal / Payment Gateway addition
Member.hasMany(Payment, { foreignKey: "memberId", as: "payments" });
Payment.belongsTo(Member, { foreignKey: "memberId", as: "member" });

Loan.hasMany(Payment, { foreignKey: "loanId", as: "payments" });
Payment.belongsTo(Loan, { foreignKey: "loanId", as: "loan" });

SavingsAccount.hasMany(Payment, { foreignKey: "savingsAccountId", as: "payments" });
Payment.belongsTo(SavingsAccount, { foreignKey: "savingsAccountId", as: "savingsAccount" });

Payment.belongsTo(Transaction, { foreignKey: "transactionId", as: "transaction" });

module.exports = {
  sequelize,
  User,
  Branch,
  Member,
  Group,
  Document,
  LoanProduct,
  LoanApplication,
  ApprovalStep,
  Guarantor,
  Collateral,
  Loan,
  RepaymentSchedule,
  Transaction,
  Notification,
  SavingsAccount,
  Expense,
  Meeting,
  Donor,
  Contribution,
  AuditLog,
  Payment,
};
