const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Document = sequelize.define(
  "Document",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    docType: {
      // Extended per FR-20 to also cover generated loan documents.
      type: DataTypes.ENUM("nid", "address_proof", "other", "loan_agreement", "statement"),
      defaultValue: "other",
    },
    fileUrl: { type: DataTypes.STRING, allowNull: false },
    uploadDate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    verificationStatus: {
      type: DataTypes.ENUM("pending", "verified", "rejected"),
      defaultValue: "pending",
    },
  },
  { tableName: "documents" }
);

module.exports = Document;
