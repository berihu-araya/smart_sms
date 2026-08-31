"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import gradeService from "@/services/gradeService";
import StatusBadge from "@/components/common/StatusBadge";
import {
  HiBuildingOffice2,
  HiAcademicCap,
  HiBookOpen,
  HiArrowLeft,
  HiPencilSquare,
} from "react-icons/hi2";

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
    return <div style={{ padding: 32, textAlign: "center", color: "#64748b" }}>Loading grade details...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 24, maxWidth: 720, margin: "32px auto" }}>
        <div style={{ background: "#fef2f2", color: "#991b1b", padding: 18, borderRadius: 12 }}>
          {error}
        </div>
      </div>
    );
  }

  if (!grade) {
    return <div style={{ padding: 32, textAlign: "center" }}>Grade not found.</div>;
  }

  return (
    <div style={{ padding: 28, maxWidth: 840, margin: "0 auto" }}>
      {/* Breadcrumb */}
      <nav style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#64748b", marginBottom: 24 }}>
        <Link href="/dashboard" style={{ color: "#2563eb", textDecoration: "none" }}>Dashboard</Link>
        <span>/</span>
        <Link href="/dashboard/grades" style={{ color: "#2563eb", textDecoration: "none" }}>Grades</Link>
        <span>/</span>
        <span style={{ color: "#0f172a", fontWeight: 600 }}>{grade.name}</span>
      </nav>

      {/* Main Card */}
      <div
        style={{
          background: "white",
          borderRadius: 18,
          border: "1px solid #e2e8f0",
          boxShadow: "0 4px 20px rgba(15, 23, 42, 0.05)",
          overflow: "hidden",
        }}
      >
        {/* Card Header */}
        <div
          style={{
            padding: "26px 32px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 14,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#0f172a" }}>
                {grade.name}
              </h1>
              <StatusBadge status={grade.status} />
            </div>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: "#64748b" }}>
              {grade.description || "No description provided."}
            </p>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <Link
              href={`/dashboard/grades/subjects?grade_id=${grade.id}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                background: "#eff6ff",
                color: "#1d4ed8",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              <HiBookOpen size={16} /> Manage Curriculum
            </Link>
          </div>
        </div>

        {/* Quick Stats Strip */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 16,
            padding: "20px 32px",
            background: "#f8fafc",
            borderBottom: "1px solid #f1f5f9",
          }}
        >
          <div>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>
              Sections
            </span>
            <p style={{ margin: "2px 0 0", fontSize: 20, fontWeight: 800, color: "#0f172a" }}>
              {grade.section_count || 0}
            </p>
          </div>
          <div>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>
              Enrolled Students
            </span>
            <p style={{ margin: "2px 0 0", fontSize: 20, fontWeight: 800, color: "#0f172a" }}>
              {grade.student_count || 0}
            </p>
          </div>
          <div>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>
              Curriculum Subjects
            </span>
            <p style={{ margin: "2px 0 0", fontSize: 20, fontWeight: 800, color: "#0f172a" }}>
              {grade.subject_count || 0}
            </p>
          </div>
        </div>

        {/* Timestamps & Footer */}
        <div
          style={{
            padding: "18px 32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 13,
            color: "#64748b",
          }}
        >
          <span>Created: {grade.created_at ? new Date(grade.created_at).toLocaleDateString() : "—"}</span>
          <Link
            href="/dashboard/grades"
            style={{
              color: "#2563eb",
              textDecoration: "none",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <HiArrowLeft size={16} /> Back to Grades
          </Link>
        </div>
      </div>
    </div>
  );
}
