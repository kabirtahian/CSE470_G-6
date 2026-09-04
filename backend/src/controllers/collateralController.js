// FR-08 Guarantor & Collateral Management
const { LoanApplication, Collateral } = require("../models");

async function list(req, res) {
  try {
    const application = await LoanApplication.findByPk(req.params.id);
    if (!application) return res.status(404).json({ message: "Loan application not found." });
    const collaterals = await Collateral.findAll({
      where: { loanApplicationId: application.id },
      order: [["collateralId", "ASC"]],
    });
    return res.status(200).json({ collaterals });
  } catch (err) {
    console.error("List collateral error:", err);
    return res.status(500).json({ message: "Could not list collateral." });
  }
}

async function create(req, res) {
  try {
    const application = await LoanApplication.findByPk(req.params.id);
    if (!application) return res.status(404).json({ message: "Loan application not found." });
    const { description, estimatedValue } = req.body;
    if (!description) {
      return res.status(400).json({ message: "description is required." });
    }
    const collateral = await Collateral.create({
      loanApplicationId: application.id,
      description,
      estimatedValue,
    });
    return res.status(201).json({ collateral });
  } catch (err) {
    console.error("Create collateral error:", err);
    return res.status(500).json({ message: "Could not add collateral." });
  }
}

module.exports = { list, create };
