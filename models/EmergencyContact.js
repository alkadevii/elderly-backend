const mongoose = require("mongoose");

const emergencyContactSchema =
  new mongoose.Schema({
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    name: String,

    relationship: String,

    phone: String,

    email: String,
  });

module.exports = mongoose.model(
  "EmergencyContact",
  emergencyContactSchema
);