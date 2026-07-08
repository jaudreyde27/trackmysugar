import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { BillingRow } from "@/lib/data/billing";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica", color: "#1a1a1a" },
  title: { fontSize: 15, fontWeight: 700, marginBottom: 2 },
  subtitle: { fontSize: 10, color: "#555", marginBottom: 14 },
  table: { border: "1pt solid #ddd" },
  tableHeaderRow: { flexDirection: "row", backgroundColor: "#f2f2f2", borderBottom: "1pt solid #ccc" },
  tableRow: { flexDirection: "row", borderBottom: "1pt solid #eee" },
  cellName: { padding: 4, width: 130 },
  cell: { padding: 4, width: 55, textAlign: "center" },
});

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function mark(v: boolean) {
  return v ? "✓" : "—";
}

export function BillingSummaryDocument({
  organizationName,
  rows,
  year,
  month,
}: {
  organizationName: string;
  rows: BillingRow[];
  year: number;
  month: number;
}) {
  return (
    <Document>
      <Page size="LETTER" orientation="landscape" style={styles.page}>
        <Text style={styles.title}>{organizationName} — RPM Billing</Text>
        <Text style={styles.subtitle}>
          {MONTH_NAMES[month - 1]} {year} · {rows.length} patients
        </Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.cellName}>Name</Text>
            <Text style={styles.cell}>RPM (min)</Text>
            <Text style={styles.cell}>Days</Text>
            <Text style={styles.cell}>99453</Text>
            <Text style={styles.cell}>99454</Text>
            <Text style={styles.cell}>99457</Text>
            <Text style={styles.cell}>99458</Text>
            <Text style={styles.cell}>95251</Text>
            <Text style={styles.cell}>Status</Text>
          </View>
          {rows.map((row) => (
            <View style={styles.tableRow} key={row.patientId}>
              <Text style={styles.cellName}>
                {row.firstName} {row.lastName}
              </Text>
              <Text style={styles.cell}>{row.eligibility.monitoringMinutes.toFixed(1)}</Text>
              <Text style={styles.cell}>{row.eligibility.daysOfReadings}</Text>
              <Text style={styles.cell}>{mark(row.eligibility.code99453)}</Text>
              <Text style={styles.cell}>{mark(row.eligibility.code99454)}</Text>
              <Text style={styles.cell}>{mark(row.eligibility.code99457)}</Text>
              <Text style={styles.cell}>{mark(row.eligibility.code99458)}</Text>
              <Text style={styles.cell}>{mark(row.eligibility.code95251)}</Text>
              <Text style={styles.cell}>{row.status}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}
