"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import sectionService from "@/services/sectionService";

export default function SectionDetailsPage() {
  const params = useParams();
  const [section, setSection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSection() {
      try {
        setLoading(true);
        const data = await sectionService.getSectionById(params.id);
        setSection(data);
      } catch (err) {
        setError(err.message || "Unable to load section");
      } finally {
        setLoading(false);
      }
    }

    if (params?.id) {
      loadSection();
    }
  }, [params]);

  if (loading) {
    return <div style={{ padding: 24 }}>Loading section details...</div>;
  }

  if (error) {
    return <div style={{ padding: 24, color: "#9a5b00" }}>{error}</div>;
  }

  if (!section) {
    return <div style={{ padding: 24 }}>Section not found.</div>;
  }

  return (
    <div style={{ padding: 24, maxWidth: 700, margin: "24px auto" }}>
      {/* Breadcrumb */}
      <nav style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#667085", marginBottom: 20 }}>
        <Link href="/dashboard" style={{ color: "#2563eb", textDecoration: "none" }}>Dashboard</Link>
        <span style={{ color: "#d0d5dd" }}>/</span>
        <Link href="/dashboard/sections" style={{ color: "#2563eb", textDecoration: "none" }}>Sections</Link>
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
          }}
        >
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#101828" }}>
            {section.name}
          </h1>
        </div>

        {/* Content Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
          <Section title="📋 Section Info">
            <Field label="Section Name" value={section.name} />
            <Field label="Room Number" value={section.room_number || "—"} />
            <Field label="Capacity" value={section.capacity ? String(section.capacity) : "—"} />
            <Field label="Enrolled Students" value={String(section.student_count || 0)} />
          </Section>

          <Section title="🏫 Grade & Class Teacher">
            <Field label="Grade Level" value={section.grade_name || "—"} />
            <Field
              label="Homeroom Class Teacher"
              value={
                section.class_teacher ? (
                  <span style={{ fontWeight: 600, color: "#166534" }}>
                    ⭐ {section.class_teacher.teacher_name} ({section.class_teacher.employee_number || section.class_teacher.email})
                  </span>
                ) : (
                  <span style={{ color: "#94a3b8", fontStyle: "italic" }}>Not Assigned</span>
                )
              }
            />
          </Section>
        </div>

        {/* All Courses in this Section */}
        <div style={{ padding: "24px 32px", borderTop: "1px solid #f0f1f3" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "#101828" }}>
            📚 All Curriculum Courses & Subject Teachers
          </h3>
          {section.courses && section.courses.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ background: "#f8fafc", textAlign: "left", color: "#475467", fontSize: 12, textTransform: "uppercase" }}>
                    <th style={{ padding: "10px 12px", borderBottom: "1px solid #eaecf0" }}>Subject</th>
                    <th style={{ padding: "10px 12px", borderBottom: "1px solid #eaecf0" }}>Code</th>
                    <th style={{ padding: "10px 12px", borderBottom: "1px solid #eaecf0" }}>Assigned Teacher</th>
                    <th style={{ padding: "10px 12px", borderBottom: "1px solid #eaecf0" }}>Periods/Wk</th>
                    <th style={{ padding: "10px 12px", borderBottom: "1px solid #eaecf0" }}>Pass / Max</th>
                  </tr>
                </thead>
                <tbody>
                  {section.courses.map((c, i) => (
                    <tr
                      key={`${c.grade_subject_id || c.subject_id || "course"}:${c.teacher_subject_id || "unassigned"}:${i}`}
                      style={{ borderBottom: "1px solid #f1f5f9" }}
                    >
                      <td style={{ padding: "10px 12px", fontWeight: 600, color: "#101828" }}>
                        {c.subject_name}
                      </td>
                      <td style={{ padding: "10px 12px", color: "#64748b" }}>{c.subject_code}</td>
                      <td style={{ padding: "10px 12px" }}>
                        {c.teacher_name ? (
                          <span style={{ fontWeight: 600, color: "#1e40af" }}>
                            👨‍🏫 {c.teacher_name}
                          </span>
                        ) : (
                          <span style={{ color: "#94a3b8", fontStyle: "italic" }}>Not Assigned</span>
                        )}
                      </td>
                      <td style={{ padding: "10px 12px" }}>{c.weekly_periods || "—"}</td>
                      <td style={{ padding: "10px 12px" }}>
                        {c.pass_mark || 50} / {c.max_mark || 100}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: "#667085", fontSize: 14, margin: 0 }}>
              No subjects mapped to this grade yet.
            </p>
          )}
        </div>

        {/* Back Link */}
        <div style={{ padding: "20px 32px", borderTop: "1px solid #f0f1f3", background: "#fafbfc" }}>
          <Link
            href="/dashboard/sections"
            style={{
              color: "#2563eb",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            ← Back to Sections
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
      <div style={{ margin: "2px 0 0", fontSize: 14, color: "#101828" }}>{value}</div>
    </div>
  );
}

