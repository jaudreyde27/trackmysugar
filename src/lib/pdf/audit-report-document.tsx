import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { AuditReportData } from "@/lib/data/audit-report";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  header: { marginBottom: 16, borderBottom: "1pt solid #ccc", paddingBottom: 8 },
  programLabel: { fontSize: 9, color: "#666" },
  title: { fontSize: 16, fontWeight: 700, marginTop: 2 },
  period: { fontSize: 10, color: "#444", marginTop: 2 },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", color: "#333" },
  row: { flexDirection: "row", marginBottom: 3 },
  label: { width: 140, color: "#666" },
  value: { flex: 1 },
  consentBox: { border: "1pt solid #ccc", padding: 8, backgroundColor: "#f7f7f7" },
  table: { border: "1pt solid #ddd" },
  tableRow: { flexDirection: "row", borderBottom: "1pt solid #eee" },
  tableHeaderRow: { flexDirection: "row", backgroundColor: "#f2f2f2", borderBottom: "1pt solid #ccc" },
  tableCell: { padding: 4, flex: 1 },
  tableCellNarrow: { padding: 4, width: 90 },
  codeChip: { marginRight: 6, marginBottom: 2 },
});

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function formatDateTime(date: Date): string {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function AuditReportDocument({ data }: { data: AuditReportData }) {
  const { patient, eligibility, monitoringSessions, readings, devices } = data;
  const periodLabel = `${MONTH_NAMES[data.month - 1]} ${data.year}`;
  const billedCodes = [
    eligibility.code99453 && "99453",
    eligibility.code99454 && "99454",
    eligibility.code99457 && "99457",
    eligibility.code99458 && "99458",
    eligibility.code95251 && "95251",
  ].filter(Boolean);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.programLabel}>Remote Patient Monitoring Program</Text>
          <Text style={styles.title}>
            {data.organizationName} — {patient.lastName}, {patient.firstName} — RPM Report
          </Text>
          <Text style={styles.period}>Reporting period: {periodLabel}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patient Snapshot</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>
              {patient.lastName}, {patient.firstName}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date of birth</Text>
            <Text style={styles.value}>{formatDate(patient.dateOfBirth)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>MRN</Text>
            <Text style={styles.value}>{patient.mrn}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>ICD-10</Text>
            <Text style={styles.value}>{patient.primaryDiagnosisCode}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Program Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Enrollment date</Text>
            <Text style={styles.value}>{formatDate(patient.enrolledAt)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Consent date</Text>
            <Text style={styles.value}>{formatDate(patient.consentDate)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Total RPM time</Text>
            <Text style={styles.value}>{formatDuration(Math.round(eligibility.monitoringMinutes * 60))} min</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Device type(s)</Text>
            <Text style={styles.value}>
              {devices.length > 0
                ? devices.map((d) => `${d.label}${d.serialNumber ? ` (SN ${d.serialNumber})` : ""}`).join(", ")
                : "—"}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Days of readings</Text>
            <Text style={styles.value}>{eligibility.daysOfReadings}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Other Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Referring provider</Text>
            <Text style={styles.value}>{patient.primaryProviderName ?? "—"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Supervising provider</Text>
            <Text style={styles.value}>{patient.supervisingProviderName ?? "—"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Organization</Text>
            <Text style={styles.value}>{data.organizationName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Care manager</Text>
            <Text style={styles.value}>{patient.careManagerName ?? "—"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Clinical notes</Text>
            <Text style={styles.value}>{patient.clinicalNotes ?? "—"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>CPT code(s) billed</Text>
            <Text style={styles.value}>{billedCodes.length > 0 ? billedCodes.join(", ") : "None this period"}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RPM Consent</Text>
          <View style={styles.consentBox}>
            <Text>
              {data.rpmConsentTemplate ??
                "[No consent template configured for this organization — pending legal/compliance review.]"}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Monitoring Sessions</Text>
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={styles.tableCellNarrow}>Date</Text>
              <Text style={styles.tableCellNarrow}>Duration</Text>
              <Text style={styles.tableCell}>Staff</Text>
            </View>
            {monitoringSessions.length === 0 ? (
              <View style={styles.tableRow}>
                <Text style={styles.tableCell}>No monitoring sessions logged this period.</Text>
              </View>
            ) : (
              monitoringSessions.map((s, i) => (
                <View style={styles.tableRow} key={i}>
                  <Text style={styles.tableCellNarrow}>{formatDateTime(s.occurredAt)}</Text>
                  <Text style={styles.tableCellNarrow}>{formatDuration(s.durationSeconds)}</Text>
                  <Text style={styles.tableCell}>{s.staffName}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </Page>

      <Page size="LETTER" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Readings ({periodLabel}) — {readings.length} total
          </Text>
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={styles.tableCellNarrow}>Date</Text>
              <Text style={styles.tableCellNarrow}>Type</Text>
              <Text style={styles.tableCellNarrow}>Value</Text>
            </View>
            {readings.length === 0 ? (
              <View style={styles.tableRow}>
                <Text style={styles.tableCell}>No readings recorded this period.</Text>
              </View>
            ) : (
              readings.map((r, i) => (
                <View style={styles.tableRow} key={i}>
                  <Text style={styles.tableCellNarrow}>{formatDateTime(r.systemTime)}</Text>
                  <Text style={styles.tableCellNarrow}>CGM</Text>
                  <Text style={styles.tableCellNarrow}>{r.value} mg/dL</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
}
