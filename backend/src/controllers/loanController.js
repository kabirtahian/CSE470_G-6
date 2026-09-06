// FR-09 Loan Disbursement Management + FR-10 Repayment & Installment Scheduling
const fs = require("fs");
const path = require("path");
const {
  Loan,
  LoanApplication,
  LoanProduct,
  Member,
  RepaymentSchedule,
  Transaction,
  Document,
} = require("../models");

const loanIncludes = [
  { model: LoanApplication, as: "loanApplication", include: [{ model: Member, as: "member", attributes: { exclude: ["passwordHash"] } }] },
  { model: RepaymentSchedule, as: "repaymentSchedules" },
];

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

async function list(req, res) {
  try {
    const loans = await Loan.findAll({ include: loanIncludes, order: [["id", "DESC"]] });
    return res.status(200).json({ loans });
  } catch (err) {
    console.error("List loans error:", err);
    return res.status(500).json({ message: "Could not list loans." });
  }
}

async function getOne(req, res) {
  try {
    const loan = await Loan.findByPk(req.params.id, { include: loanIncludes });
    if (!loan) return res.status(404).json({ message: "Loan not found." });
    return res.status(200).json({ loan });
  } catch (err) {
    console.error("Get loan error:", err);
    return res.status(500).json({ message: "Could not fetch loan." });
  }
}

// POST /api/loan-applications/:id/disburse (admin or branch_manager)
async function disburse(req, res) {
  try {
    const application = await LoanApplication.findByPk(req.params.id, {
      include: [{ model: LoanProduct, as: "loanProduct" }],
    });
    if (!application) return res.status(404).json({ message: "Loan application not found." });
    if (application.status !== "approved") {
      return res.status(400).json({ message: "Only an approved application can be disbursed." });
    }
    const existing = await Loan.findOne({ where: { loanApplicationId: application.id } });
    if (existing) {
      return res.status(409).json({ message: "This application has already been disbursed." });
    }

    const principal = Number(application.requestedAmount);
    const interestRate = Number(application.loanProduct.interestRate);
    const tenureMonths = application.loanProduct.tenureMonths;
    const disbursedDate = new Date().toISOString().slice(0, 10);

    const loan = await Loan.create({
      loanApplicationId: application.id,
      principal,
      interestRate,
      tenureMonths,
      disbursedDate,
      status: "active",
      outstandingBalance: principal,
    });

    // Generate the repayment schedule immediately (FR-10): split
    // principal + simple interest into tenureMonths equal installments,
    // one month apart starting from disbursedDate.
    const totalPayable = principal + principal * (interestRate / 100) * (tenureMonths / 12);
    const installmentAmount = Math.round((totalPayable / tenureMonths) * 100) / 100;
    const scheduleRows = [];
    for (let i = 1; i <= tenureMonths; i += 1) {
      scheduleRows.push({
        loanId: loan.id,
        installmentNo: i,
        dueDate: addMonths(disbursedDate, i),
        amountDue: installmentAmount,
        status: "pending",
      });
    }
    await RepaymentSchedule.bulkCreate(scheduleRows);

    // FR-20 (extend Document management): auto-generate a Document row
    // pointing at a generated loan agreement when a Loan is disbursed.
    // Minimum viable version: a placeholder text file, noted honestly in
    // the README rather than actually rendering a PDF.
    const uploadDir = path.join(__dirname, "..", "..", "uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    const filename = `loan-agreement-${loan.id}-${Date.now()}.txt`;
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(
      filePath,
      `LOAN AGREEMENT (placeholder)\nLoan ID: ${loan.id}\nPrincipal: ${principal}\nInterest rate: ${interestRate}%\nTenure: ${tenureMonths} months\nDisbursed: ${disbursedDate}\n`
    );
    await Document.create({
      memberId: application.memberId,
      docType: "loan_agreement",
      fileUrl: `/uploads/${filename}`,
      verificationStatus: "verified",
    });

    const withIncludes = await Loan.findByPk(loan.id, { include: loanIncludes });
    return res.status(201).json({ loan: withIncludes });
  } catch (err) {
    console.error("Disburse loan error:", err);
    return res.status(500).json({ message: "Could not disburse loan." });
  }
}

// POST /api/loans/:id/repayments
async function recordRepayment(req, res) {
  try {
    const loan = await Loan.findByPk(req.params.id, {
      include: [{ model: RepaymentSchedule, as: "repaymentSchedules" }],
    });
    if (!loan) return res.status(404).json({ message: "Loan not found." });
    const { amount } = req.body;
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: "A positive amount is required." });
    }
    if (loan.status === "closed") {
      return res.status(400).json({ message: "This loan is already closed." });
    }

    const nextInstallment = loan.repaymentSchedules
      .filter((r) => r.status === "pending" || r.status === "overdue")
      .sort((a, b) => a.installmentNo - b.installmentNo)[0];
    if (!nextInstallment) {
      return res.status(400).json({ message: "No outstanding installments on this loan." });
    }

    const transaction = await Transaction.create({
      loanId: loan.id,
      amount,
      category: "repayment",
      transactionType: "loan_repayment",
    });

    await nextInstallment.update({ status: "paid" });

    const newBalance = Math.max(0, Number(loan.outstandingBalance) - Number(amount));
    const allPaid = loan.repaymentSchedules.every(
      (r) => r.id === nextInstallment.id || r.status === "paid"
    );
    await loan.update({
      outstandingBalance: newBalance,
      status: allPaid ? "closed" : loan.status,
    });

    const withIncludes = await Loan.findByPk(loan.id, { include: loanIncludes });
    return res.status(201).json({ transaction, loan: withIncludes });
  } catch (err) {
    console.error("Record repayment error:", err);
    return res.status(500).json({ message: "Could not record repayment." });
  }
}

module.exports = { list, getOne, disburse, recordRepayment };
