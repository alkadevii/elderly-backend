const EmergencyContact = require("../models/EmergencyContact");
const { getStaffUserFilter } = require("../utils/staffAccess");

const addContact = async (req, res) => {
  try {
    const userId = req.user.role === "staff" ? req.body.userId : req.user.id;

    if (req.user.role === "staff") {
      const filter = await getStaffUserFilter(req.user.id, userId);
      if (!filter) {
        return res.status(403).json({ message: "You are not assigned to this user" });
      }
    }

    const contact = await EmergencyContact.create({
      user: userId,
      ...req.body,
    });

    res.status(201).json({
      message: "Contact added",
      contact,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to add contact",
      error: error.message,
    });
  }
};

const getContacts = async (req, res) => {
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

    const contacts = await EmergencyContact.find(filter);
    res.status(200).json(contacts);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch contacts",
      error: error.message,
    });
  }
};

const updateContact = async (req, res) => {
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

    const contact = await EmergencyContact.findOneAndUpdate(filter, req.body, {
      new: true,
    });

    if (!contact) {
      return res.status(404).json({ message: "Contact not found" });
    }

    res.status(200).json(contact);
  } catch (error) {
    res.status(500).json({
      message: "Failed to update contact",
      error: error.message,
    });
  }
};

const deleteContact = async (req, res) => {
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

    const contact = await EmergencyContact.findOneAndDelete(filter);

    if (!contact) {
      return res.status(404).json({ message: "Contact not found" });
    }

    res.status(200).json({ message: "Contact deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete contact",
      error: error.message,
    });
  }
};

module.exports = {
  addContact,
  getContacts,
  updateContact,
  deleteContact,
};
