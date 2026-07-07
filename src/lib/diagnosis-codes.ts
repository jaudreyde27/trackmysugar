// Human-readable names for the ICD-10-CM diabetes mellitus codes this
// practice is likely to enter as a patient's primary diagnosis. Not
// exhaustive — unrecognized codes just render without a name underneath.
const DIABETES_ICD10_NAMES: Record<string, string> = {
  "E10.9": "Type 1 diabetes mellitus without complications",
  "E10.65": "Type 1 diabetes mellitus with hyperglycemia",
  "E10.10": "Type 1 diabetes mellitus with ketoacidosis without coma",
  "E10.21": "Type 1 diabetes mellitus with diabetic nephropathy",
  "E10.40": "Type 1 diabetes mellitus with diabetic neuropathy, unspecified",
  "E10.641": "Type 1 diabetes mellitus with hypoglycemia with coma",
  "E11.9": "Type 2 diabetes mellitus without complications",
  "E11.65": "Type 2 diabetes mellitus with hyperglycemia",
  "E11.21": "Type 2 diabetes mellitus with diabetic nephropathy",
  "E11.22": "Type 2 diabetes mellitus with diabetic chronic kidney disease",
  "E11.40": "Type 2 diabetes mellitus with diabetic neuropathy, unspecified",
  "E11.319": "Type 2 diabetes mellitus with unspecified diabetic retinopathy",
  "E13.9": "Other specified diabetes mellitus without complications",
  "E09.9": "Drug or chemical induced diabetes mellitus without complications",
};

export function getDiagnosisName(icd10Code: string): string | null {
  return DIABETES_ICD10_NAMES[icd10Code] ?? null;
}
