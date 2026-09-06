const { LoanProduct } = require("../models");

async function list(req, res) {
  try {
    const products = await LoanProduct.findAll({ order: [["id", "ASC"]] });
    return res.status(200).json({ products });
  } catch (err) {
    console.error("List loan products error:", err);
    return res.status(500).json({ message: "Could not list loan products." });
  }
}

async function create(req, res) {
  try {
    const { productName, interestRate, maxAmount, tenureMonths, productType } = req.body;
    if (!productName || interestRate == null || maxAmount == null || !tenureMonths) {
      return res.status(400).json({
        message: "productName, interestRate, maxAmount and tenureMonths are required.",
      });
    }
    const product = await LoanProduct.create({
      productName,
      interestRate,
      maxAmount,
      tenureMonths,
      productType: productType || "group",
    });
    return res.status(201).json({ product });
  } catch (err) {
    console.error("Create loan product error:", err);
    return res.status(500).json({ message: "Could not create loan product." });
  }
}

async function update(req, res) {
  try {
    const product = await LoanProduct.findByPk(req.params.id);
    if (!product) return res.status(404).json({ message: "Loan product not found." });
    await product.update(req.body);
    return res.status(200).json({ product });
  } catch (err) {
    console.error("Update loan product error:", err);
    return res.status(500).json({ message: "Could not update loan product." });
  }
}

module.exports = { list, create, update };
