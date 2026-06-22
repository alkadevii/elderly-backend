const Hospital = require("../models/Hospital");

const getHospitals = async (req, res) => {
  try {
    const { all } = req.query;
    const filter = all === "true" ? {} : { isActive: true };
    const hospitals = await Hospital.find(filter).sort({ name: 1 });
    res.status(200).json(hospitals);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch hospitals",
      error: error.message,
    });
  }
};

const createHospital = async (req, res) => {
  try {
    const hospital = await Hospital.create(req.body);
    res.status(201).json({
      message: "Hospital added successfully",
      hospital,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to add hospital",
      error: error.message,
    });
  }
};

const updateHospital = async (req, res) => {
  try {
    const hospital = await Hospital.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!hospital) {
      return res.status(404).json({ message: "Hospital not found" });
    }

    res.status(200).json({
      message: "Hospital updated successfully",
      hospital,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update hospital",
      error: error.message,
    });
  }
};

const deleteHospital = async (req, res) => {
  try {
    const hospital = await Hospital.findByIdAndDelete(req.params.id);

    if (!hospital) {
      return res.status(404).json({ message: "Hospital not found" });
    }

    res.status(200).json({ message: "Hospital deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete hospital",
      error: error.message,
    });
  }
};

const seedHospitals = async (req, res) => {
  try {
    const count = await Hospital.countDocuments();
    if (count > 0) {
      return res.status(200).json({ message: "Hospitals already seeded", count });
    }

    const hospitals = await Hospital.insertMany([
      {
        name: "City General Hospital",
        address: "123 Main Street, Downtown",
        phone: "555-0100",
        email: "info@citygeneral.com",
        isActive: true,
      },
      {
        name: "Sunrise Senior Care Center",
        address: "456 Oak Avenue, Westside",
        phone: "555-0200",
        email: "care@sunrisesenior.com",
        isActive: true,
      },
      {
        name: "Green Valley Medical Center",
        address: "789 Elm Road, Eastside",
        phone: "555-0300",
        email: "contact@greenvalley.com",
        isActive: true,
      },
      {
        name: "Lakeside Community Hospital",
        address: "321 Lake Drive, Northside",
        phone: "555-0400",
        email: "info@lakesidehospital.com",
        isActive: true,
      },
      {
        name: "Pinewood Nursing Home & Rehab",
        address: "654 Pine Street, Southside",
        phone: "555-0500",
        email: "help@pinewoodrehab.com",
        isActive: true,
      },
    ]);

    res.status(201).json({
      message: "Hospitals seeded successfully",
      hospitals,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to seed hospitals",
      error: error.message,
    });
  }
};

module.exports = {
  getHospitals,
  createHospital,
  updateHospital,
  deleteHospital,
  seedHospitals,
};
