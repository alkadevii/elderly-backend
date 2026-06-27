const MedicationLog = require("../models/MedicationLog");
const Medication = require("../models/Medication");
const Notification = require("../models/Notification");
const { getStaffUserFilter } = require("../utils/staffAccess");
const { createNotification } = require("./notificationController");
const { logAudit } = require("../utils/auditLog");

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

const logMedication = async (req, res) => {
  try {
    const targetUserId = await resolveTargetUser(req, req.body.userId);
    if (!targetUserId) {
      return res.status(403).json({ message: "You are not assigned to this user" });
    }

    const { medication: medicationId, taken, status, scheduledTime, date, notes } = req.body;

    if (!medicationId) {
      return res.status(400).json({ message: "medication ID is required" });
    }

    if (taken == null) {
      return res.status(400).json({ message: "taken (boolean) is required" });
    }

    const medication = await Medication.findOne({ _id: medicationId, user: targetUserId });
    if (!medication) {
      return res.status(404).json({ message: "Medication not found" });
    }

    const logDate = date || new Date().toISOString().split("T")[0];

    let targetScheduledTime = scheduledTime;
    if (!targetScheduledTime) {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      targetScheduledTime = medication.scheduleTimes.find((st) => {
        const [sh, sm] = st.split(":").map(Number);
        const [ch, cm] = currentTime.split(":").map(Number);
        const diff = Math.abs((ch * 60 + cm) - (sh * 60 + sm));
        return diff <= (medication.gracePeriodMinutes || 60);
      }) || medication.scheduleTimes[0];
    }

    const logStatus = status || (taken ? "taken" : "missed");

    const log = await MedicationLog.findOneAndUpdate(
      { medication: medicationId, date: logDate, scheduledTime: targetScheduledTime },
      {
        user: targetUserId,
        medication: medicationId,
        taken,
        status: logStatus,
        scheduledTime: targetScheduledTime,
        date: logDate,
        actualTime: new Date(),
        notes: notes || "",
      },
      { upsert: true, new: true }
    );

    await logAudit({
      actor: req.user.id,
      actorRole: req.user.role,
      action: "medication.logged",
      targetModel: "MedicationLog",
      targetId: log._id,
      targetUser: targetUserId,
      details: { medicationId, taken: log.taken, status: logStatus, scheduledTime: targetScheduledTime, date: logDate },
      req,
    });

    res.status(201).json({
      message: logStatus === "taken" ? "Medication logged as taken" : `Medication logged as ${logStatus}`,
      log,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to log medication",
      error: error.message,
    });
  }
};

const getMedicationLogs = async (req, res) => {
  try {
    const targetUserId = await resolveTargetUser(req, req.query.userId);
    if (!targetUserId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const filter = { user: targetUserId };

    if (req.query.medication) {
      filter.medication = req.query.medication;
    }
    if (req.query.date) {
      filter.date = req.query.date;
    }
    if (req.query.from || req.query.to) {
      filter.date = {};
      if (req.query.from) filter.date.$gte = req.query.from;
      if (req.query.to) filter.date.$lte = req.query.to;
    }
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const limit = Math.min(Number(req.query.limit) || 100, 500);

    const logs = await MedicationLog.find(filter)
      .populate("medication", "medicineName dosage frequency scheduleTimes")
      .sort({ date: -1, scheduledTime: -1 })
      .limit(limit);

    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch medication logs",
      error: error.message,
    });
  }
};

const getTodayLogs = async (req, res) => {
  try {
    const targetUserId = await resolveTargetUser(req, req.query.userId);
    if (!targetUserId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const today = new Date().toISOString().split("T")[0];
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const medications = await Medication.find({ user: targetUserId });
    const existingLogs = await MedicationLog.find({ user: targetUserId, date: today });

    const logMap = {};
    for (const log of existingLogs) {
      const key = `${log.medication}_${log.scheduledTime}`;
      logMap[key] = log;
    }

    const result = [];

    for (const med of medications) {
      const slots = [];

      for (const st of med.scheduleTimes) {
        const [sh, sm] = st.split(":").map(Number);
        const slotMinutes = sh * 60 + sm;
        const key = `${med._id}_${st}`;
        const log = logMap[key];

        let status;
        if (log) {
          status = log.status;
        } else if (slotMinutes > currentMinutes) {
          status = "pending";
        } else if (currentMinutes - slotMinutes <= (med.gracePeriodMinutes || 60)) {
          status = "due";
        } else {
          status = "missed";
        }

        slots.push({
          scheduledTime: st,
          status,
          log: log || null,
        });
      }

      result.push({
        medication: {
          _id: med._id,
          medicineName: med.medicineName,
          dosage: med.dosage,
          frequency: med.frequency,
          scheduleTimes: med.scheduleTimes,
          gracePeriodMinutes: med.gracePeriodMinutes,
        },
        date: today,
        slots,
        taken: slots.filter((s) => s.status === "taken").length,
        missed: slots.filter((s) => s.status === "missed").length,
        due: slots.filter((s) => s.status === "due").length,
        pending: slots.filter((s) => s.status === "pending").length,
        skipped: slots.filter((s) => s.status === "skipped").length,
        total: slots.length,
      });
    }

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch today's logs",
      error: error.message,
    });
  }
};

