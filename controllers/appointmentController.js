const Appointment = require("../models/Appointment");
const { getStaffUserFilter } = require("../utils/staffAccess");

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

    const appointments = await Appointment.find(filter)
      .populate("user", "name email phone")
      .populate("reviewedBy", "name email")
      .populate("proposedBy", "name email")
      .populate("finalizedBy", "name email")
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

    const appointment = await Appointment.findOneAndUpdate(filter, req.body, {
      new: true,
    });

    if (!appointment) {
      return res.status(404).json({
        message: "Appointment not found",
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

    const { status, reviewNotes } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        message: "Status must be 'approved' or 'rejected'",
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

    const appointment = await Appointment.findOneAndUpdate(
      filter,
      {
        status,
        reviewNotes: reviewNotes || "",
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
      },
      { new: true }
    )
      .populate("user", "name email phone")
      .populate("reviewedBy", "name email")
      .populate("proposedBy", "name email");

    if (!appointment) {
      return res.status(404).json({
        message: "Appointment not found",
      });
    }

    res.status(200).json({
      message:
        status === "approved" ? "Appointment approved" : "Appointment rejected",
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

const finalizeAppointment = async (req, res) => {
  try {
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

module.exports = {
  createAppointment,
  getAppointments,
  updateAppointment,
  deleteAppointment,
  reviewAppointment,
  confirmAppointment,
  finalizeAppointment,
};
