const mongoose = require("mongoose");

const VITAL_TYPES = [
  "blood_pressure",
  "blood_glucose",
  "heart_rate",
  "weight",
  "temperature",
  "oxygen_saturation",
];

const vitalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: VITAL_TYPES,
      required: true,
    },

    value: {
      type: Number,
      required: true,
    },

    secondaryValue: {
      type: Number,
      default: null,
    },

    unit: {
      type: String,
      default: "",
    },

    recordedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    notes: {
      type: String,
      default: "",
    },

    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

vitalSchema.index({ user: 1, type: 1, recordedAt: -1 });

module.exports = mongoose.model("Vital", vitalSchema);
module.exports.VITAL_TYPES = VITAL_TYPES;
