const EmergencyContact = require(
  "../models/EmergencyContact"
);

// CREATE
const addContact = async (req, res) => {
  try {
    const contact =
      await EmergencyContact.create({
        user: req.user.id,
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

// GET ALL
const getContacts = async (
  req,
  res
) => {
  try {
    const contacts =
      await EmergencyContact.find({
        user: req.user.id,
      });

    res.status(200).json(contacts);
  } catch (error) {
    res.status(500).json({
      message:
        "Failed to fetch contacts",
      error: error.message,
    });
  }
};

// UPDATE
const updateContact = async (
  req,
  res
) => {
  try {
    const contact =
      await EmergencyContact.findOneAndUpdate(
        {
          _id: req.params.id,
          user: req.user.id,
        },
        req.body,
        { new: true }
      );

    if (!contact) {
      return res.status(404).json({
        message: "Contact not found",
      });
    }

    res.status(200).json(contact);
  } catch (error) {
    res.status(500).json({
      message:
        "Failed to update contact",
      error: error.message,
    });
  }
};

// DELETE
const deleteContact = async (
  req,
  res
) => {
  try {
    const contact =
      await EmergencyContact.findOneAndDelete(
        {
          _id: req.params.id,
          user: req.user.id,
        }
      );

    if (!contact) {
      return res.status(404).json({
        message: "Contact not found",
      });
    }

    res.status(200).json({
      message:
        "Contact deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message:
        "Failed to delete contact",
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