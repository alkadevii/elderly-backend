const Appointment = require("../models/Appointment");
const { getStaffUserFilter } = require("../utils/staffAccess");
const { createNotification } = require("./notificationController");
const recipientId = (ref) => (ref && (ref._id || ref)) || null;

const validateFutureDate = (appointmentDate) => {
  if (appointmentDate == null) {
    return { isValid: true };
  }

  const selectedDate = new Date(appointmentDate);
  if (isNaN(selectedDate.getTime())) {
    return { isValid: false, message: "Invalid appointment date" };
  }

  const now = new Date();
  if (selectedDate <= now) {
    return {
      isValid: false,
      message: "Appointment date must be a future date",
    };
  }

  return { isValid: true };
};

const createAppointment = async (req, res) => {
  try {
    const userId = req.user.role === "staff" ? req.body.userId : req.user.id;

    if (req.user.role === "staff") {
      const filter = await getStaffUserFilter(req.user.id, userId);
      if (!filter) {
        return res.status(403).json({
          message: "You are not assigned to this user",
        });
      }
    }

    const dateCheck = validateFutureDate(req.body.appointmentDate);
    if (!dateCheck.isValid) {
      return res.status(400).json({ message: dateCheck.message });
    }

    const isStaff = req.user.role === "staff";

    const { userId: _omitUserId, status: _omitStatus, ...rest } = req.body;

    const appointment = await Appointment.create({
      user: userId,
      status: isStaff ? "pending_confirmation" : "pending",
      ...(isStaff ? { proposedBy: req.user.id } : {}),
      ...rest,
    });

    res.status(201).json({
      message: isStaff
        ? "Appointment proposed to user - awaiting confirmation"
        : "Appointment request submitted for review",
      appointment,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create appointment",
      error: error.message,
    });
  }
};

const transitionPastAppointments = async (filter) => {
  const now = new Date();
  const pastScheduled = await Appointment.find({
    ...filter,
    status: "scheduled",
    appointmentDate: { $lt: now },
  });

  for (const apt of pastScheduled) {
    apt.status = "awaiting_feedback";
    apt.updatedAt = now;
    await apt.save();

    await createNotification({
      user: apt.user,
      title: "Appointment completed — share your feedback",
      message: `Your appointment with ${apt.doctorName || "your doctor"} on ${new Date(apt.appointmentDate).toLocaleDateString()} is done. Please add your visit notes so staff can close it.`,
      appointment: apt._id,
      status: "awaiting_feedback",
    });
  }
};

const getAppointments = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === "admin") {
      filter = {};
    } else if (req.user.role === "staff") {
      const staffFilter = await getStaffUserFilter(req.user.id, req.query.userId);
      if (!staffFilter) {
        return res.status(403).json({
          message: "You are not assigned to this user",
        });
      }
      filter = staffFilter;
    } else {
      filter = { user: req.user.id };
    }

    await transitionPastAppointments(filter);

    const appointments = await Appointment.find(filter)
      .populate("user", "name email phone")
      .populate("reviewedBy", "name email")
      .populate("proposedBy", "name email")
      .populate("finalizedBy", "name email")
      .populate("completedBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(appointments);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch appointments",
      error: error.message,
    });
  }
};

const updateAppointment = async (req, res) => {
  try {
    let filter;

    if (req.user.role === "admin") {
      filter = { _id: req.params.id };
    } else if (req.user.role === "staff") {
      const staffFilter = await getStaffUserFilter(req.user.id, null);
      if (!staffFilter || !staffFilter.user) {
        return res.status(403).json({
          message: "You have no assigned users",
        });
      }
      filter = { _id: req.params.id, ...staffFilter };
    } else {
      filter = { _id: req.params.id, user: req.user.id };
    }

    const dateCheck = validateFutureDate(req.body.appointmentDate);
    if (!dateCheck.isValid) {
      return res.status(400).json({ message: dateCheck.message });
    }

    const appointment = await Appointment.findOneAndUpdate(
      filter,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );

    if (!appointment) {
      return res.status(404).json({
        message: "Appointment not found",
      });
    }

    if (req.body.status && req.user.role !== "user") {
      const newStatus = req.body.status;
      await createNotification({
        user: recipientId(appointment.user),
        title: "Appointment updated",
        message: `Your appointment with ${appointment.doctorName || "your doctor"} is now ${newStatus}.`,
        appointment: appointment._id,
        status: newStatus,
      });
    }

    res.status(200).json(appointment);
  } catch (error) {
    res.status(500).json({
      message: "Failed to update appointment",
      error: error.message,
    });
  }
};

