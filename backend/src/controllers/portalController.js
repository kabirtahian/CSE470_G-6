// Borrower Portal - self-service endpoints. Every query here is scoped to
// req.member.id (set by requireMemberAuth), never to an id supplied by the
// client, so a borrower can only ever see or act on their own records.
const {
  LoanApplication,
  LoanProduct,
  Loan,
  RepaymentSchedule,
  SavingsAccount,
} = require("../models");
const { decorate, includeAll: staffLoanAppIncludes } = require("./loanApplicationController");

// SECURITY: the staff include set eagerly loads the full Member record,
// which since the Borrower Portal was added also carries passwordHash.
// Echoing that back to the borrower's own browser would hand out a bcrypt
// hash of their password on every portal request - useless to them, and a
// gift to anyone who got hold of the response.
//
// The portal therefore uses its own include set with the member join
// dropped entirely: a borrower already knows who they are, so the record
// adds nothing to these responses. Everything else is carried over.
const loanAppIncludes = staffLoanAppIncludes.filter((inc) => inc.as !== "member");

async function listLoanProducts(req, res) {
  try {
    const products = await LoanProduct.findAll({ where: { isActive: true }, order: [["id", "ASC"]] });
    return res.status(200).json({ products });
  } catch (err) {
    console.error("Portal list loan products error:", err);
    return res.status(500).json({ message: "Could not load loan products." });
  }
}

async function listMyApplications(req, res) {
  try {
    const applications = await LoanApplication.findAll({
      where: { memberId: req.member.id },
      include: loanAppIncludes,
      order: [["id", "DESC"]],
    });
    return res.status(200).json({ applications: applications.map(decorate) });
  } catch (err) {
    console.error("Portal list applications error:", err);
    return res.status(500).json({ message: "Could not load your loan applications." });
  }
}

async function getMyApplication(req, res) {
  try {
    const application = await LoanApplication.findOne({
      where: { id: req.params.id, memberId: req.member.id },
      include: loanAppIncludes,
    });
    if (!application) return res.status(404).json({ message: "Loan application not found." });
    return res.status(200).json({ application: decorate(application) });
  } catch (err) {
    console.error("Portal get application error:", err);
    return res.status(500).json({ message: "Could not load loan application." });
  }
}

async function createMyApplication(req, res) {
  try {
    const { loanProductId, requestedAmount, purpose } = req.body;
    if (!loanProductId || !requestedAmount) {
      return res.status(400).json({ message: "loanProductId and requestedAmount are required." });
    }
    const product = await LoanProduct.findByPk(loanProductId);
    if (!product || !product.isActive) {
      return res.status(404).json({ message: "Loan product not found." });
    }
    if (Number(requestedAmount) > Number(product.maxAmount)) {
      return res
        .status(400)
        .json({ message: `requestedAmount may not exceed the product's max amount of ${product.maxAmount}.` });
    }
    const application = await LoanApplication.create({
      memberId: req.member.id,
      loanProductId,
      requestedAmount,
      purpose,
    });
    const withIncludes = await LoanApplication.findByPk(application.id, { include: loanAppIncludes });
    return res.status(201).json({ application: decorate(withIncludes) });
  } catch (err) {
    console.error("Portal create application error:", err);
    return res.status(500).json({ message: "Could not submit your loan application." });
  }
}

const loanIncludes = [{ model: RepaymentSchedule, as: "repaymentSchedules" }];

async function listMyLoans(req, res) {
  try {
    const loans = await Loan.findAll({
      include: [
        { model: LoanApplication, as: "loanApplication", where: { memberId: req.member.id }, required: true },
        ...loanIncludes,
      ],
      order: [["id", "DESC"]],
    });
    return res.status(200).json({ loans });
  } catch (err) {
    console.error("Portal list loans error:", err);
    return res.status(500).json({ message: "Could not load your loans." });
  }
}

async function getMyLoan(req, res) {
  try {
    const loan = await Loan.findOne({
      where: { id: req.params.id },
      include: [
        { model: LoanApplication, as: "loanApplication", where: { memberId: req.member.id }, required: true },
        ...loanIncludes,
      ],
    });
    if (!loan) return res.status(404).json({ message: "Loan not found." });
    return res.status(200).json({ loan });
  } catch (err) {
    console.error("Portal get loan error:", err);
    return res.status(500).json({ message: "Could not load loan." });
  }
}

async function getMySavingsAccount(req, res) {
  try {
    const savingsAccount = await SavingsAccount.findOne({ where: { memberId: req.member.id } });
    return res.status(200).json({ savingsAccount });
  } catch (err) {
    console.error("Portal get savings account error:", err);
    return res.status(500).json({ message: "Could not load your savings account." });
  }
}

async function openMySavingsAccount(req, res) {
  try {
    const existing = await SavingsAccount.findOne({ where: { memberId: req.member.id } });
    if (existing) return res.status(409).json({ message: "You already have a savings account." });
    const savingsAccount = await SavingsAccount.create({ memberId: req.member.id });
    return res.status(201).json({ savingsAccount });
  } catch (err) {
    console.error("Portal open savings account error:", err);
    return res.status(500).json({ message: "Could not open a savings account." });
  }
}

module.exports = {
  listLoanProducts,
  listMyApplications,
  getMyApplication,
  createMyApplication,
  listMyLoans,
  getMyLoan,
  getMySavingsAccount,
  openMySavingsAccount,
};