const getPendingReminders = async (req, res) => {
  try {
    const targetUserId = await resolveTargetUser(req, req.query.userId);
    if (!targetUserId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const today = new Date().toISOString().split("T")[0];
    const now = new Date();
    const fromDate = req.query.from || today;
    const toDate = req.query.to || today;

    const medications = await Medication.find({ user: targetUserId });
    const allDue = [];
    const allMissed = [];
    const missedNotifications = [];

    let d = new Date(fromDate);
    const end = new Date(toDate);
    while (d <= end) {
      const dateStr = d.toISOString().split("T")[0];
      const isToday = dateStr === today;

      for (const med of medications) {
        if (med.startDate && new Date(med.startDate).toISOString().split("T")[0] > dateStr) continue;
        if (med.endDate && new Date(med.endDate).toISOString().split("T")[0] < dateStr) continue;

        for (const st of med.scheduleTimes) {
          const existingLog = await MedicationLog.findOne({
            medication: med._id,
            date: dateStr,
            scheduledTime: st,
          });

          if (existingLog) continue;

          const graceMinutes = med.gracePeriodMinutes || 60;

          if (isToday) {
            const [sh, sm] = st.split(":").map(Number);
            const scheduleMinutes = sh * 60 + sm;
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            const diffMinutes = currentMinutes - scheduleMinutes;

            if (diffMinutes < 0) continue;

            if (diffMinutes <= graceMinutes) {
              allDue.push({
                medication: { _id: med._id, medicineName: med.medicineName, dosage: med.dosage, scheduleTimes: med.scheduleTimes, gracePeriodMinutes: graceMinutes },
                date: dateStr,
                scheduledTime: st,
                status: "due",
                minutesOverdue: diffMinutes,
                gracePeriodMinutes: graceMinutes,
              });
            } else {
              allMissed.push({
                medication: { _id: med._id, medicineName: med.medicineName, dosage: med.dosage, scheduleTimes: med.scheduleTimes, gracePeriodMinutes: graceMinutes },
                date: dateStr,
                scheduledTime: st,
                status: "missed",
                minutesOverdue: diffMinutes,
                gracePeriodMinutes: graceMinutes,
              });
              missedNotifications.push({ medicationId: med._id, medicineName: med.medicineName, scheduledTime: st, date: dateStr });
            }
          } else {
            allMissed.push({
              medication: { _id: med._id, medicineName: med.medicineName, dosage: med.dosage, scheduleTimes: med.scheduleTimes, gracePeriodMinutes: graceMinutes },
              date: dateStr,
              scheduledTime: st,
              status: "missed",
              minutesOverdue: null,
              gracePeriodMinutes: graceMinutes,
            });
            missedNotifications.push({ medicationId: med._id, medicineName: med.medicineName, scheduledTime: st, date: dateStr });
          }
        }
      }
      d.setDate(d.getDate() + 1);
    }

    const todayMidnight = new Date(now.setHours(0, 0, 0, 0));
    for (const missed of missedNotifications) {
      const existingNotif = await Notification.findOne({
        user: targetUserId,
        title: "Missed medication",
        createdAt: { $gte: todayMidnight },
        "medication": missed.medicationId,
      });

      if (!existingNotif) {
        await createNotification({
          user: targetUserId,
          type: "medication",
          title: "Missed medication",
          message: `You missed your dose of ${missed.medicineName} scheduled at ${missed.scheduledTime} on ${missed.date}.`,
          status: "missed",
        });
      }
    }

    res.status(200).json({
      due: allDue,
      missed: allMissed,
      totalDue: allDue.length,
      totalMissed: allMissed.length,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch reminders",
      error: error.message,
    });
  }
};

const updateMedicationLog = async (req, res) => {
  try {
    let filter = { _id: req.params.id };

    if (req.user.role === "admin") {
    } else if (req.user.role === "staff") {
      const staffFilter = await getStaffUserFilter(req.user.id, null);
      if (!staffFilter || !staffFilter.user) {
        return res.status(403).json({ message: "You have no assigned users" });
      }
      filter = { ...filter, ...staffFilter };
    } else {
      filter = { ...filter, user: req.user.id };
    }

    const { taken, status, notes } = req.body;
    const update = {};
    if (taken != null) update.taken = taken;
    if (status) update.status = status;
    if (notes != null) update.notes = notes;
    update.actualTime = new Date();

    const log = await MedicationLog.findOneAndUpdate(filter, update, { new: true });

    if (!log) {
      return res.status(404).json({ message: "Medication log not found" });
    }

    res.status(200).json({ message: "Medication log updated", log });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update medication log",
      error: error.message,
    });
  }
};

const deleteMedicationLog = async (req, res) => {
  try {
    let filter = { _id: req.params.id };

    if (req.user.role === "admin") {
    } else if (req.user.role === "staff") {
      const staffFilter = await getStaffUserFilter(req.user.id, null);
      if (!staffFilter || !staffFilter.user) {
        return res.status(403).json({ message: "You have no assigned users" });
      }
      filter = { ...filter, ...staffFilter };
    } else {
      filter = { ...filter, user: req.user.id };
    }

    const log = await MedicationLog.findOneAndDelete(filter);

    if (!log) {
      return res.status(404).json({ message: "Medication log not found" });
    }

    res.status(200).json({ message: "Medication log deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete medication log",
      error: error.message,
    });
  }
};

module.exports = {
  logMedication,
  getMedicationLogs,
  getTodayLogs,
  getPendingReminders,
  updateMedicationLog,
  deleteMedicationLog,
};