const deleteAppointment = async (req, res) => {
  try {
    let filter;

    if (req.user.role === "admin") {
      filter = { _id: req.params.id };
    } else if (req.user.role === "staff") {
      const staffFilter = await getStaffUserFilter(req.user.id, null);
      if (!staffFilter || !staffFilter.user) {
        return res.status(403).json({
          message: "You have no assigned users",
        });
      }
      filter = { _id: req.params.id, ...staffFilter };
    } else {
      filter = { _id: req.params.id, user: req.user.id };
    }

    const appointment = await Appointment.findOneAndDelete(filter);

    if (!appointment) {
      return res.status(404).json({
        message: "Appointment not found",
      });
    }

    res.status(200).json({
      message: "Appointment deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete appointment",
      error: error.message,
    });
  }
};

const reviewAppointment = async (req, res) => {
  try {
    if (req.user.role === "user") {
      return res.status(403).json({
        message: "Only admins and staff can review appointments",
      });
    }

    const { status, reviewNotes, tokenNumber } = req.body;

    if (!["scheduled", "rejected"].includes(status)) {
      return res.status(400).json({
        message: "Status must be 'scheduled' or 'rejected'",
      });
    }

    if (
      status === "scheduled" &&
      (tokenNumber == null || String(tokenNumber).trim() === "")
    ) {
      return res.status(400).json({
        message: "Token number is required to schedule the appointment",
      });
    }

    if (
      status === "rejected" &&
      (reviewNotes == null || String(reviewNotes).trim() === "")
    ) {
      return res.status(400).json({
        message: "Reason for rejection (reviewNotes) is required",
      });
    }

    let filter = { _id: req.params.id };

    if (req.user.role === "staff") {
      const staffFilter = await getStaffUserFilter(req.user.id, null);
      if (!staffFilter || !staffFilter.user) {
        return res.status(403).json({ message: "You have no assigned users" });
      }
      filter = { ...filter, ...staffFilter };
    }

    const update = {
      status,
      reviewNotes: reviewNotes || "",
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    };

    if (status === "scheduled") {
      update.tokenNumber = String(tokenNumber).trim();
    }

    const appointment = await Appointment.findOneAndUpdate(filter, update, {
      new: true,
    })
      .populate("user", "name email phone")
      .populate("reviewedBy", "name email")
      .populate("proposedBy", "name email");

    if (!appointment) {
      return res.status(404).json({
        message: "Appointment not found",
      });
    }

    await createNotification({
      user: recipientId(appointment.user),
      title:
        status === "scheduled"
          ? "Appointment scheduled"
          : "Appointment rejected",
      message:
        status === "scheduled"
          ? `Your appointment with ${appointment.doctorName || "your doctor"} has been scheduled.${appointment.tokenNumber ? ` Token: ${appointment.tokenNumber}.` : ""}`
          : `Your appointment with ${appointment.doctorName || "your doctor"} was rejected.`,
      appointment: appointment._id,
      status,
    });

    res.status(200).json({
      message:
        status === "scheduled"
          ? "Appointment scheduled"
          : "Appointment rejected",
      appointment,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to review appointment",
      error: error.message,
    });
  }
};

