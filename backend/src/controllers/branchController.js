const { Branch } = require("../models");

async function list(req, res) {
  try {
    const branches = await Branch.findAll({ order: [["id", "ASC"]] });
    return res.status(200).json({ branches });
  } catch (err) {
    console.error("List branches error:", err);
    return res.status(500).json({ message: "Could not list branches." });
  }
}

async function create(req, res) {
  try {
    const { branchName, address, contactNumber } = req.body;
    if (!branchName) {
      return res.status(400).json({ message: "branchName is required." });
    }
    const branch = await Branch.create({ branchName, address, contactNumber });
    return res.status(201).json({ branch });
  } catch (err) {
    console.error("Create branch error:", err);
    return res.status(500).json({ message: "Could not create branch." });
  }
}

async function update(req, res) {
  try {
    const branch = await Branch.findByPk(req.params.id);
    if (!branch) return res.status(404).json({ message: "Branch not found." });
    const { branchName, address, contactNumber } = req.body;
    await branch.update({ branchName, address, contactNumber });
    return res.status(200).json({ branch });
  } catch (err) {
    console.error("Update branch error:", err);
    return res.status(500).json({ message: "Could not update branch." });
  }
}

async function remove(req, res) {
  try {
    const branch = await Branch.findByPk(req.params.id);
    if (!branch) return res.status(404).json({ message: "Branch not found." });
    await branch.destroy();
    return res.status(200).json({ message: "Branch deleted." });
  } catch (err) {
    console.error("Delete branch error:", err);
    return res.status(500).json({ message: "Could not delete branch." });
  }
}

module.exports = { list, create, update, remove };
