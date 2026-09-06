// FR-11 Overdue / Default Detection & Alerts
const { Op } = require("sequelize");
const { RepaymentSchedule, Loan, LoanApplication, Member, Group, Notification } = require("../models");

// POST /api/admin/run-overdue-check (admin) - on-demand job for a course
// project; a real cron is stretch scope, see MASTER_PROMPT section 10.
async function runOverdueCheck(req, res) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const overdueRows = await RepaymentSchedule.findAll({
      where: { dueDate: { [Op.lt]: today }, status: "pending" },
      include: [
        {
          model: Loan,
          as: "loan",
          include: [
            {
              model: LoanApplication,
              as: "loanApplication",
              include: [{ model: Member, as: "member", attributes: { exclude: ["passwordHash"] }, include: [{ model: Group, as: "group" }] }],
            },
          ],
        },
      ],
    });

    let notified = 0;
    for (const row of overdueRows) {
      await row.update({ status: "overdue" });
      const member = row.loan?.loanApplication?.member;
      const loanOfficerId = member?.group?.loanOfficerId;
      if (loanOfficerId) {
        await Notification.create({
          recipientId: loanOfficerId,
          message: `Installment #${row.installmentNo} for ${member.fullName} (loan #${row.loan.id}) is overdue.`,
          channel: "in_app",
        });
        notified += 1;
      }
    }

    return res.status(200).json({
      message: `Overdue check complete. ${overdueRows.length} installment(s) marked overdue, ${notified} notification(s) sent.`,
      overdueCount: overdueRows.length,
      notified,
    });
  } catch (err) {
    console.error("Run overdue check error:", err);
    return res.status(500).json({ message: "Could not run overdue check." });
  }
}

module.exports = { runOverdueCheck };
