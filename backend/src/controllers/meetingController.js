// FR-16 Meeting & Collection Scheduling
const { Meeting, Group } = require("../models");

async function list(req, res) {
  try {
    const where = {};
    if (req.query.groupId) where.groupId = req.query.groupId;
    const meetings = await Meeting.findAll({
      where,
      include: [{ model: Group, as: "group" }],
      order: [["scheduledDate", "ASC"]],
    });
    return res.status(200).json({ meetings });
  } catch (err) {
    console.error("List meetings error:", err);
    return res.status(500).json({ message: "Could not list meetings." });
  }
}

// POST /api/groups/:id/meetings
async function create(req, res) {
  try {
    const group = await Group.findByPk(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found." });
    const { scheduledDate, location } = req.body;
    if (!scheduledDate) {
      return res.status(400).json({ message: "scheduledDate is required." });
    }
    const meeting = await Meeting.create({ groupId: group.id, scheduledDate, location });
    return res.status(201).json({ meeting });
  } catch (err) {
    console.error("Create meeting error:", err);
    return res.status(500).json({ message: "Could not schedule meeting." });
  }
}

async function update(req, res) {
  try {
    const meeting = await Meeting.findByPk(req.params.id);
    if (!meeting) return res.status(404).json({ message: "Meeting not found." });
    await meeting.update(req.body);
    return res.status(200).json({ meeting });
  } catch (err) {
    console.error("Update meeting error:", err);
    return res.status(500).json({ message: "Could not update meeting." });
  }
}

module.exports = { list, create, update };
