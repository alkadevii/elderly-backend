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
  provideFeedback,
  closeAppointment,
  cancelAppointment,
  approveCancellationRequest,
  rejectCancellationRequest,
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
router.post("/:id/feedback", authMiddleware, requireVerified, provideFeedback);
router.put("/:id/close", authMiddleware, requireVerified, closeAppointment);
router.post("/:id/cancel", authMiddleware, requireVerified, cancelAppointment);
router.put("/:id/approve-cancellation", authMiddleware, requireVerified, approveCancellationRequest);
router.put("/:id/reject-cancellation", authMiddleware, requireVerified, rejectCancellationRequest);

module.exports = router;
