// FR-13 Financial Transaction & Expense Management
const { Expense, Branch } = require("../models");

async function list(req, res) {
  try {
    const where = {};
    if (req.query.branchId) where.branchId = req.query.branchId;
    const expenses = await Expense.findAll({
      where,
      include: [{ model: Branch, as: "branch" }],
      order: [["id", "DESC"]],
    });
    return res.status(200).json({ expenses });
  } catch (err) {
    console.error("List expenses error:", err);
    return res.status(500).json({ message: "Could not list expenses." });
  }
}

async function create(req, res) {
  try {
    const { category, amount, expenseDate, description, branchId } = req.body;
    if (!category || amount == null) {
      return res.status(400).json({ message: "category and amount are required." });
    }
    const expense = await Expense.create({ category, amount, expenseDate, description, branchId });
    return res.status(201).json({ expense });
  } catch (err) {
    console.error("Create expense error:", err);
    return res.status(500).json({ message: "Could not create expense." });
  }
}

async function update(req, res) {
  try {
    const expense = await Expense.findByPk(req.params.id);
    if (!expense) return res.status(404).json({ message: "Expense not found." });
    await expense.update(req.body);
    return res.status(200).json({ expense });
  } catch (err) {
    console.error("Update expense error:", err);
    return res.status(500).json({ message: "Could not update expense." });
  }
}

async function remove(req, res) {
  try {
    const expense = await Expense.findByPk(req.params.id);
    if (!expense) return res.status(404).json({ message: "Expense not found." });
    await expense.destroy();
    return res.status(200).json({ message: "Expense deleted." });
  } catch (err) {
    console.error("Delete expense error:", err);
    return res.status(500).json({ message: "Could not delete expense." });
  }
}

module.exports = { list, create, update, remove };
