const express = require("express");
const { requireAuth } = require("../middleware/auth");
const controller = require("../controllers/groupController");
const meetingController = require("../controllers/meetingController");

const router = express.Router();
router.use(requireAuth);

router.get("/", controller.list);
router.post("/", controller.create);
router.patch("/:id", controller.update); // also used by FR-15 to reassign loanOfficerId
router.post("/:id/members", controller.addMember);
router.delete("/:id/members/:memberId", controller.removeMember);
router.post("/:id/meetings", meetingController.create); // FR-16

module.exports = router;
