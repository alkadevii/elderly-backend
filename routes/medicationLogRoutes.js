const express = require("express");
const router = express.Router();

const {
  logMedication,
  getMedicationLogs,
  getTodayLogs,
  getPendingReminders,
  updateMedicationLog,
  deleteMedicationLog,
} = require("../controllers/medicationLogController");

const authMiddleware = require("../middleware/authMiddleware");
const { requireVerified } = authMiddleware;

router.post("/", authMiddleware, requireVerified, logMedication);
router.get("/", authMiddleware, requireVerified, getMedicationLogs);
router.get("/today", authMiddleware, requireVerified, getTodayLogs);
router.get("/reminders", authMiddleware, requireVerified, getPendingReminders);
router.put("/:id", authMiddleware, requireVerified, updateMedicationLog);
router.delete("/:id", authMiddleware, requireVerified, deleteMedicationLog);

module.exports = router;
