const {
  LoanApplication,
  Member,
  LoanProduct,
  ApprovalStep,
  User,
  Guarantor,
  Collateral,
} = require("../models");
const { getRequiredStages, STAGE_LABELS } = require("../utils/loanWorkflow");

const includeAll = [
  // passwordHash is excluded explicitly: the Borrower Portal added that
  // column to Member, and without this every loan-application response
  // would ship a borrower's bcrypt hash to the client.
  { model: Member, as: "member", attributes: { exclude: ["passwordHash"] } },
  { model: LoanProduct, as: "loanProduct" },
  {
    model: ApprovalStep,
    as: "approvalSteps",
    include: [{ model: User, as: "approver", attributes: ["id", "fullName", "email", "role"] }],
  },
  { model: Guarantor, as: "guarantors" },
  { model: Collateral, as: "collaterals" },
];

// Not persisted - computed on every read from requestedAmount.
function decorate(application) {
  const plain = application.toJSON ? application.toJSON() : application;
  const requiredStages = getRequiredStages(plain.requestedAmount);
  const requiredStageLabels = requiredStages.map((s) => STAGE_LABELS[s]);
  const currentStageRole =
    plain.status === "pending" ? requiredStages[plain.currentStageIndex] || null : null;
  const currentStageLabel = currentStageRole ? STAGE_LABELS[currentStageRole] : null;
  return {
    ...plain,
    requiredStages,
    requiredStageLabels,
    currentStageRole,
    currentStageLabel,
  };
}

async function list(req, res) {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.memberId) where.memberId = req.query.memberId;
    const applications = await LoanApplication.findAll({
      where,
      include: includeAll,
      order: [["id", "DESC"]],
    });
    return res.status(200).json({ applications: applications.map(decorate) });
  } catch (err) {
    console.error("List loan applications error:", err);
    return res.status(500).json({ message: "Could not list loan applications." });
  }
}

async function getOne(req, res) {
  try {
    const application = await LoanApplication.findByPk(req.params.id, { include: includeAll });
    if (!application) return res.status(404).json({ message: "Loan application not found." });
    return res.status(200).json({ application: decorate(application) });
  } catch (err) {
    console.error("Get loan application error:", err);
    return res.status(500).json({ message: "Could not fetch loan application." });
  }
}

async function create(req, res) {
  try {
    const { memberId, loanProductId, requestedAmount, purpose } = req.body;
    if (!memberId || !loanProductId || !requestedAmount) {
      return res
        .status(400)
        .json({ message: "memberId, loanProductId and requestedAmount are required." });
    }
    const member = await Member.findByPk(memberId);
    if (!member) return res.status(404).json({ message: "Member not found." });
    const product = await LoanProduct.findByPk(loanProductId);
    if (!product) return res.status(404).json({ message: "Loan product not found." });
    if (Number(requestedAmount) > Number(product.maxAmount)) {
      return res
        .status(400)
        .json({ message: `requestedAmount may not exceed the product's max amount of ${product.maxAmount}.` });
    }
    const application = await LoanApplication.create({
      memberId,
      loanProductId,
      requestedAmount,
      purpose,
    });
    const withIncludes = await LoanApplication.findByPk(application.id, { include: includeAll });
    return res.status(201).json({ application: decorate(withIncludes) });
  } catch (err) {
    console.error("Create loan application error:", err);
    return res.status(500).json({ message: "Could not create loan application." });
  }
}

async function decision(req, res) {
  try {
    const application = await LoanApplication.findByPk(req.params.id, { include: includeAll });
    if (!application) return res.status(404).json({ message: "Loan application not found." });

    if (application.status !== "pending") {
      return res.status(400).json({ message: "This application has already been decided." });
    }

    const { decision: decisionValue, comments } = req.body;
    if (!["approved", "rejected"].includes(decisionValue)) {
      return res.status(400).json({ message: "decision must be 'approved' or 'rejected'." });
    }

    const requiredStages = getRequiredStages(application.requestedAmount);
    const currentStageRole = requiredStages[application.currentStageIndex];

    // Only the user whose role matches the current stage may decide it,
    // except Admin who may act at any stage (system-oversight override).
    if (req.user.role !== "admin" && req.user.role !== currentStageRole) {
      return res.status(403).json({
        message: `Only a ${currentStageRole} (or admin) may decide this application at its current stage.`,
      });
    }

    await ApprovalStep.create({
      loanApplicationId: application.id,
      stage: currentStageRole,
      decision: decisionValue,
      comments,
      approverId: req.user.id,
    });

    if (decisionValue === "rejected") {
      await application.update({ status: "rejected" });
    } else {
      const nextIndex = application.currentStageIndex + 1;
      if (nextIndex >= requiredStages.length) {
        await application.update({ status: "approved", currentStageIndex: nextIndex });
      } else {
        await application.update({ currentStageIndex: nextIndex });
      }
    }

    const withIncludes = await LoanApplication.findByPk(application.id, { include: includeAll });
    return res.status(200).json({ application: decorate(withIncludes) });
  } catch (err) {
    console.error("Decide loan application error:", err);
    return res.status(500).json({ message: "Could not record decision." });
  }
}

module.exports = { list, getOne, create, decision, decorate, includeAll };
