const express = require("express");
const router = express.Router();

const {
  addMedication,
  getMedications,
  updateMedication,
  deleteMedication,
} = require("../controllers/medicationController");

const authMiddleware = require("../middleware/authMiddleware");
const { requireVerified } = authMiddleware;

router.post("/", authMiddleware, requireVerified, addMedication);
router.get("/", authMiddleware, requireVerified, getMedications);
router.put("/:id", authMiddleware, requireVerified, updateMedication);
router.delete("/:id", authMiddleware, requireVerified, deleteMedication);

module.exports = router;
