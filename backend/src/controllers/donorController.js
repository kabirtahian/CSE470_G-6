// FR-18 Donor & Funding Source Management
const { Donor, Contribution, Branch } = require("../models");

async function list(req, res) {
  try {
    const donors = await Donor.findAll({
      include: [{ model: Contribution, as: "contributions", include: [{ model: Branch, as: "branch" }] }],
      order: [["id", "ASC"]],
    });
    return res.status(200).json({ donors });
  } catch (err) {
    console.error("List donors error:", err);
    return res.status(500).json({ message: "Could not list donors." });
  }
}

async function create(req, res) {
  try {
    const { donorName, contactInfo } = req.body;
    if (!donorName) return res.status(400).json({ message: "donorName is required." });
    const donor = await Donor.create({ donorName, contactInfo });
    return res.status(201).json({ donor });
  } catch (err) {
    console.error("Create donor error:", err);
    return res.status(500).json({ message: "Could not create donor." });
  }
}

async function update(req, res) {
  try {
    const donor = await Donor.findByPk(req.params.id);
    if (!donor) return res.status(404).json({ message: "Donor not found." });
    await donor.update(req.body);
    return res.status(200).json({ donor });
  } catch (err) {
    console.error("Update donor error:", err);
    return res.status(500).json({ message: "Could not update donor." });
  }
}

async function remove(req, res) {
  try {
    const donor = await Donor.findByPk(req.params.id);
    if (!donor) return res.status(404).json({ message: "Donor not found." });
    await donor.destroy();
    return res.status(200).json({ message: "Donor deleted." });
  } catch (err) {
    console.error("Delete donor error:", err);
    return res.status(500).json({ message: "Could not delete donor." });
  }
}

async function addContribution(req, res) {
  try {
    const donor = await Donor.findByPk(req.params.id);
    if (!donor) return res.status(404).json({ message: "Donor not found." });
    const { amount, contributionDate, branchId } = req.body;
    if (amount == null) return res.status(400).json({ message: "amount is required." });
    const contribution = await Contribution.create({
      donorId: donor.id,
      amount,
      contributionDate,
      branchId,
    });
    return res.status(201).json({ contribution });
  } catch (err) {
    console.error("Add contribution error:", err);
    return res.status(500).json({ message: "Could not record contribution." });
  }
}

module.exports = { list, create, update, remove, addContribution };