const confirmAppointment = async (req, res) => {
  try {
    const { status, confirmationNotes } = req.body;

    if (!["confirmed", "declined"].includes(status)) {
      return res.status(400).json({
        message: "Status must be 'confirmed' or 'declined'",
      });
    }

    // Only the patient who owns the appointment may confirm/decline it
    const filter = {
      _id: req.params.id,
      user: req.user.id,
      status: "pending_confirmation",
    };

    const newStatus = status === "confirmed" ? "user_confirmed" : "cancelled";

    const appointment = await Appointment.findOneAndUpdate(
      filter,
      {
        status: newStatus,
        confirmationNotes: confirmationNotes || "",
        confirmedAt: new Date(),
        updatedAt: new Date(),
      },
      { new: true }
    )
      .populate("user", "name email phone")
      .populate("reviewedBy", "name email")
      .populate("proposedBy", "name email");

    if (!appointment) {
      return res.status(404).json({
        message: "Appointment not found or not awaiting your confirmation",
      });
    }

    const staffRecipient = recipientId(appointment.proposedBy);
    if (staffRecipient) {
      const patientName = appointment.user?.name || "The patient";
      await createNotification({
        user: staffRecipient,
        title:
          newStatus === "user_confirmed"
            ? "Appointment confirmed by patient"
            : "Appointment declined by patient",
        message:
          newStatus === "user_confirmed"
            ? `${patientName} confirmed the proposed appointment with ${appointment.doctorName || "the doctor"}. Call the hospital to finalize.`
            : `${patientName} declined the proposed appointment with ${appointment.doctorName || "the doctor"}.`,
        appointment: appointment._id,
        status: newStatus,
      });
    }

    res.status(200).json({
      message:
        newStatus === "user_confirmed"
          ? "Appointment confirmed - staff will call the hospital to finalize"
          : "Appointment declined",
      appointment,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to confirm appointment",
      error: error.message,
    });
  }
};

const finalizeAppointment = async (req, res) => {  try {
    if (req.user.role === "user") {
      return res.status(403).json({
        message: "Only admins and staff can finalize appointments",
      });
    }

    const { tokenNumber, appointmentDate, finalNotes } = req.body;

    if (tokenNumber == null || String(tokenNumber).trim() === "") {
      return res.status(400).json({
        message: "Token number is required to finalize the appointment",
      });
    }

    const dateCheck = validateFutureDate(appointmentDate);
    if (!dateCheck.isValid) {
      return res.status(400).json({ message: dateCheck.message });
    }

    let filter = { _id: req.params.id, status: "user_confirmed" };

    if (req.user.role === "staff") {
      const staffFilter = await getStaffUserFilter(req.user.id, null);
      if (!staffFilter || !staffFilter.user) {
        return res.status(403).json({ message: "You have no assigned users" });
      }
      filter = { ...filter, ...staffFilter };
    }

    const update = {
      status: "scheduled",
      tokenNumber: String(tokenNumber).trim(),
      finalizedBy: req.user.id,
      finalizedAt: new Date(),
      updatedAt: new Date(),
    };

    if (finalNotes != null) update.finalNotes = finalNotes;
    if (appointmentDate != null) update.appointmentDate = appointmentDate;

    const appointment = await Appointment.findOneAndUpdate(filter, update, {
      new: true,
    })
      .populate("user", "name email phone")
      .populate("reviewedBy", "name email")
      .populate("proposedBy", "name email")
      .populate("finalizedBy", "name email");

    if (!appointment) {
      return res.status(404).json({
        message:
          "Appointment not found or not awaiting finalization (must be user_confirmed)",
      });
    }

    await createNotification({
      user: recipientId(appointment.user),
      title: "Appointment scheduled",
      message: `Your appointment with ${appointment.doctorName || "your doctor"} has been scheduled.${appointment.tokenNumber ? ` Token: ${appointment.tokenNumber}.` : ""}`,
      appointment: appointment._id,
      status: "scheduled",
    });

    res.status(200).json({
      message: "Appointment finalized and scheduled",
      appointment,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to finalize appointment",
      error: error.message,
    });
  }
};

