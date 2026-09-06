const { Group, Branch, User, Member } = require("../models");

const includeAll = [
  { model: Branch, as: "branch" },
  { model: User, as: "loanOfficer", attributes: ["id", "fullName", "email", "role"] },
  { model: Member, as: "members", attributes: { exclude: ["passwordHash"] } },
];

async function list(req, res) {
  try {
    const groups = await Group.findAll({ include: includeAll, order: [["id", "ASC"]] });
    return res.status(200).json({ groups });
  } catch (err) {
    console.error("List groups error:", err);
    return res.status(500).json({ message: "Could not list groups." });
  }
}

async function create(req, res) {
  try {
    const { groupName, branchId, loanOfficerId } = req.body;
    if (!groupName) {
      return res.status(400).json({ message: "groupName is required." });
    }
    const group = await Group.create({ groupName, branchId, loanOfficerId });
    const withIncludes = await Group.findByPk(group.id, { include: includeAll });
    return res.status(201).json({ group: withIncludes });
  } catch (err) {
    console.error("Create group error:", err);
    return res.status(500).json({ message: "Could not create group." });
  }
}

async function update(req, res) {
  try {
    const group = await Group.findByPk(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found." });
    const { groupName, branchId, loanOfficerId } = req.body;
    await group.update({ groupName, branchId, loanOfficerId });
    const withIncludes = await Group.findByPk(group.id, { include: includeAll });
    return res.status(200).json({ group: withIncludes });
  } catch (err) {
    console.error("Update group error:", err);
    return res.status(500).json({ message: "Could not update group." });
  }
}

async function addMember(req, res) {
  try {
    const group = await Group.findByPk(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found." });
    const { memberId } = req.body;
    const member = await Member.findByPk(memberId);
    if (!member) return res.status(404).json({ message: "Member not found." });
    await member.update({ groupId: group.id });
    return res.status(200).json({ member });
  } catch (err) {
    console.error("Add group member error:", err);
    return res.status(500).json({ message: "Could not add member to group." });
  }
}

async function removeMember(req, res) {
  try {
    const group = await Group.findByPk(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found." });
    const member = await Member.findByPk(req.params.memberId);
    if (!member || member.groupId !== group.id) {
      return res.status(404).json({ message: "Member not found in this group." });
    }
    await member.update({ groupId: null });
    return res.status(200).json({ member });
  } catch (err) {
    console.error("Remove group member error:", err);
    return res.status(500).json({ message: "Could not remove member from group." });
  }
}

module.exports = { list, create, update, addMember, removeMember };
