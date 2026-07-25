"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import studentService from "@/services/studentService";

export default function StudentDetailsPage() {
  const params = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadStudent() {
      try {
        setLoading(true);
        const data = await studentService.getStudentProfile(params.id);
        setProfile(data);
      } catch (err) {
        setError(err.message || "Unable to load student profile");
      } finally {
        setLoading(false);
      }
    }

    if (params?.id) {
      loadStudent();
    }
  }, [params]);

  if (loading) {
    return <div style={{ padding: 24 }}>Loading student profile...</div>;
  }

  if (error) {
    return <div style={{ padding: 24, color: "#9a5b00" }}>{error}</div>;
  }

  if (!profile) {
    return <div style={{ padding: 24 }}>Student not found.</div>;
  }

  const { student, guardian, academicInfo } = profile;

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "24px auto" }}>
      {/* Breadcrumb */}
      <nav style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#667085", marginBottom: 20 }}>
        <Link href="/dashboard" style={{ color: "#2563eb", textDecoration: "none" }}>Dashboard</Link>
        <span style={{ color: "#d0d5dd" }}>/</span>
        <Link href="/dashboard/students" style={{ color: "#2563eb", textDecoration: "none" }}>Students</Link>
        <span style={{ color: "#d0d5dd" }}>/</span>
        <span style={{ color: "#101828", fontWeight: 500 }}>Details</span>
      </nav>

      <div
        style={{
          background: "white",
          borderRadius: 16,
          border: "1px solid #e4e7ec",
          boxShadow: "0 1px 3px rgba(16,24,40,0.05)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "28px 32px",
            borderBottom: "1px solid #f0f1f3",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#101828" }}>
              {`${student.first_name} ${student.last_name}`}
            </h1>
            <p style={{ margin: "4px 0 0", color: "#667085", fontSize: 14 }}>
              Admission: {student.admission_number}
            </p>
          </div>
          <span
            style={{
              padding: "4px 14px",
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 600,
              background:
                student.status === "ACTIVE"
                  ? "#ecfdf5"
                  : student.status === "SUSPENDED"
                  ? "#fef3c7"
                  : "#f2f4f7",
              color:
                student.status === "ACTIVE"
                  ? "#065f46"
                  : student.status === "SUSPENDED"
                  ? "#92400e"
                  : "#344054",
            }}
          >
            {student.status}
          </span>
        </div>

        {/* Content Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
          {/* Personal Information */}
          <Section title="👤 Personal Information">
            <Field label="First Name" value={student.first_name} />
            <Field label="Last Name" value={student.last_name} />
            <Field label="Gender" value={student.gender} />
            <Field label="Date of Birth" value={student.date_of_birth || "—"} />
            <Field label="Admission Date" value={student.admission_date} />
          </Section>

          {/* Contact Details */}
          <Section title="📞 Contact Details">
            <Field label="Email" value={student.email || "—"} />
            <Field label="Phone" value={student.phone || "—"} />
            <Field label="Address" value={student.address || "—"} />
          </Section>

          {/* Academic Info */}
          <Section title="🏫 Academic Information">
            <Field label="Section" value={academicInfo.section || "—"} />
            <Field label="Room" value={academicInfo.room || "—"} />
            <Field label="Status" value={academicInfo.currentStatus} />
          </Section>

          {/* Guardian */}
          <Section title="👪 Guardian">
            <Field label="Name" value={guardian.name || "—"} />
            <Field label="Phone" value={guardian.phone || "—"} />
            <Field label="Email" value={guardian.email || "—"} />
            <Field label="Address" value={guardian.address || "—"} />
          </Section>
        </div>

        {/* Back Link */}
        <div style={{ padding: "20px 32px", borderTop: "1px solid #f0f1f3", background: "#fafbfc" }}>
          <Link
            href="/dashboard/students"
            style={{
              color: "#2563eb",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            ← Back to Students
          </Link>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ padding: "24px 32px", borderBottom: "1px solid #f0f1f3", borderRight: "1px solid #f0f1f3" }}>
      <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600, color: "#101828" }}>{title}</h3>
      <div style={{ display: "grid", gap: 12 }}>{children}</div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <span style={{ fontSize: 12, fontWeight: 600, color: "#667085", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </span>
      <p style={{ margin: "2px 0 0", fontSize: 14, color: "#101828" }}>{value}</p>
    </div>
  );
}