const provideFeedback = async (req, res) => {
  try {
    const { feedbackNotes } = req.body;

    if (!feedbackNotes || String(feedbackNotes).trim() === "") {
      return res.status(400).json({ message: "Feedback notes are required" });
    }

    const appointment = await Appointment.findOne({
      _id: req.params.id,
      user: req.user.id,
      status: { $in: ["scheduled", "awaiting_feedback"] },
    });

    if (!appointment) {
      return res.status(404).json({
        message: "Appointment not found or not eligible for feedback",
      });
    }

    if (appointment.status === "scheduled" && new Date() < new Date(appointment.appointmentDate)) {
      return res.status(400).json({
        message: "Appointment has not yet occurred. You can provide feedback after the appointment time.",
      });
    }

    const now = new Date();

    if (appointment.status === "scheduled") {
      appointment.status = "awaiting_feedback";
    }

    appointment.status = "feedback_provided";
    appointment.feedbackNotes = String(feedbackNotes).trim();
    appointment.feedbackProvidedAt = now;
    appointment.updatedAt = now;
    await appointment.save();

    const staffRecipient = recipientId(appointment.finalizedBy || appointment.proposedBy);
    if (staffRecipient) {
      const patientName = appointment.user?.name || "The patient";
      await createNotification({
        user: staffRecipient,
        title: "Patient feedback received",
        message: `${patientName} has submitted post-appointment notes for their visit with ${appointment.doctorName || "the doctor"}. You can now close the appointment.`,
        appointment: appointment._id,
        status: "feedback_provided",
      });
    }

    res.status(200).json({
      message: "Feedback submitted successfully. Staff can now close the appointment.",
      appointment,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to submit feedback",
      error: error.message,
    });
  }
};

const closeAppointment = async (req, res) => {
  try {
    if (req.user.role === "user") {
      return res.status(403).json({ message: "Only staff and admins can close appointments" });
    }

    const filter = { _id: req.params.id, status: "feedback_provided" };
    let staffFilter;

    if (req.user.role === "staff") {
      staffFilter = await getStaffUserFilter(req.user.id, null);
      if (!staffFilter || !staffFilter.user) {
        return res.status(403).json({ message: "You have no assigned users" });
      }
    }

    const finalFilter = staffFilter ? { ...filter, ...staffFilter } : filter;

    const appointment = await Appointment.findOneAndUpdate(
      finalFilter,
      {
        status: "completed",
        completedBy: req.user.id,
        completedAt: new Date(),
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!appointment) {
      return res.status(404).json({
        message: "Appointment not found or not awaiting closure (must be feedback_provided)",
      });
    }

    await createNotification({
      user: recipientId(appointment.user),
      title: "Appointment closed",
      message: `Your appointment with ${appointment.doctorName || "your doctor"} has been closed. Thank you for your feedback.`,
      appointment: appointment._id,
      status: "completed",
    });

    res.status(200).json({
      message: "Appointment closed successfully",
      appointment,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to close appointment",
      error: error.message,
    });
  }
};

const cancelAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      user: req.user.id,
      status: { $in: ["scheduled", "pending", "user_confirmed", "pending_confirmation"] },
    });

    if (!appointment) {
      return res.status(404).json({
        message: "Appointment not found or cannot be cancelled",
      });
    }

    if (!appointment.appointmentDate) {
      return res.status(400).json({ message: "Cannot cancel an appointment without a scheduled date" });
    }

    const hoursUntilAppointment = (new Date(appointment.appointmentDate) - new Date()) / (1000 * 60 * 60);

    if (hoursUntilAppointment < 24) {
      return res.status(400).json({
        message: "Cancellation must be made at least 24 hours before the appointment time.",
      });
    }

    const previousStatus = appointment.status;
    const now = new Date();
    appointment.status = "cancellation_requested";
    appointment.previousStatus = previousStatus;
    appointment.cancelledBy = "user";
    appointment.updatedAt = now;
    await appointment.save();

    const staffRecipient = recipientId(appointment.finalizedBy || appointment.proposedBy);
    if (staffRecipient) {
      const patientName = appointment.user?.name || "The patient";
      await createNotification({
        user: staffRecipient,
        title: "Cancellation requested by patient",
        message: `${patientName} requested to cancel their appointment with ${appointment.doctorName || "the doctor"} on ${new Date(appointment.appointmentDate).toLocaleDateString()}. Please review and approve or reject.`,
        appointment: appointment._id,
        status: "cancellation_requested",
      });
    }

    res.status(200).json({
      message: "Cancellation request submitted. Awaiting staff approval.",
      appointment,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to cancel appointment",
      error: error.message,
    });
  }
};

