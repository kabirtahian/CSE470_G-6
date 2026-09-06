// FR-19 Reports & Analytics Dashboard - read/aggregate only, no new models.
const { Op } = require("sequelize");
const { Loan, RepaymentSchedule, Member, sequelize } = require("../models");

async function summary(req, res) {
  try {
    const totalActiveLoans = await Loan.count({ where: { status: "active" } });
    const totalMembers = await Member.count();

    const outstandingSum =
      (await Loan.sum("outstandingBalance", { where: { status: "active" } })) || 0;

    const overdueSum =
      (await RepaymentSchedule.sum("amountDue", { where: { status: "overdue" } })) || 0;

    const portfolioAtRisk = outstandingSum > 0 ? overdueSum / outstandingSum : 0;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .slice(0, 10);
    const totalDisbursedThisMonth =
      (await Loan.sum("principal", { where: { disbursedDate: { [Op.gte]: startOfMonth } } })) || 0;

    return res.status(200).json({
      summary: {
        totalActiveLoans,
        totalMembers,
        totalOutstanding: outstandingSum,
        totalOverdue: overdueSum,
        portfolioAtRisk,
        totalDisbursedThisMonth,
      },
    });
  } catch (err) {
    console.error("Report summary error:", err);
    return res.status(500).json({ message: "Could not compute report summary." });
  }
}

module.exports = { summary };
