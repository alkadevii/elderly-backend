const MedicalCondition = require("../models/MedicalCondition");
const { getStaffUserFilter } = require("../utils/staffAccess");

const addCondition = async (req, res) => {
  try {
    const userId = req.user.role === "staff" ? req.body.userId : req.user.id;

    if (req.user.role === "staff") {
      const filter = await getStaffUserFilter(req.user.id, userId);
      if (!filter) {
        return res.status(403).json({ message: "You are not assigned to this user" });
      }
    }

    const condition = await MedicalCondition.create({
      user: userId,
      ...req.body,
    });

    res.status(201).json({
      message: "Condition added successfully",
      condition,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to add condition",
      error: error.message,
    });
  }
};

const getConditions = async (req, res) => {
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

    const conditions = await MedicalCondition.find(filter);
    res.status(200).json(conditions);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch conditions",
      error: error.message,
    });
  }
};

const updateCondition = async (req, res) => {
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

    const condition = await MedicalCondition.findOneAndUpdate(filter, req.body, {
      new: true,
    });

    if (!condition) {
      return res.status(404).json({ message: "Condition not found" });
    }

    res.status(200).json(condition);
  } catch (error) {
    res.status(500).json({
      message: "Failed to update condition",
      error: error.message,
    });
  }
};

const deleteCondition = async (req, res) => {
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

    const condition = await MedicalCondition.findOneAndDelete(filter);

    if (!condition) {
      return res.status(404).json({ message: "Condition not found" });
    }

    res.status(200).json({ message: "Condition deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete condition",
      error: error.message,
    });
  }
};

module.exports = {
  addCondition,
  getConditions,
  updateCondition,
  deleteCondition,
};
