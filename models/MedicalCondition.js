const mongoose = require("mongoose");

const medicalConditionSchema =
  new mongoose.Schema({
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    condition: String,

    diagnosedDate: Date,

    notes: String,
  });

module.exports = mongoose.model(
  "MedicalCondition",
  medicalConditionSchema
);