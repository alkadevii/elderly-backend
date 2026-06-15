const mongoose = require("mongoose");

const medicalDocumentSchema =
  new mongoose.Schema({
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: String,

    fileUrl: String,

    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  });

module.exports = mongoose.model(
  "MedicalDocument",
  medicalDocumentSchema
);