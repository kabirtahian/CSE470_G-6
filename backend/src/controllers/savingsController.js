// FR-12 Savings Account Management
const { SavingsAccount, Member, Transaction } = require("../models");

async function list(req, res) {
  try {
    const accounts = await SavingsAccount.findAll({
      include: [{ model: Member, as: "member", attributes: { exclude: ["passwordHash"] } }],
      order: [["id", "ASC"]],
    });
    return res.status(200).json({ savingsAccounts: accounts });
  } catch (err) {
    console.error("List savings accounts error:", err);
    return res.status(500).json({ message: "Could not list savings accounts." });
  }
}

// POST /api/members/:id/savings-account
async function open(req, res) {
  try {
    const member = await Member.findByPk(req.params.id);
    if (!member) return res.status(404).json({ message: "Member not found." });
    const existing = await SavingsAccount.findOne({ where: { memberId: member.id } });
    if (existing) {
      return res.status(409).json({ message: "This member already has a savings account." });
    }
    const savingsAccount = await SavingsAccount.create({ memberId: member.id });
    return res.status(201).json({ savingsAccount });
  } catch (err) {
    console.error("Open savings account error:", err);
    return res.status(500).json({ message: "Could not open savings account." });
  }
}

async function deposit(req, res) {
  try {
    const account = await SavingsAccount.findByPk(req.params.id);
    if (!account) return res.status(404).json({ message: "Savings account not found." });
    const { amount } = req.body;
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: "A positive amount is required." });
    }
    const transaction = await Transaction.create({
      savingsAccountId: account.id,
      amount,
      category: "deposit",
      transactionType: "savings_deposit",
    });
    await account.update({ balance: Number(account.balance) + Number(amount) });
    return res.status(201).json({ transaction, savingsAccount: account });
  } catch (err) {
    console.error("Deposit error:", err);
    return res.status(500).json({ message: "Could not record deposit." });
  }
}

async function withdraw(req, res) {
  try {
    const account = await SavingsAccount.findByPk(req.params.id);
    if (!account) return res.status(404).json({ message: "Savings account not found." });
    const { amount } = req.body;
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: "A positive amount is required." });
    }
    if (Number(amount) > Number(account.balance)) {
      return res.status(400).json({ message: "Withdrawal would overdraw this account." });
    }
    const transaction = await Transaction.create({
      savingsAccountId: account.id,
      amount,
      category: "withdrawal",
      transactionType: "savings_withdrawal",
    });
    await account.update({ balance: Number(account.balance) - Number(amount) });
    return res.status(201).json({ transaction, savingsAccount: account });
  } catch (err) {
    console.error("Withdraw error:", err);
    return res.status(500).json({ message: "Could not record withdrawal." });
  }
}

module.exports = { list, open, deposit, withdraw };
