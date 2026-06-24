const VITAL_RANGES = {
  blood_pressure: {
    unit: "mmHg",
    ranges: [
      { status: "low",        label: "Low",                systolicMax: 89,  diastolicMax: 59 },
      { status: "normal",     label: "Normal",             systolicMin: 90,  systolicMax: 119, diastolicMin: 60, diastolicMax: 79 },
      { status: "elevated",   label: "Elevated",           systolicMin: 120, systolicMax: 129, diastolicMax: 79 },
      { status: "high_stage1",label: "High (Stage 1)",     systolicMin: 130, systolicMax: 139, diastolicMin: 80, diastolicMax: 89 },
      { status: "high_stage2",label: "High (Stage 2)",     systolicMin: 140,                  diastolicMin: 90 },
    ],
    assess(systolic, diastolic) {
      let result = { status: "normal", label: "Normal" };
      if (systolic >= 140 || diastolic >= 90)
        result = { status: "high_stage2", label: "High (Stage 2)" };
      else if (systolic >= 130 || diastolic >= 80)
        result = { status: "high_stage1", label: "High (Stage 1)" };
      else if (systolic >= 120)
        result = { status: "elevated", label: "Elevated" };
      else if (systolic < 90 || diastolic < 60)
        result = { status: "low", label: "Low" };
      return { ...result, systolic, diastolic };
    },
  },

  blood_glucose: {
    unit: "mg/dL",
    ranges: [
      { status: "low",      label: "Low",                  max: 69 },
      { status: "normal",   label: "Normal",               min: 70,  max: 100 },
      { status: "elevated", label: "Elevated (Prediabetes)", min: 101, max: 126 },
      { status: "high",     label: "High (Diabetes)",       min: 126 },
    ],
    assess(value) {
      if (value > 126) return { status: "high", label: "High (Diabetes)", value };
      if (value > 100) return { status: "elevated", label: "Elevated (Prediabetes)", value };
      if (value < 70)  return { status: "low", label: "Low", value };
      return { status: "normal", label: "Normal", value };
    },
  },

  heart_rate: {
    unit: "bpm",
    ranges: [
      { status: "low",    label: "Low (Bradycardia)", max: 59 },
      { status: "normal", label: "Normal",            min: 60, max: 100 },
      { status: "high",   label: "High (Tachycardia)", min: 101 },
    ],
    assess(value) {
      if (value > 100) return { status: "high", label: "High (Tachycardia)", value };
      if (value < 60)  return { status: "low", label: "Low (Bradycardia)", value };
      return { status: "normal", label: "Normal", value };
    },
  },

  weight: {
    unit: "kg",
    ranges: [],
    assess(value) {
      return { status: "info", label: "Recorded", value };
    },
  },

  temperature: {
    unit: "°C",
    ranges: [
      { status: "low",    label: "Low (Hypothermia)", max: 36.0 },
      { status: "normal", label: "Normal",            min: 36.1, max: 37.2 },
      { status: "high",   label: "High (Fever)",      min: 37.3 },
    ],
    assess(value) {
      if (value > 37.2) return { status: "high", label: "High (Fever)", value };
      if (value < 36.1) return { status: "low", label: "Low (Hypothermia)", value };
      return { status: "normal", label: "Normal", value };
    },
  },

  oxygen_saturation: {
    unit: "%",
    ranges: [
      { status: "critical", label: "Critical (Severe Hypoxemia)", max: 89 },
      { status: "low",      label: "Low (Mild Hypoxemia)",        min: 90, max: 94 },
      { status: "normal",   label: "Normal",                      min: 95 },
    ],
    assess(value) {
      if (value < 90) return { status: "critical", label: "Critical (Severe Hypoxemia)", value };
      if (value < 95) return { status: "low", label: "Low (Mild Hypoxemia)", value };
      return { status: "normal", label: "Normal", value };
    },
  },
};

const evaluateVital = (type, value, secondaryValue) => {
  const config = VITAL_RANGES[type];
  if (!config) return { status: "info", label: "Unknown" };
  return config.assess(value, secondaryValue);
};

const getVitalRanges = (type) => {
  const config = VITAL_RANGES[type];
  if (!config) return null;
  return { unit: config.unit, ranges: config.ranges };
};

module.exports = { VITAL_RANGES, evaluateVital, getVitalRanges };
