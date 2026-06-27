const express = require("express");
const router = express.Router();

const {
  getAppointmentAdherence,
  getVitalAnomalies,
  getMedicationCompliance,
  getDashboardSummary,
} = require("../controllers/dashboardController");

const authMiddleware = require("../middleware/authMiddleware");
const { requireVerified } = authMiddleware;

router.get("/appointment-adherence", authMiddleware, requireVerified, getAppointmentAdherence);
router.get("/vital-anomalies", authMiddleware, requireVerified, getVitalAnomalies);
router.get("/medication-compliance", authMiddleware, requireVerified, getMedicationCompliance);
router.get("/summary", authMiddleware, requireVerified, getDashboardSummary);

module.exports = router;
