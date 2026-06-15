const mongoose = require("mongoose");

const medicationSchema =
  new mongoose.Schema({
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    medicineName: String,

    dosage: String,

    frequency: String,

    startDate: Date,

    endDate: Date,
  });

module.exports = mongoose.model(
  "Medication",
  medicationSchema
);