const approveCancellationRequest = async (req, res) => {
  try {
    if (req.user.role === "user") {
      return res.status(403).json({ message: "Only staff and admins can approve cancellation requests" });
    }

    const filter = { _id: req.params.id, status: "cancellation_requested" };
    let staffFilter;

    if (req.user.role === "staff") {
      staffFilter = await getStaffUserFilter(req.user.id, null);
      if (!staffFilter || !staffFilter.user) {
        return res.status(403).json({ message: "You have no assigned users" });
      }
    }

    const finalFilter = staffFilter ? { ...filter, ...staffFilter } : filter;

    const appointment = await Appointment.findOneAndUpdate(
      finalFilter,
      {
        status: "cancelled",
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!appointment) {
      return res.status(404).json({
        message: "Cancellation request not found",
      });
    }

    await createNotification({
      user: recipientId(appointment.user),
      title: "Cancellation approved",
      message: `Your request to cancel the appointment with ${appointment.doctorName || "your doctor"} on ${new Date(appointment.appointmentDate).toLocaleDateString()} has been approved.`,
      appointment: appointment._id,
      status: "cancelled",
    });

    res.status(200).json({
      message: "Cancellation approved. Appointment cancelled.",
      appointment,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to approve cancellation",
      error: error.message,
    });
  }
};

const rejectCancellationRequest = async (req, res) => {
  try {
    if (req.user.role === "user") {
      return res.status(403).json({ message: "Only staff and admins can reject cancellation requests" });
    }

    const filter = { _id: req.params.id, status: "cancellation_requested" };
    let staffFilter;

    if (req.user.role === "staff") {
      staffFilter = await getStaffUserFilter(req.user.id, null);
      if (!staffFilter || !staffFilter.user) {
        return res.status(403).json({ message: "You have no assigned users" });
      }
    }

    const finalFilter = staffFilter ? { ...filter, ...staffFilter } : filter;

    const appointment = await Appointment.findOne(finalFilter);

    if (!appointment) {
      return res.status(404).json({
        message: "Cancellation request not found",
      });
    }

    const restoredStatus = appointment.previousStatus || "scheduled";
    appointment.status = restoredStatus;
    appointment.previousStatus = null;
    appointment.updatedAt = new Date();
    await appointment.save();

    await createNotification({
      user: recipientId(appointment.user),
      title: "Cancellation rejected",
      message: `Your request to cancel the appointment with ${appointment.doctorName || "your doctor"} on ${new Date(appointment.appointmentDate).toLocaleDateString()} was not approved. Please contact your staff for details.`,
      appointment: appointment._id,
      status: restoredStatus,
    });

    res.status(200).json({
      message: "Cancellation rejected. Appointment restored to previous status.",
      appointment,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to reject cancellation",
      error: error.message,
    });
  }
};

module.exports = {
  createAppointment,
  getAppointments,
  updateAppointment,
  deleteAppointment,
  reviewAppointment,
  confirmAppointment,
  finalizeAppointment,
  provideFeedback,
  closeAppointment,
  cancelAppointment,
  approveCancellationRequest,
  rejectCancellationRequest,
};
