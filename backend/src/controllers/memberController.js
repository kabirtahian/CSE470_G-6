const { Member, Branch, Group, Document } = require("../models");

const includeAll = [
  { model: Branch, as: "branch" },
  { model: Group, as: "group" },
  { model: Document, as: "documents" },
];

async function list(req, res) {
  try {
    const where = {};
    if (req.query.branchId) where.branchId = req.query.branchId;
    if (req.query.groupId) where.groupId = req.query.groupId;
    const members = await Member.findAll({ where, include: includeAll, order: [["id", "ASC"]] });
    return res.status(200).json({ members });
  } catch (err) {
    console.error("List members error:", err);
    return res.status(500).json({ message: "Could not list members." });
  }
}

async function getOne(req, res) {
  try {
    const member = await Member.findByPk(req.params.id, { include: includeAll });
    if (!member) return res.status(404).json({ message: "Member not found." });
    return res.status(200).json({ member });
  } catch (err) {
    console.error("Get member error:", err);
    return res.status(500).json({ message: "Could not fetch member." });
  }
}

async function create(req, res) {
  try {
    const { fullName, nationalId, address, phone, dob, branchId, groupId } = req.body;
    if (!fullName || !nationalId) {
      return res.status(400).json({ message: "fullName and nationalId are required." });
    }
    const existing = await Member.findOne({ where: { nationalId } });
    if (existing) {
      return res.status(409).json({ message: "A member with this national ID already exists." });
    }
    const member = await Member.create({ fullName, nationalId, address, phone, dob, branchId, groupId });
    const withIncludes = await Member.findByPk(member.id, { include: includeAll });
    return res.status(201).json({ member: withIncludes });
  } catch (err) {
    console.error("Create member error:", err);
    return res.status(500).json({ message: "Could not create member." });
  }
}

async function update(req, res) {
  try {
    const member = await Member.findByPk(req.params.id);
    if (!member) return res.status(404).json({ message: "Member not found." });
    if (req.body.nationalId && req.body.nationalId !== member.nationalId) {
      const existing = await Member.findOne({ where: { nationalId: req.body.nationalId } });
      if (existing) {
        return res.status(409).json({ message: "A member with this national ID already exists." });
      }
    }
    await member.update(req.body);
    const withIncludes = await Member.findByPk(member.id, { include: includeAll });
    return res.status(200).json({ member: withIncludes });
  } catch (err) {
    console.error("Update member error:", err);
    return res.status(500).json({ message: "Could not update member." });
  }
}

async function updateKyc(req, res) {
  try {
    const member = await Member.findByPk(req.params.id);
    if (!member) return res.status(404).json({ message: "Member not found." });
    const { status } = req.body;
    if (!["pending", "verified", "rejected"].includes(status)) {
      return res.status(400).json({ message: "status must be pending, verified, or rejected." });
    }
    await member.update({ kycStatus: status });
    const withIncludes = await Member.findByPk(member.id, { include: includeAll });
    return res.status(200).json({ member: withIncludes });
  } catch (err) {
    console.error("Update KYC error:", err);
    return res.status(500).json({ message: "Could not update KYC status." });
  }
}

async function uploadDocument(req, res) {
  try {
    const member = await Member.findByPk(req.params.id);
    if (!member) return res.status(404).json({ message: "Member not found." });
    if (!req.file) {
      return res.status(400).json({ message: "A document file is required." });
    }
    const { docType } = req.body;
    const document = await Document.create({
      memberId: member.id,
      docType: docType || "other",
      fileUrl: `/uploads/${req.file.filename}`,
    });
    return res.status(201).json({ document });
  } catch (err) {
    console.error("Upload document error:", err);
    return res.status(500).json({ message: "Could not upload document." });
  }
}

module.exports = { list, getOne, create, update, updateKyc, uploadDocument };
