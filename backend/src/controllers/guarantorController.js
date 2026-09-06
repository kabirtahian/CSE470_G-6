// FR-08 Guarantor & Collateral Management
const { LoanApplication, Guarantor } = require("../models");

async function list(req, res) {
  try {
    const application = await LoanApplication.findByPk(req.params.id);
    if (!application) return res.status(404).json({ message: "Loan application not found." });
    const guarantors = await Guarantor.findAll({
      where: { loanApplicationId: application.id },
      order: [["guarantorId", "ASC"]],
    });
    return res.status(200).json({ guarantors });
  } catch (err) {
    console.error("List guarantors error:", err);
    return res.status(500).json({ message: "Could not list guarantors." });
  }
}

async function create(req, res) {
  try {
    const application = await LoanApplication.findByPk(req.params.id);
    if (!application) return res.status(404).json({ message: "Loan application not found." });
    const { fullName, relationToApplicant, contactNumber } = req.body;
    if (!fullName) {
      return res.status(400).json({ message: "fullName is required." });
    }
    const guarantor = await Guarantor.create({
      loanApplicationId: application.id,
      fullName,
      relationToApplicant,
      contactNumber,
    });
    return res.status(201).json({ guarantor });
  } catch (err) {
    console.error("Create guarantor error:", err);
    return res.status(500).json({ message: "Could not add guarantor." });
  }
}

module.exports = { list, create };
