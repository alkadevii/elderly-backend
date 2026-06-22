const express = require("express");
const router = express.Router();

const {
  createAppointment,
  getAppointments,
  updateAppointment,
  deleteAppointment,
  reviewAppointment,
  confirmAppointment,
  finalizeAppointment,
} = require("../controllers/appointmentController");

const authMiddleware = require("../middleware/authMiddleware");
const { requireVerified } = authMiddleware;

router.post("/", authMiddleware, requireVerified, createAppointment);
router.get("/", authMiddleware, requireVerified, getAppointments);
router.put("/:id", authMiddleware, requireVerified, updateAppointment);
router.delete("/:id", authMiddleware, requireVerified, deleteAppointment);
router.put("/:id/review", authMiddleware, requireVerified, reviewAppointment);
router.put("/:id/confirm", authMiddleware, requireVerified, confirmAppointment);
router.put("/:id/finalize", authMiddleware, requireVerified, finalizeAppointment);

module.exports = router;
