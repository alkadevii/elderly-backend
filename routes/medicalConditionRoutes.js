const express = require("express");
const router = express.Router();

const {
  addCondition,
  getConditions,
  updateCondition,
  deleteCondition,
} = require("../controllers/medicalConditionController");

const authMiddleware = require("../middleware/authMiddleware");

router.post("/", authMiddleware, addCondition);
router.get("/", authMiddleware, getConditions);
router.put("/:id", authMiddleware, updateCondition);
router.delete("/:id", authMiddleware, deleteCondition);

module.exports = router;
