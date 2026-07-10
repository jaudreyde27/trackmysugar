import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { AuditReportData } from "@/lib/data/audit-report";

export type AuditReportMetadata = {
  reportId: string;
  generatedAt: Date;
  generatedByName: string;
  contentHash: string;
};

const ACCENT = "#2a6f4f";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica", color: "#1a1a1a" },
  header: {
    marginBottom: 16,
    borderBottom: "1.5pt solid " + ACCENT,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  orgName: { fontSize: 9, color: "#666" },
  title: { fontSize: 15, fontWeight: 700, marginTop: 2 },
  periodBox: { textAlign: "right" },
  periodLabel: { fontSize: 8, color: "#666" },
  periodValue: { fontSize: 11, fontWeight: 700, color: ACCENT },

  section: { marginBottom: 12 },
  sectionTitle: {
    fontSize: 10.5,
    fontWeight: 700,
    color: "#222",
    borderLeft: "3pt solid " + ACCENT,
    paddingLeft: 6,
    marginBottom: 6,
  },

  twoCol: { flexDirection: "row", gap: 16 },
  col: { flex: 1 },
  field: { marginBottom: 5 },
  fieldLabel: { fontSize: 7.5, textTransform: "uppercase", letterSpacing: 0.5, color: "#777" },
  fieldValue: { fontSize: 9.5, marginTop: 1 },

  paragraphBox: { border: "1pt solid #ddd", padding: 8, backgroundColor: "#f7f9f8" },
  paragraphText: { fontSize: 8.5, lineHeight: 1.5 },

  table: { border: "1pt solid #ddd" },
  tableHeaderRow: { flexDirection: "row", backgroundColor: ACCENT },
  tableHeaderCell: { padding: 4, flex: 1, fontSize: 8, fontWeight: 700, color: "#ffffff" },
  tableRow: { flexDirection: "row", borderBottom: "0.5pt solid #eee" },
  tableRowAlt: { flexDirection: "row", borderBottom: "0.5pt solid #eee", backgroundColor: "#f4f6f5" },
  tableCell: { padding: 4, flex: 1, fontSize: 8 },
  tableCellNarrow: { padding: 4, width: 85, fontSize: 8 },
  emptyRow: { padding: 8, fontSize: 8.5, color: "#888" },

  attestationBox: { border: "1pt solid #ddd", padding: 8, marginTop: 4 },
  signatureLine: {
    marginTop: 24,
    borderTop: "0.75pt solid #999",
    paddingTop: 3,
    width: 220,
    fontSize: 7.5,
    color: "#777",
  },

  footer: { marginTop: 16, paddingTop: 6, borderTop: "0.5pt solid #ccc" },
  footerText: { fontSize: 7, color: "#999" },
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

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

const RPM_SESSIONS_SUBHEADER =
  "Remote patient monitoring sessions are conducted by clinical staff who review patient sensor data — " +
  "transmitted daily and aggregated into trends and insights — and contact patients directly for live, " +
  "two-way conversation by phone when clinically indicated. Each entry below reflects a single monitoring " +
  "or call activity, with its duration and the date/time it occurred.";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

function TwoColumn({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <View style={styles.twoCol}>
      <View style={styles.col}>{left}</View>
      <View style={styles.col}>{right}</View>
    </View>
  );
}

function Table({
  columns,
  rows,
  emptyMessage,
}: {
  columns: Array<{ label: string; width?: number }>;
  rows: string[][];
  emptyMessage: string;
}) {
  return (
    <View style={styles.table}>
      <View style={styles.tableHeaderRow}>
        {columns.map((c, i) => (
          <Text key={i} style={c.width ? { ...styles.tableHeaderCell, flex: undefined, width: c.width } : styles.tableHeaderCell}>
            {c.label}
          </Text>
        ))}
      </View>
      {rows.length === 0 ? (
        <Text style={styles.emptyRow}>{emptyMessage}</Text>
      ) : (
        rows.map((row, i) => (
          <View style={i % 2 === 1 ? styles.tableRowAlt : styles.tableRow} key={i}>
            {row.map((cell, j) => (
              <Text
                key={j}
                style={columns[j]?.width ? { ...styles.tableCell, flex: undefined, width: columns[j].width } : styles.tableCell}
              >
                {cell}
              </Text>
            ))}
          </View>
        ))
      )}
    </View>
  );
}

export function AuditReportDocument({
  data,
  metadata,
}: {
  data: AuditReportData;
  metadata: AuditReportMetadata;
}) {
  const { patient, programDetails, otherDetails, monitoringSessions, readingDays, billingSummary, physicianReview } =
    data;

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.orgName}>{data.organizationName}</Text>
            <Text style={styles.title}>
              {patient.firstName} {patient.lastName} — RPM Report
            </Text>
          </View>
          <View style={styles.periodBox}>
            <Text style={styles.periodLabel}>Reporting Period</Text>
            <Text style={styles.periodValue}>{data.reportingPeriodLabel}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <SectionTitle>Patient Snapshot</SectionTitle>
          <TwoColumn
            left={
              <>
                <Field label="Name" value={`${patient.firstName} ${patient.lastName}`} />
                <Field label="MRN" value={patient.mrn} />
                <Field label="Reporting Period" value={data.reportingPeriodLabel} />
              </>
            }
            right={
              <>
                <Field label="Date of Birth" value={formatDate(patient.dateOfBirth)} />
                <Field
                  label="ICD-10"
                  value={patient.diagnosisName ? `${patient.diagnosisCode} — ${patient.diagnosisName}` : patient.diagnosisCode}
                />
              </>
            }
          />
        </View>

        <View style={styles.section}>
          <SectionTitle>Program Details</SectionTitle>
          <TwoColumn
            left={
              <>
                <Field label="Enrollment Date" value={formatDate(programDetails.enrolledAt)} />
                <Field label="Total RPM Time" value={`${formatDuration(Math.round(programDetails.totalRpmMinutes * 60))} min`} />
                <Field
                  label="Device Serial(s)"
                  value={programDetails.deviceSerials.length > 0 ? programDetails.deviceSerials.join(", ") : "—"}
                />
              </>
            }
            right={
              <>
                <Field label="Consent Date" value={formatDate(programDetails.consentDate)} />
                <Field
                  label="Device Type(s)"
                  value={programDetails.deviceTypes.length > 0 ? programDetails.deviceTypes.join(", ") : "—"}
                />
                <Field label="Days of Readings" value={String(programDetails.daysOfReadings)} />
              </>
            }
          />
        </View>

        <View style={styles.section}>
          <SectionTitle>Other Details</SectionTitle>
          <TwoColumn
            left={
              <>
                <Field label="Supervising Provider" value={otherDetails.supervisingProvider ?? "—"} />
                <Field label="Organization" value={otherDetails.organizationName} />
              </>
            }
            right={
              <Field
                label="CPT Code(s) Billed"
                value={otherDetails.cptCodesBilled.length > 0 ? otherDetails.cptCodesBilled.join(", ") : "None this period"}
              />
            }
          />
        </View>

        <View style={styles.section}>
          <SectionTitle>RPM Consent</SectionTitle>
          <View style={styles.paragraphBox}>
            <Text style={styles.paragraphText}>{data.rpmConsentParagraph}</Text>
            {data.practiceConsentAddendum && (
              <>
                <Text style={{ ...styles.paragraphText, marginTop: 6, fontWeight: 700 }}>
                  Additional practice-specific terms:
                </Text>
                <Text style={{ ...styles.paragraphText, marginTop: 2 }}>{data.practiceConsentAddendum}</Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <SectionTitle>RPM Sessions</SectionTitle>
          <Text style={{ ...styles.paragraphText, marginBottom: 6, color: "#555" }}>{RPM_SESSIONS_SUBHEADER}</Text>
          <Table
            columns={[{ label: "Date", width: 90 }, { label: "Duration", width: 70 }, { label: "Staff" }]}
            rows={monitoringSessions.map((s) => [formatDateTime(s.occurredAt), formatDuration(s.durationSeconds), s.staffName])}
            emptyMessage="No monitoring sessions logged this period."
          />
        </View>

        <View style={styles.section}>
          <SectionTitle>Readings</SectionTitle>
          <Table
            columns={[{ label: "Date", width: 90 }, { label: "Reading Count", width: 90 }, { label: "Device(s)" }]}
            rows={readingDays.map((d) => [
              formatDate(new Date(d.date)),
              String(d.readingCount),
              d.devices.length > 0 ? d.devices.join(", ") : "—",
            ])}
            emptyMessage="No readings recorded this period."
          />
        </View>
        <View style={styles.section}>
          <SectionTitle>Billing Summary</SectionTitle>
          {billingSummary.length === 0 ? (
            <Text style={styles.emptyRow}>No CPT codes billed this period.</Text>
          ) : (
            <>
              {billingSummary.map((line) => (
                <Text key={line.cptCode} style={{ ...styles.paragraphText, marginBottom: 3 }}>
                  <Text style={{ fontWeight: 700 }}>{line.cptCode}</Text> — {line.explanation}
                </Text>
              ))}
              <View style={{ marginTop: 6 }}>
                <Table
                  columns={[
                    { label: "CPT Code", width: 60 },
                    { label: "Threshold Required", width: 190 },
                    { label: "Threshold Achieved", width: 175 },
                    { label: "Units Billed" },
                  ]}
                  rows={billingSummary.map((line) => [
                    line.cptCode,
                    line.thresholdRequired,
                    line.thresholdAchieved,
                    String(line.unitsBilled),
                  ])}
                  emptyMessage=""
                />
              </View>
            </>
          )}
        </View>

        <View style={styles.section}>
          <SectionTitle>Physician Review / Sign-off</SectionTitle>
          <TwoColumn
            left={<Field label="Ordering/Supervising Physician" value={physicianReview.name ?? "—"} />}
            right={<Field label="NPI" value={physicianReview.npi ?? "—"} />}
          />
          <View style={styles.attestationBox}>
            <Text style={styles.paragraphText}>{physicianReview.attestation}</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 40 }}>
            <Text style={styles.signatureLine}>Physician Signature</Text>
            <Text style={styles.signatureLine}>Date Reviewed</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Report generated {formatDateTime(metadata.generatedAt)} by {metadata.generatedByName} · Report ID{" "}
            {metadata.reportId}
          </Text>
          <Text style={styles.footerText}>Content hash (SHA-256): {metadata.contentHash}</Text>
        </View>
      </Page>
    </Document>
  );
}
