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

    scheduleTimes: {
      type: [String],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: "At least one schedule time is required",
      },
    },

    gracePeriodMinutes: {
      type: Number,
      default: 60,
    },

    startDate: Date,

    endDate: Date,

  }, {
    timestamps: true,
  });

module.exports = mongoose.model(
  "Medication",
  medicationSchema
);