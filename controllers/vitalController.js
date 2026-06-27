const Vital = require("../models/Vital");
const { VITAL_TYPES } = require("../models/Vital");
const { getStaffUserFilter } = require("../utils/staffAccess");
const { evaluateVital, getVitalRanges, VITAL_RANGES } = require("../utils/vitalRanges");
const { logAudit } = require("../utils/auditLog");

const DEFAULT_UNITS = {
  blood_pressure: "mmHg",
  blood_glucose: "mg/dL",
  heart_rate: "bpm",
  weight: "kg",
  temperature: "°C",
  oxygen_saturation: "%",
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

const addVital = async (req, res) => {
  try {
    const targetUserId = await resolveTargetUser(req, req.body.userId);
    if (!targetUserId) {
      return res.status(403).json({ message: "You are not assigned to this user" });
    }

    const { type, value, secondaryValue, unit, recordedAt, notes } = req.body;

    if (!VITAL_TYPES.includes(type)) {
      return res.status(400).json({
        message: `type must be one of: ${VITAL_TYPES.join(", ")}`,
      });
    }

    if (value == null || isNaN(Number(value))) {
      return res.status(400).json({ message: "value is required and must be a number" });
    }

    if (type === "blood_pressure" && secondaryValue == null) {
      return res.status(400).json({
        message: "secondaryValue (diastolic) is required for blood_pressure",
      });
    }

    const vital = await Vital.create({
      user: targetUserId,
      type,
      value: Number(value),
      secondaryValue: secondaryValue != null ? Number(secondaryValue) : null,
      unit: unit || DEFAULT_UNITS[type] || "",
      recordedAt: recordedAt || new Date(),
      notes: notes || "",
      recordedBy: req.user.id,
    });

    const assessment = evaluateVital(type, vital.value, vital.secondaryValue);

    await logAudit({
      actor: req.user.id,
      actorRole: req.user.role,
      action: "vital.created",
      targetModel: "Vital",
      targetId: vital._id,
      targetUser: targetUserId,
      details: { type, value, unit: unit || DEFAULT_UNITS[type] || "" },
      req,
    });

    res.status(201).json({
      message: "Vital recorded successfully",
      vital: { ...vital.toObject(), assessment },
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to record vital",
      error: error.message,
    });
  }
};

const buildReadFilter = async (req) => {
  if (req.user.role === "admin") {
    return req.query.userId ? { user: req.query.userId } : {};
  }
  if (req.user.role === "staff") {
    const filter = await getStaffUserFilter(req.user.id, req.query.userId);
    if (!filter) return null;
    return filter;
  }
  return { user: req.user.id };
};

const getVitals = async (req, res) => {
  try {
    const baseFilter = await buildReadFilter(req);
    if (baseFilter === null) {
      return res.status(403).json({ message: "You are not assigned to this user" });
    }

    const filter = { ...baseFilter };

    if (req.query.type) {
      filter.type = req.query.type;
    }

    if (req.query.from || req.query.to) {
      filter.recordedAt = {};
      if (req.query.from) filter.recordedAt.$gte = new Date(req.query.from);
      if (req.query.to) filter.recordedAt.$lte = new Date(req.query.to);
    }

    const limit = Math.min(Number(req.query.limit) || 500, 1000);

    const vitals = await Vital.find(filter)
      .sort({ recordedAt: -1 })
      .limit(limit);

    const withAssessment = vitals.map((v) => {
      const vObj = v.toObject();
      vObj.assessment = evaluateVital(v.type, v.value, v.secondaryValue);
      return vObj;
    });

    res.status(200).json(withAssessment);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch vitals",
      error: error.message,
    });
  }
};

const getVitalTrends = async (req, res) => {
  try {
    const baseFilter = await buildReadFilter(req);
    if (baseFilter === null) {
      return res.status(403).json({ message: "You are not assigned to this user" });
    }

    const filter = { ...baseFilter };

    if (req.query.from || req.query.to) {
      filter.recordedAt = {};
      if (req.query.from) filter.recordedAt.$gte = new Date(req.query.from);
      if (req.query.to) filter.recordedAt.$lte = new Date(req.query.to);
    }

    const types = req.query.type
      ? [req.query.type]
      : VITAL_TYPES;

    const trends = {};

    for (const type of types) {
      const docs = await Vital.find({ ...filter, type })
        .sort({ recordedAt: 1 })
        .limit(1000);

      if (docs.length === 0) {
        trends[type] = { unit: DEFAULT_UNITS[type], series: [], latest: null };
        continue;
      }

      const values = docs.map((d) => d.value);
      const latest = docs[docs.length - 1];

      const latestAssessment = evaluateVital(type, latest.value, latest.secondaryValue);

      trends[type] = {
        unit: latest.unit || DEFAULT_UNITS[type],
        count: docs.length,
        min: Math.min(...values),
        max: Math.max(...values),
        avg: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100,
        latest: {
          value: latest.value,
          secondaryValue: latest.secondaryValue,
          recordedAt: latest.recordedAt,
          assessment: latestAssessment,
        },
        series: docs.map((d) => {
          const dAssessment = evaluateVital(type, d.value, d.secondaryValue);
          return {
            _id: d._id,
            value: d.value,
            secondaryValue: d.secondaryValue,
            recordedAt: d.recordedAt,
            notes: d.notes,
            assessment: dAssessment,
          };
        }),
      };
    }

    res.status(200).json(trends);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch vital trends",
      error: error.message,
    });
  }
};

const getRanges = async (req, res) => {
  try {
    const ranges = {};
    for (const type of VITAL_TYPES) {
      ranges[type] = getVitalRanges(type);
    }
    res.status(200).json(ranges);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch vital ranges", error: error.message });
  }
};

const deleteVital = async (req, res) => {
  try {
    let filter;

    if (req.user.role === "admin") {
      filter = { _id: req.params.id };
    } else if (req.user.role === "staff") {
      const staffFilter = await getStaffUserFilter(req.user.id, null);
      if (!staffFilter || !staffFilter.user) {
        return res.status(403).json({ message: "You have no assigned users" });
      }
      filter = { _id: req.params.id, ...staffFilter };
    } else {
      filter = { _id: req.params.id, user: req.user.id };
    }

    const vital = await Vital.findOneAndDelete(filter);

    if (!vital) {
      return res.status(404).json({ message: "Vital record not found" });
    }

    res.status(200).json({ message: "Vital record deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete vital record",
      error: error.message,
    });
  }
};

module.exports = {
  addVital,
  getVitals,
  getVitalTrends,
  deleteVital,
  getRanges,
};
