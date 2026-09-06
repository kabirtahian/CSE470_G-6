const { Sequelize } = require("sequelize");
require("dotenv").config();

// Dev/prod runs on MySQL (dialect: "mysql"), exactly as specified in the
// project's tech stack. DB_DIALECT=sqlite is an additive, opt-in override
// used only by the automated smoke test (test/smoke.test.js), for
// environments where a real MySQL server isn't available - it changes
// nothing about the default MySQL configuration below.
let sequelize;

if (process.env.DB_DIALECT === "sqlite") {
  sequelize = new Sequelize({
    dialect: "sqlite",
    storage: process.env.DB_STORAGE || ":memory:",
    logging: false,
  });
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME || "mfnet",
    process.env.DB_USER || "root",
    process.env.DB_PASSWORD || "",
    {
      host: process.env.DB_HOST || "localhost",
      port: process.env.DB_PORT || 3306,
      dialect: "mysql",
      logging: false,
    }
  );
}

module.exports = sequelize;
