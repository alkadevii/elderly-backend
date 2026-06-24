const PDFDocument = require("pdfkit");

const User = require("../models/User");
const Appointment = require("../models/Appointment");
const MedicalCondition = require("../models/MedicalCondition");
const Medication = require("../models/Medication");
const Vital = require("../models/Vital");
const { VITAL_TYPES } = require("../models/Vital");
const { getStaffUserFilter } = require("../utils/staffAccess");
const { evaluateVital } = require("../utils/vitalRanges");

const csvEscape = (val) => {
  if (val == null) return "";
  const s = String(val);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

const rowsToCsv = (headers, rows) => {
  const head = headers.map((h) => csvEscape(h)).join(",");
  const body = rows
    .map((r) => headers.map((h) => csvEscape(r[h])).join(","))
    .join("\n");
  return `${head}\n${body}`;
};

const resolveExportUser = async (req) => {
  if (req.user.role === "user") {
    return req.user.id;
  }
  if (req.user.role === "staff") {
    const userId = req.query.userId;
    if (!userId) return null;
    const filter = await getStaffUserFilter(req.user.id, userId);
    if (!filter) return null;
    return userId;
  }
  // admin
  return req.query.userId || req.user.id;
};

const buildSummary = async (targetUserId) => {
  const user = await User.findById(targetUserId)
    .select("-password")
    .populate("assignedStaff", "name email phone");

  if (!user) return null;

  const [appointments, conditions, medications] = await Promise.all([
    Appointment.find({ user: targetUserId })
      .populate("reviewedBy", "name email")
      .populate("proposedBy", "name email")
      .populate("finalizedBy", "name email")
      .sort({ appointmentDate: -1 }),
    MedicalCondition.find({ user: targetUserId }).sort({ diagnosedDate: -1 }),
    Medication.find({ user: targetUserId }).sort({ createdAt: -1 }),
  ]);

  const vitalsAll = await Vital.find({ user: targetUserId }).sort({ recordedAt: -1 }).limit(500);

  const vitalsByType = {};
  for (const type of VITAL_TYPES) {
    const docs = vitalsAll
      .filter((v) => v.type === type)
      .sort((a, b) => new Date(a.recordedAt) - new Date(b.recordedAt));
    if (docs.length === 0) {
      vitalsByType[type] = { unit: "", count: 0, latest: null, series: [] };
      continue;
    }
    const values = docs.map((d) => d.value);
      const lastDoc = docs[docs.length - 1];
      const latestAssessment = evaluateVital(type, lastDoc.value, lastDoc.secondaryValue);

      vitalsByType[type] = {
        unit: lastDoc.unit,
        count: docs.length,
        min: Math.min(...values),
        max: Math.max(...values),
        avg: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100,
        latest: {
          value: lastDoc.value,
          secondaryValue: lastDoc.secondaryValue,
          recordedAt: lastDoc.recordedAt,
          assessment: latestAssessment,
        },
        series: docs.slice(-20).map((d) => {
          const dAssessment = evaluateVital(type, d.value, d.secondaryValue);
          return {
            value: d.value,
            secondaryValue: d.secondaryValue,
            recordedAt: d.recordedAt,
            assessment: dAssessment,
          };
        }),
      };
  }

  return {
    generatedAt: new Date(),
    user,
    appointments,
    conditions,
    medications,
    vitals: vitalsByType,
  };
};

const exportSummaryJson = (summary, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="health-summary-${summary.user._id}.json"`
  );
  res.status(200).json(summary);
};

const exportSummaryCsv = (summary, res) => {
  const sections = [];

  sections.push("HEALTH SUMMARY");
  sections.push(`Generated,${csvEscape(summary.generatedAt.toISOString())}`);
  sections.push(
    `Patient,${csvEscape(summary.user.name)},Email,${csvEscape(summary.user.email)},Phone,${csvEscape(summary.user.phone || "")}`
  );
  if (summary.user.dateOfBirth) {
    sections.push(`Date of Birth,${csvEscape(summary.user.dateOfBirth.toISOString().slice(0, 10))}`);
  }
  sections.push(`Blood Group,${csvEscape(summary.user.bloodGroup || "")}`);
  sections.push("");

  sections.push("APPOINTMENTS");
  sections.push(
    rowsToCsv(
      ["Date", "Status", "Doctor", "Hospital", "Reason", "Token", "Notes"],
      summary.appointments.map((a) => ({
        Date: a.appointmentDate ? new Date(a.appointmentDate).toLocaleString() : "",
        Status: a.status,
        Doctor: a.doctorName || "",
        Hospital: a.hospital || "",
        Reason: a.reason || "",
        Token: a.tokenNumber || "",
        Notes: a.reviewNotes || a.finalNotes || "",
      }))
    )
  );
  sections.push("");

  sections.push("MEDICAL CONDITIONS");
  sections.push(
    rowsToCsv(
      ["Condition", "Diagnosed Date", "Notes"],
      summary.conditions.map((c) => ({
        Condition: c.condition,
        "Diagnosed Date": c.diagnosedDate ? new Date(c.diagnosedDate).toISOString().slice(0, 10) : "",
        Notes: c.notes || "",
      }))
    )
  );
  sections.push("");

  sections.push("MEDICATIONS");
  sections.push(
    rowsToCsv(
      ["Medicine", "Dosage", "Frequency", "Schedule", "Start", "End"],
      summary.medications.map((m) => ({
        Medicine: m.medicineName || "",
        Dosage: m.dosage || "",
        Frequency: m.frequency || "",
        Schedule: (m.scheduleTimes || []).join(" "),
        Start: m.startDate ? new Date(m.startDate).toISOString().slice(0, 10) : "",
        End: m.endDate ? new Date(m.endDate).toISOString().slice(0, 10) : "",
      }))
    )
  );
  sections.push("");

  sections.push("VITALS SUMMARY");
  const vitalRows = Object.entries(summary.vitals).map(([type, v]) => ({
    Type: type,
    Unit: v.unit || "",
    Count: v.count,
    Min: v.min ?? "",
    Max: v.max ?? "",
    Avg: v.avg ?? "",
    Latest: v.latest ? v.latest.value : "",
    "Latest At": v.latest ? new Date(v.latest.recordedAt).toLocaleString() : "",
  }));
  sections.push(rowsToCsv(["Type", "Unit", "Count", "Min", "Max", "Avg", "Latest", "Latest At"], vitalRows));
  sections.push("");

  const csv = sections.join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="health-summary-${summary.user._id}.csv"`
  );
  res.status(200).send(csv);
};

