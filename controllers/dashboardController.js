const Appointment = require("../models/Appointment");
const Vital = require("../models/Vital");
const { VITAL_TYPES } = require("../models/Vital");
const Medication = require("../models/Medication");
const MedicationLog = require("../models/MedicationLog");
const { evaluateVital } = require("../utils/vitalRanges");
const { getStaffUserFilter } = require("../utils/staffAccess");

const getEffectiveDateRange = (medication, queryFrom, queryTo) => {
  const start = medication.startDate
    ? new Date(Math.max(new Date(queryFrom).getTime(), new Date(medication.startDate).getTime()))
    : new Date(queryFrom);
  const end = medication.endDate
    ? new Date(Math.min(new Date(queryTo).getTime(), new Date(medication.endDate).getTime()))
    : new Date(queryTo);
  return { start, end };
};

const countDaysInRange = (start, end) => {
  const days = [];
  let d = new Date(start);
  const endDate = new Date(end);
  while (d <= endDate) {
    days.push(d.toISOString().split("T")[0]);
    d.setDate(d.getDate() + 1);
  }
  return days;
};

const resolveTargetUser = async (req, targetUserId) => {
  if (req.user.role === "admin") {
    return targetUserId || req.user.id;
  }
  if (req.user.role === "staff") {
    const userId = targetUserId || req.user.id;
    const filter = await getStaffUserFilter(req.user.id, userId);
    if (!filter) return null;
    return userId;
  }
  return req.user.id;
};

