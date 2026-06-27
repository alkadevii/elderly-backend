const User = require("../models/User");
const Appointment = require("../models/Appointment");
const AuditLog = require("../models/AuditLog");

const getAssignedUserIds = async (staffId) => {
  const users = await User.find({ assignedStaff: staffId }).select("_id");
  return users.map((u) => u._id);
};

const getDashboard = async (req, res) => {
  try {
    if (req.user.role !== "staff") {
      return res.status(403).json({ message: "Staff access required" });
    }

    const userIds = await getAssignedUserIds(req.user.id);
    const today = new Date().toISOString().split("T")[0];

    const appointments = await Appointment.find({ user: { $in: userIds } });
    const totalAppointments = appointments.length;
    const completed = appointments.filter((a) => a.status === "completed").length;
    const feedbackProvided = appointments.filter((a) => a.status === "feedback_provided").length;
    const awaitingFeedback = appointments.filter((a) => a.status === "awaiting_feedback").length;
    const scheduled = appointments.filter((a) => a.status === "scheduled").length;
    const pendingConfirm = appointments.filter((a) => a.status === "pending_confirmation").length;
    const pending = appointments.filter((a) => a.status === "pending").length;
    const userConfirmed = appointments.filter((a) => a.status === "user_confirmed").length;
    const cancelled = appointments.filter((a) => a.status === "cancelled").length;
    const rejected = appointments.filter((a) => a.status === "rejected").length;
    const cancellationRequested = appointments.filter((a) => a.status === "cancellation_requested").length;
    const resolved = completed + feedbackProvided + awaitingFeedback;
    const nonCancelled = totalAppointments - cancelled - rejected;

    const todayAppointments = await Appointment.find({
      user: { $in: userIds },
      appointmentDate: {
        $gte: new Date(`${today}T00:00:00.000Z`),
        $lte: new Date(`${today}T23:59:59.999Z`),
      },
    }).populate("user", "name email phone").sort({ appointmentDate: 1 });

    const users = await User.find({ _id: { $in: userIds } })
      .select("-password")
      .sort({ name: 1 });

    const myAppointments = await Appointment.find({
      $or: [
        { proposedBy: req.user.id },
        { reviewedBy: req.user.id },
        { finalizedBy: req.user.id },
        { completedBy: req.user.id },
      ],
    });

    const proposed = myAppointments.filter((a) => a.proposedBy?.toString() === req.user.id).length;
    const reviewed = myAppointments.filter((a) => a.reviewedBy?.toString() === req.user.id).length;
    const finalized = myAppointments.filter((a) => a.finalizedBy?.toString() === req.user.id).length;
    const closed = myAppointments.filter((a) => a.completedBy?.toString() === req.user.id).length;

    const recentActivity = await AuditLog.find({ actor: req.user.id })
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({
      assignedUsers: {
        total: users.length,
        list: users.map((u) => ({
          _id: u._id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          gender: u.gender,
          bloodGroup: u.bloodGroup,
          verificationStatus: u.verificationStatus,
          profileCompleted: u.profileCompleted,
          dateOfBirth: u.dateOfBirth,
        })),
      },
      appointmentStats: {
        total: totalAppointments,
        completed,
        feedbackProvided,
        awaitingFeedback,
        scheduled,
        pendingConfirmation: pendingConfirm,
        pending,
        userConfirmed,
        cancelled,
        rejected,
        cancellationRequested,
        resolved,
        nonCancelled,
        resolutionRate: nonCancelled > 0 ? Math.round((resolved / nonCancelled) * 100) : 0,
      },
      pendingActions: {
        pendingReview: pending + pendingConfirm + userConfirmed,
        awaitingFeedback,
        feedbackToClose: feedbackProvided,
        cancellationRequests: cancellationRequested,
      },
      todaySchedule: {
        date: today,
        appointments: todayAppointments,
        total: todayAppointments.length,
      },
      myActivity: {
        appointmentsProposed: proposed,
        appointmentsReviewed: reviewed,
        appointmentsFinalized: finalized,
        appointmentsClosed: closed,
        totalActions: proposed + reviewed + finalized + closed,
      },
      recentActivity,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch staff dashboard",
      error: error.message,
    });
  }
};

const getPerformance = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const staffMembers = await User.find({ role: "staff" })
      .select("-password")
      .sort({ name: 1 });

    const performance = [];
    let grandTotal = 0;
    let grandCompleted = 0;
    let grandCancelled = 0;
    let grandRejected = 0;

    for (const staff of staffMembers) {
      const userIds = await getAssignedUserIds(staff._id);

      const appointments = await Appointment.find({ user: { $in: userIds } });
      const total = appointments.length;
      const completed = appointments.filter((a) => a.status === "completed").length;
      const feedbackProvided = appointments.filter((a) => a.status === "feedback_provided").length;
      const awaitingFeedback = appointments.filter((a) => a.status === "awaiting_feedback").length;
      const scheduled = appointments.filter((a) => a.status === "scheduled").length;
      const pendingConfirm = appointments.filter((a) => a.status === "pending_confirmation").length;
      const pending = appointments.filter((a) => a.status === "pending").length;
      const userConfirmed = appointments.filter((a) => a.status === "user_confirmed").length;
      const cancelled = appointments.filter((a) => a.status === "cancelled").length;
      const rejected = appointments.filter((a) => a.status === "rejected").length;
      const cancellationRequested = appointments.filter((a) => a.status === "cancellation_requested").length;
      const resolved = completed + feedbackProvided + awaitingFeedback;
      const nonCancelled = total - cancelled - rejected;

      grandTotal += total;
      grandCompleted += resolved;
      grandCancelled += cancelled;
      grandRejected += rejected;

      performance.push({
        staff: {
          _id: staff._id,
          name: staff.name,
          email: staff.email,
          phone: staff.phone,
        },
        assignedUsers: userIds.length,
        appointments: {
          total,
          completed: resolved,
          scheduled,
          pendingConfirmation: pendingConfirm,
          pending,
          userConfirmed,
          cancelled,
          rejected,
          cancellationRequested,
          resolutionRate: nonCancelled > 0 ? Math.round((resolved / nonCancelled) * 100) : 0,
        },
      });
    }

    const grandNonCancelled = grandTotal - grandCancelled - grandRejected;

    res.status(200).json({
      summary: {
        totalStaff: staffMembers.length,
        totalAppointments: grandTotal,
        totalCompleted: grandCompleted,
        totalCancelled: grandCancelled,
        totalRejected: grandRejected,
        overallResolutionRate: grandNonCancelled > 0
          ? Math.round((grandCompleted / grandNonCancelled) * 100) : 0,
      },
      staffPerformance: performance,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch staff performance",
      error: error.message,
    });
  }
};

module.exports = { getDashboard, getPerformance };
