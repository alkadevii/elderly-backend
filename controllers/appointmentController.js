const Appointment = require(
  "../models/Appointment"
);

const createAppointment =
  async (req, res) => {
    try {
      const appointment =
        await Appointment.create({
          user: req.user.id,
          ...req.body,
        });

      res.status(201).json({
        message:
          "Appointment scheduled",
        appointment,
      });
    } catch (error) {
      res.status(500).json({
        message:
          "Failed to create appointment",
        error: error.message,
      });
    }
  };

const getAppointments =
  async (req, res) => {
    try {
      const appointments =
        await Appointment.find({
          user: req.user.id,
        }).sort({
          appointmentDate: 1,
        });

      res.status(200).json(
        appointments
      );
    } catch (error) {
      res.status(500).json({
        message:
          "Failed to fetch appointments",
        error: error.message,
      });
    }
  };

const updateAppointment =
  async (req, res) => {
    try {
      const appointment =
        await Appointment.findOneAndUpdate(
          {
            _id: req.params.id,
            user: req.user.id,
          },
          req.body,
          { new: true }
        );

      if (!appointment) {
        return res.status(404).json({
          message:
            "Appointment not found",
        });
      }

      res.status(200).json(
        appointment
      );
    } catch (error) {
      res.status(500).json({
        message:
          "Failed to update appointment",
        error: error.message,
      });
    }
  };

const deleteAppointment =
  async (req, res) => {
    try {
      const appointment =
        await Appointment.findOneAndDelete(
          {
            _id: req.params.id,
            user: req.user.id,
          }
        );

      if (!appointment) {
        return res.status(404).json({
          message:
            "Appointment not found",
        });
      }

      res.status(200).json({
        message:
          "Appointment deleted successfully",
      });
    } catch (error) {
      res.status(500).json({
        message:
          "Failed to delete appointment",
        error: error.message,
      });
    }
  };

module.exports = {
  createAppointment,
  getAppointments,
  updateAppointment,
  deleteAppointment,
};