const exportSummaryPdf = (summary, res) => {
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="health-summary-${summary.user._id}.pdf"`
  );
  doc.pipe(res);

  const u = summary.user;
  const sectionTitle = (title) => {
    doc.moveDown(0.5).fontSize(14).fillColor("#1a3a5c").text(title, { underline: true });
    doc.fillColor("black").fontSize(10).moveDown(0.3);
  };

  doc.fontSize(22).fillColor("#1a3a5c").text("Health Summary", { align: "center" });
  doc.moveDown(0.3);
  doc
    .fontSize(10)
    .fillColor("gray")
    .text(`Generated: ${summary.generatedAt.toLocaleString()}`, { align: "center" });
  doc.moveDown(1);

  sectionTitle("Patient Information");
  doc.fontSize(11).fillColor("black");
  doc.text(`Name: ${u.name}`);
  doc.text(`Email: ${u.email}`);
  if (u.phone) doc.text(`Phone: ${u.phone}`);
  if (u.dateOfBirth) doc.text(`Date of Birth: ${new Date(u.dateOfBirth).toLocaleDateString()}`);
  if (u.bloodGroup) doc.text(`Blood Group: ${u.bloodGroup}`);
  if (u.gender) doc.text(`Gender: ${u.gender}`);
  if (u.address) doc.text(`Address: ${u.address}`);
  if (u.assignedStaff) doc.text(`Assigned Staff: ${u.assignedStaff.name} (${u.assignedStaff.email})`);

  sectionTitle(`Appointments (${summary.appointments.length})`);
  if (summary.appointments.length === 0) {
    doc.text("No appointments recorded.");
  } else {
    summary.appointments.slice(0, 15).forEach((a) => {
      doc.text(
        `${a.appointmentDate ? new Date(a.appointmentDate).toLocaleDateString() : "—"}  ` +
          `[${a.status}]  ${a.doctorName || ""} - ${a.hospital || ""}` +
          (a.tokenNumber ? `  Token: ${a.tokenNumber}` : ""),
        { indent: 10 }
      );
    });
  }

  sectionTitle(`Medical Conditions (${summary.conditions.length})`);
  if (summary.conditions.length === 0) {
    doc.text("No conditions recorded.");
  } else {
    summary.conditions.forEach((c) => {
      doc.text(
        `${c.condition}${c.diagnosedDate ? ` (diagnosed ${new Date(c.diagnosedDate).toLocaleDateString()})` : ""}`,
        { indent: 10 }
      );
    });
  }

  sectionTitle(`Medications (${summary.medications.length})`);
  if (summary.medications.length === 0) {
    doc.text("No medications recorded.");
  } else {
    summary.medications.forEach((m) => {
      doc.text(
        `${m.medicineName || ""} - ${m.dosage || ""} - ${m.frequency || ""}` +
          (m.scheduleTimes?.length ? ` (${m.scheduleTimes.join(", ")})` : ""),
        { indent: 10 }
      );
    });
  }

  sectionTitle("Vitals Summary");
  const vitalEntries = Object.entries(summary.vitals).filter(([, v]) => v.count > 0);
  if (vitalEntries.length === 0) {
    doc.text("No vitals recorded.");
  } else {
    vitalEntries.forEach(([type, v]) => {
      const bp =
        type === "blood_pressure" && v.latest
          ? `${v.latest.value}/${v.latest.secondaryValue}`
          : v.latest
          ? v.latest.value
          : "—";
      doc.text(
        `${type}: latest ${bp} ${v.unit}  |  min ${v.min ?? "—"} max ${v.max ?? "—"} avg ${v.avg ?? "—"} (${v.count} readings)`,
        { indent: 10 }
      );
    });
  }

  doc.end();
};

const exportHealthSummary = async (req, res) => {
  try {
    const targetUserId = await resolveExportUser(req);
    if (!targetUserId) {
      return res.status(403).json({ message: "You are not assigned to this user" });
    }

    const summary = await buildSummary(targetUserId);
    if (!summary) {
      return res.status(404).json({ message: "User not found" });
    }

    const format = (req.query.format || "json").toLowerCase();

    if (format === "csv") return exportSummaryCsv(summary, res);
    if (format === "pdf") return exportSummaryPdf(summary, res);
    return exportSummaryJson(summary, res);
  } catch (error) {
    res.status(500).json({
      message: "Failed to export health summary",
      error: error.message,
    });
  }
};

module.exports = { exportHealthSummary };
