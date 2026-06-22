const express = require("express");
const router = express.Router();

const {
  addCondition,
  getConditions,
  updateCondition,
  deleteCondition,
} = require("../controllers/medicalConditionController");

const authMiddleware = require("../middleware/authMiddleware");
const { requireVerified } = authMiddleware;

router.post("/", authMiddleware, requireVerified, addCondition);
router.get("/", authMiddleware, requireVerified, getConditions);
router.put("/:id", authMiddleware, requireVerified, updateCondition);
router.delete("/:id", authMiddleware, requireVerified, deleteCondition);

module.exports = router;
