// FR-17 Notification & Reminder System (in-app only)
const { Notification } = require("../models");

async function list(req, res) {
  try {
    const notifications = await Notification.findAll({
      where: { recipientId: req.user.id },
      order: [["id", "DESC"]],
    });
    return res.status(200).json({ notifications });
  } catch (err) {
    console.error("List notifications error:", err);
    return res.status(500).json({ message: "Could not list notifications." });
  }
}

async function markRead(req, res) {
  try {
    const notification = await Notification.findByPk(req.params.id);
    if (!notification || notification.recipientId !== req.user.id) {
      return res.status(404).json({ message: "Notification not found." });
    }
    await notification.update({ status: "read" });
    return res.status(200).json({ notification });
  } catch (err) {
    console.error("Mark notification read error:", err);
    return res.status(500).json({ message: "Could not update notification." });
  }
}

module.exports = { list, markRead };