const getAppointmentAdherence = async (req, res) => {
  try {
    const targetUserId = await resolveTargetUser(req, req.query.userId);
    if (!targetUserId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { from, to } = req.query;
    const dateFilter = {};
    if (from || to) {
      dateFilter.appointmentDate = {};
      if (from) dateFilter.appointmentDate.$gte = new Date(from);
      if (to) dateFilter.appointmentDate.$lte = new Date(to);
    }

    const total = await Appointment.countDocuments({ user: targetUserId, ...dateFilter });
    const completed = await Appointment.countDocuments({
      user: targetUserId,
      ...dateFilter,
      status: { $in: ["completed", "feedback_provided", "awaiting_feedback"] },
    });
    const cancelled = await Appointment.countDocuments({
      user: targetUserId,
      ...dateFilter,
      status: "cancelled",
    });
    const rejected = await Appointment.countDocuments({
      user: targetUserId,
      ...dateFilter,
      status: "rejected",
    });
    const scheduled = await Appointment.countDocuments({
      user: targetUserId,
      ...dateFilter,
      status: { $in: ["scheduled", "user_confirmed", "pending_confirmation", "pending"] },
    });

    const nonCancelled = total - cancelled - rejected;
    const adherenceRate = nonCancelled > 0 ? Math.round((completed / nonCancelled) * 100) : 0;

    res.status(200).json({
      total,
      completed,
      cancelled,
      rejected,
      scheduled,
      nonCancelled,
      adherenceRate,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch appointment adherence",
      error: error.message,
    });
  }
};

const getVitalAnomalies = async (req, res) => {
  try {
    const targetUserId = await resolveTargetUser(req, req.query.userId);
    if (!targetUserId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { from, to } = req.query;
    const dateFilter = {};
    if (from || to) {
      dateFilter.recordedAt = {};
      if (from) dateFilter.recordedAt.$gte = new Date(from);
      if (to) dateFilter.recordedAt.$lte = new Date(to);
    }

    const anomalies = {};
    let totalAnomalies = 0;
    let totalReadings = 0;

    for (const type of VITAL_TYPES) {
      const readings = await Vital.find({ user: targetUserId, type, ...dateFilter });

      let abnormal = 0;
      const abnormalReadings = [];

      for (const v of readings) {
        const assessment = evaluateVital(type, v.value, v.secondaryValue);
        if (assessment.status !== "normal" && assessment.status !== "info") {
          abnormal++;
          abnormalReadings.push({
            _id: v._id,
            value: v.value,
            secondaryValue: v.secondaryValue,
            recordedAt: v.recordedAt,
            assessment,
          });
        }
      }

      anomalies[type] = {
        total: readings.length,
        abnormal,
        normal: readings.length - abnormal,
        anomalyRate: readings.length > 0 ? Math.round((abnormal / readings.length) * 100) : 0,
        abnormalReadings: abnormalReadings.slice(0, 20),
      };

      totalAnomalies += abnormal;
      totalReadings += readings.length;
    }

    res.status(200).json({
      anomalies,
      summary: {
        totalReadings,
        totalAnomalies,
        overallAnomalyRate: totalReadings > 0 ? Math.round((totalAnomalies / totalReadings) * 100) : 0,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch vital anomalies",
      error: error.message,
    });
  }
};

const getMedicationCompliance = async (req, res) => {
  try {
    const targetUserId = await resolveTargetUser(req, req.query.userId);
    if (!targetUserId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { from, to } = req.query;
    const today = new Date().toISOString().split("T")[0];
    const fromDate = from || today;
    const toDate = to || today;

    const medications = await Medication.find({ user: targetUserId });

    let totalScheduled = 0;
    let totalTaken = 0;
    let totalMissed = 0;
    const perMedication = [];

    for (const med of medications) {
      const { start, end } = getEffectiveDateRange(med, fromDate, toDate);
      const daysInRange = countDaysInRange(start, end);
      const dosesPerDay = med.scheduleTimes.length;

      const scheduledDoses = daysInRange.length * dosesPerDay;

      const logs = await MedicationLog.find({
        medication: med._id,
        date: { $gte: daysInRange[0] || fromDate, $lte: daysInRange[daysInRange.length - 1] || toDate },
      });

      const taken = logs.filter((l) => l.taken === true).length;
      const missed = logs.filter((l) => l.taken === false).length;
      const unlogged = Math.max(0, scheduledDoses - logs.length);

      const compliance = scheduledDoses > 0 ? Math.round((taken / scheduledDoses) * 100) : 0;

      perMedication.push({
        medicationId: med._id,
        medicineName: med.medicineName,
        dosage: med.dosage,
        frequency: med.frequency,
        dosesPerDay,
        startDate: med.startDate,
        endDate: med.endDate,
        daysInRange: daysInRange.length,
        scheduledDoses,
        taken,
        missed,
        unlogged,
        compliance,
      });

      totalScheduled += scheduledDoses;
      totalTaken += taken;
      totalMissed += missed + unlogged;
    }

    const overallCompliance = totalScheduled > 0 ? Math.round((totalTaken / totalScheduled) * 100) : 0;

    res.status(200).json({
      fromDate,
      toDate,
      totalMedications: medications.length,
      totalScheduled,
      totalTaken,
      totalMissed,
      overallCompliance,
      perMedication,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch medication compliance",
      error: error.message,
    });
  }
};

const getDashboardSummary = async (req, res) => {
  try {
    const targetUserId = await resolveTargetUser(req, req.query.userId);
    if (!targetUserId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { from, to } = req.query;
    const dateFilter = {};
    const vitalDateFilter = {};
    if (from || to) {
      if (from) {
        dateFilter.appointmentDate = { $gte: new Date(from) };
        vitalDateFilter.recordedAt = { $gte: new Date(from) };
      }
      if (to) {
        dateFilter.appointmentDate = { ...(dateFilter.appointmentDate || {}), $lte: new Date(to) };
        vitalDateFilter.recordedAt = { ...(vitalDateFilter.recordedAt || {}), $lte: new Date(to) };
      }
    }

    const totalAppointments = await Appointment.countDocuments({ user: targetUserId, ...dateFilter });
    const completedAppointments = await Appointment.countDocuments({
      user: targetUserId,
      ...dateFilter,
      status: { $in: ["completed", "feedback_provided", "awaiting_feedback"] },
    });
    const cancelledAppointments = await Appointment.countDocuments({
      user: targetUserId,
      ...dateFilter,
      status: "cancelled",
    });
    const nonCancelled = totalAppointments - cancelledAppointments;
    const appointmentAdherence = nonCancelled > 0 ? Math.round((completedAppointments / nonCancelled) * 100) : 0;

    const today = new Date().toISOString().split("T")[0];
    const fromDate = from || today;
    const toDate = to || today;

    const medications = await Medication.find({ user: targetUserId });
    let totalScheduled = 0;
    let totalTaken = 0;
    for (const med of medications) {
      const { start, end } = getEffectiveDateRange(med, fromDate, toDate);
      const daysInRange = countDaysInRange(start, end);
      const dosesPerDay = med.scheduleTimes.length;
      const scheduledDoses = daysInRange.length * dosesPerDay;
      const logs = await MedicationLog.find({
        medication: med._id,
        date: { $gte: daysInRange[0] || fromDate, $lte: daysInRange[daysInRange.length - 1] || toDate },
      });
      totalScheduled += scheduledDoses;
      totalTaken += logs.filter((l) => l.taken === true).length;
    }
    const medicationCompliance = totalScheduled > 0 ? Math.round((totalTaken / totalScheduled) * 100) : 0;

    let totalReadings = 0;
    let totalAnomalies = 0;
    for (const type of VITAL_TYPES) {
      const readings = await Vital.find({ user: targetUserId, type, ...vitalDateFilter });
      totalReadings += readings.length;
      for (const v of readings) {
        const assessment = evaluateVital(type, v.value, v.secondaryValue);
        if (assessment.status !== "normal" && assessment.status !== "info") {
          totalAnomalies++;
        }
      }
    }
    const anomalyRate = totalReadings > 0 ? Math.round((totalAnomalies / totalReadings) * 100) : 0;

    res.status(200).json({
      period: { from: from || "all", to: to || "all" },
      appointmentAdherence: {
        total: totalAppointments,
        completed: completedAppointments,
        cancelled: cancelledAppointments,
        rate: appointmentAdherence,
      },
      medicationCompliance: {
        totalScheduled,
        totalTaken,
        rate: medicationCompliance,
      },
      vitalHealth: {
        totalReadings,
        totalAnomalies,
        anomalyRate,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch dashboard summary",
      error: error.message,
    });
  }
};

module.exports = {
  getAppointmentAdherence,
  getVitalAnomalies,
  getMedicationCompliance,
  getDashboardSummary,
};
