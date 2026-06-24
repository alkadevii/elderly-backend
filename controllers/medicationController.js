const Medication = require("../models/Medication");
const { getStaffUserFilter } = require("../utils/staffAccess");

const addMedication = async (req, res) => {
  try {
    const userId = req.user.role === "staff" ? req.body.userId : req.user.id;

    if (req.user.role === "staff") {
      const filter = await getStaffUserFilter(req.user.id, userId);
      if (!filter) {
        return res.status(403).json({ message: "You are not assigned to this user" });
      }
    }

    const { scheduleTimes } = req.body;

    if (!scheduleTimes || !Array.isArray(scheduleTimes) || scheduleTimes.length === 0) {
      return res.status(400).json({
        message: "At least one schedule time is required (e.g. ['08:00', '20:00'])",
      });
    }

    const medication = await Medication.create({
      user: userId,
      ...req.body,
    });

    res.status(201).json({
      message: "Medication added successfully",
      medication,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to add medication",
      error: error.message,
    });
  }
};

const getMedications = async (req, res) => {
  try {
    let filter;

    if (req.user.role === "staff") {
      filter = await getStaffUserFilter(req.user.id, req.query.userId);
      if (!filter) {
        return res.status(403).json({ message: "You are not assigned to this user" });
      }
    } else {
      filter = { user: req.user.id };
    }

    const medications = await Medication.find(filter);
    res.status(200).json(medications);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch medications",
      error: error.message,
    });
  }
};

const updateMedication = async (req, res) => {
  try {
    let filter;

    if (req.user.role === "staff") {
      const staffFilter = await getStaffUserFilter(req.user.id, null);
      if (!staffFilter || !staffFilter.user) {
        return res.status(403).json({ message: "You have no assigned users" });
      }
      filter = { _id: req.params.id, ...staffFilter };
    } else {
      filter = { _id: req.params.id, user: req.user.id };
    }

    const medication = await Medication.findOneAndUpdate(filter, req.body, {
      new: true,
    });

    if (!medication) {
      return res.status(404).json({ message: "Medication not found" });
    }

    res.status(200).json(medication);
  } catch (error) {
    res.status(500).json({
      message: "Failed to update medication",
      error: error.message,
    });
  }
};

const deleteMedication = async (req, res) => {  try {
    let filter;

    if (req.user.role === "staff") {
      const staffFilter = await getStaffUserFilter(req.user.id, null);
      if (!staffFilter || !staffFilter.user) {
        return res.status(403).json({ message: "You have no assigned users" });
      }
      filter = { _id: req.params.id, ...staffFilter };
    } else {
      filter = { _id: req.params.id, user: req.user.id };
    }

    const medication = await Medication.findOneAndDelete(filter);

    if (!medication) {
      return res.status(404).json({ message: "Medication not found" });
    }

    res.status(200).json({ message: "Medication deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete medication",
      error: error.message,
    });
  }
};

module.exports = {
  addMedication,
  getMedications,
  updateMedication,
  deleteMedication,
};
