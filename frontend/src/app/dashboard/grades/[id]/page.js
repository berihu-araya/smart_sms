"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import gradeService from "@/services/gradeService";

export default function GradeDetailsPage() {
  const params = useParams();
  const [grade, setGrade] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadGrade() {
      try {
        setLoading(true);
        const data = await gradeService.getGradeById(params.id);
        setGrade(data);
      } catch (err) {
        setError(err.message || "Unable to load grade");
      } finally {
        setLoading(false);
      }
    }

    if (params?.id) {
      loadGrade();
    }
  }, [params]);

  if (loading) {
    return <div style={{ padding: 24 }}>Loading grade details...</div>;
  }

  if (error) {
    return <div style={{ padding: 24, color: "#9a5b00" }}>{error}</div>;
  }

  if (!grade) {
    return <div style={{ padding: 24 }}>Grade not found.</div>;
  }

  return (
    <div style={{ padding: 24, maxWidth: 700, margin: "24px auto" }}>
      {/* Breadcrumb */}
      <nav style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#667085", marginBottom: 20 }}>
        <Link href="/dashboard" style={{ color: "#2563eb", textDecoration: "none" }}>Dashboard</Link>
        <span style={{ color: "#d0d5dd" }}>/</span>
        <Link href="/dashboard/grades" style={{ color: "#2563eb", textDecoration: "none" }}>Grades</Link>
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
            {grade.name}
          </h1>
        </div>

        {/* Content */}
        <div style={{ padding: "24px 32px", display: "grid", gap: 20 }}>
          <div>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#667085", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Description
            </span>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: "#101828" }}>
              {grade.description || "—"}
            </p>
          </div>
          <div>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#667085", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Sections
            </span>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: "#101828" }}>
              {grade.section_count || 0} section(s)
            </p>
          </div>
        </div>

        {/* Back Link */}
        <div style={{ padding: "20px 32px", borderTop: "1px solid #f0f1f3", background: "#fafbfc" }}>
          <Link
            href="/dashboard/grades"
            style={{
              color: "#2563eb",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            ← Back to Grades
          </Link>
        </div>
      </div>
    </div>
  );
}

