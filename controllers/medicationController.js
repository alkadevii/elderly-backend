const Medication = require(
  "../models/Medication"
);

const addMedication = async (
  req,
  res
) => {
  try {
    const medication =
      await Medication.create({
        user: req.user.id,
        ...req.body,
      });

    res.status(201).json({
      message:
        "Medication added successfully",
      medication,
    });
  } catch (error) {
    res.status(500).json({
      message:
        "Failed to add medication",
      error: error.message,
    });
  }
};

const getMedications =
  async (req, res) => {
    try {
      const medications =
        await Medication.find({
          user: req.user.id,
        });

      res.status(200).json(
        medications
      );
    } catch (error) {
      res.status(500).json({
        message:
          "Failed to fetch medications",
        error: error.message,
      });
    }
  };

const updateMedication =
  async (req, res) => {
    try {
      const medication =
        await Medication.findOneAndUpdate(
          {
            _id: req.params.id,
            user: req.user.id,
          },
          req.body,
          { new: true }
        );

      if (!medication) {
        return res.status(404).json({
          message:
            "Medication not found",
        });
      }

      res.status(200).json(
        medication
      );
    } catch (error) {
      res.status(500).json({
        message:
          "Failed to update medication",
        error: error.message,
      });
    }
  };

const deleteMedication =
  async (req, res) => {
    try {
      const medication =
        await Medication.findOneAndDelete(
          {
            _id: req.params.id,
            user: req.user.id,
          }
        );

      if (!medication) {
        return res.status(404).json({
          message:
            "Medication not found",
        });
      }

      res.status(200).json({
        message:
          "Medication deleted successfully",
      });
    } catch (error) {
      res.status(500).json({
        message:
          "Failed to delete medication",
        error: error.message,
      });
    }
  };

module.exports = {
  addMedication,
  getMedications,
  updateMedication,
  deleteMedication,
};