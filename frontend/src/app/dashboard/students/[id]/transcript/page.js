"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getStudentCumulativeTranscript } from "@/services/studentPromotionService";
import styles from "./transcript.module.css";

export default function StudentMasterTranscriptPage() {
  const params = useParams();
  const studentId = params?.id;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTranscript() {
      if (!studentId) return;
      try {
        setLoading(true);
        setError("");
        const res = await getStudentCumulativeTranscript(studentId);
        setData(res);
      } catch (err) {
        console.error("Failed to load student transcript:", err);
        setError(err.message || "Failed to load cumulative academic transcript.");
      } finally {
        setLoading(false);
      }
    }

    loadTranscript();
  }, [studentId]);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.stateBox}>
          <div className={styles.stateIcon}>⏳</div>
          <h2 className={styles.stateTitle}>Compiling Permanent Record...</h2>
          <p className={styles.stateText}>
            Aggregating multi-year academic history from Kindergarten through higher grades.
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.stateBox}>
          <div className={styles.stateIcon}>⚠️</div>
          <h2 className={styles.stateTitle}>Unable to Retrieve Transcript</h2>
          <p className={styles.stateText}>{error || "Record could not be retrieved."}</p>
          <Link href={`/dashboard/students/${studentId}`} className={styles.backBtn}>
            ← Return to Student Profile
          </Link>
        </div>
      </div>
    );
  }

  const { student, careerStats, academicHistory } = data;
  const schoolName = student.school_name || "Official Academic Institution";
  const schoolAddress = student.school_address || "Institutional Campus Office";
  const principalName = student.principal_name || "Principal Office";

  return (
    <div className={styles.pageContainer}>
      {/* Screen Control Bar */}
      <div className={styles.controlBar}>
        <div className={styles.navGroup}>
          <Link href={`/dashboard/students/${studentId}`} className={styles.backBtn}>
            ← Back to Student Profile
          </Link>
          <Link href="/dashboard/students" className={styles.backBtn}>
            Students List
          </Link>
        </div>
        <div className={styles.actionGroup}>
          <Link
            href={`/dashboard/results/report-card?studentId=${studentId}`}
            className={styles.reportCardLink}
          >
            📋 Single-Term Report Card
          </Link>
          <button onClick={handlePrint} className={styles.printBtn}>
            🖨️ Print / Save Master Transcript (PDF)
          </button>
        </div>
      </div>

      {/* Printable Sheet */}
      <div className={styles.transcriptSheet}>
        {/* Institutional Letterhead */}
        <header className={styles.letterhead}>
          <div className={styles.schoolInfo}>
            <h1 className={styles.schoolName}>{schoolName}</h1>
            <p className={styles.schoolSubtext}>{schoolAddress}</p>
            <p className={styles.schoolSubtext}>
              {student.school_phone && `Phone: ${student.school_phone} • `}
              {student.school_email && `Email: ${student.school_email}`}
            </p>
          </div>
          <div className={styles.docBadgeBox}>
            <div className={styles.docTitle}>Official Cumulative Transcript</div>
            <div className={styles.docSubtitle}>Multi-Year Permanent Academic Record</div>
            <span className={styles.officialStampNotice}>CONFIDENTIAL & CERTIFIED RECORD</span>
          </div>
        </header>

        {/* Student Biographical Data */}
        <section className={styles.studentBioGrid}>
          <div className={styles.bioItem}>
            <span className={styles.bioLabel}>Student Full Name</span>
            <span className={styles.bioValue}>
              {student.first_name} {student.last_name}
            </span>
          </div>
          <div className={styles.bioItem}>
            <span className={styles.bioLabel}>Admission / ID No.</span>
            <span className={styles.bioValue}>{student.admission_number}</span>
          </div>
          <div className={styles.bioItem}>
            <span className={styles.bioLabel}>Date of Birth</span>
            <span className={styles.bioValue}>
              {student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString() : "—"}
            </span>
          </div>
          <div className={styles.bioItem}>
            <span className={styles.bioLabel}>Gender</span>
            <span className={styles.bioValue}>{student.gender || "—"}</span>
          </div>

          <div className={styles.bioItem}>
            <span className={styles.bioLabel}>Initial Admission Date</span>
            <span className={styles.bioValue}>
              {student.admission_date ? new Date(student.admission_date).toLocaleDateString() : "—"}
            </span>
          </div>
          <div className={styles.bioItem}>
            <span className={styles.bioLabel}>Current Standing / Status</span>
            <span className={styles.bioValue} style={{ textTransform: "uppercase" }}>
              {student.status || "Active"}
            </span>
          </div>
          <div className={styles.bioItem}>
            <span className={styles.bioLabel}>Parent / Guardian</span>
            <span className={styles.bioValue}>{student.parent_name || "—"}</span>
          </div>
          <div className={styles.bioItem}>
            <span className={styles.bioLabel}>Issue Date</span>
            <span className={styles.bioValue}>{new Date().toLocaleDateString()}</span>
          </div>
        </section>

        {/* Career Summary Highlights Banner */}
        <section className={styles.careerBanner}>
          <div className={styles.careerStatItem}>
            <span className={styles.statLabel}>Starting Grade</span>
            <span className={styles.statValue}>{careerStats.startingGrade || "KG"}</span>
          </div>
          <div className={styles.careerStatItem}>
            <span className={styles.statLabel}>Highest / Current Grade</span>
            <span className={styles.statValue}>{careerStats.latestGrade || student.current_grade_name || "—"}</span>
          </div>
          <div className={styles.careerStatItem}>
            <span className={styles.statLabel}>Total Years Completed</span>
            <span className={styles.statValue}>{careerStats.totalYearsRecorded} Academic Year(s)</span>
          </div>
          <div className={styles.careerStatItem}>
            <span className={styles.statLabel}>Cumulative Average (CGPA)</span>
            <span className={styles.statValueAccent}>
              {careerStats.careerAverage !== null ? `${careerStats.careerAverage}%` : "—"}
            </span>
          </div>
          <div className={styles.careerStatItem}>
            <span className={styles.statLabel}>Overall Career Standing</span>
            <span className={styles.statValueAccent}>
              Grade {careerStats.careerLetter || "Pass"}
            </span>
          </div>
        </section>

        {/* Chronological Year-by-Year Academic Journey */}
        <h2 className={styles.timelineSectionTitle}>
          Multi-Year Academic Journey & Subject Progression
        </h2>

        {academicHistory.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>
            No multi-year academic progression records recorded yet. End-of-year promotion snapshots
            will automatically generate each year upon cohort advancement.
          </div>
        ) : (
          academicHistory.map((yearRecord, index) => {
            const statusClass =
              yearRecord.promotion_status === "PROMOTED"
                ? styles.outcomePROMOTED
                : yearRecord.promotion_status === "GRADUATED"
                ? styles.outcomeGRADUATED
                : yearRecord.promotion_status === "RETAINED"
                ? styles.outcomeRETAINED
                : styles.outcomeCURRENT;

            const displayStatus =
              yearRecord.promotion_status === "PROMOTED" && yearRecord.promoted_to_grade_name
                ? `Promoted to ${yearRecord.promoted_to_grade_name}`
                : yearRecord.promotion_status || "Completed";

            return (
              <div key={yearRecord.id || index} className={styles.yearCard}>
                <div className={styles.yearHeader}>
                  <div className={styles.yearTitleGroup}>
                    <span className={styles.gradePill}>{yearRecord.grade_name || "Grade"}</span>
                    <span className={styles.academicYearName}>{yearRecord.academic_year_name}</span>
                    <span className={styles.sectionName}>
                      {yearRecord.section_name ? `(Section ${yearRecord.section_name})` : ""}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <Link
                      href={`/dashboard/results/report-card?studentId=${studentId}&year=${yearRecord.academic_year_id}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        padding: '0.25rem 0.65rem',
                        borderRadius: '6px',
                        background: '#eff6ff',
                        color: '#2563eb',
                        border: '1px solid #bfdbfe',
                        textDecoration: 'none',
                      }}
                      title={`View Official Terminal Report Card for ${yearRecord.academic_year_name}`}
                    >
                      📋 Term Report Card
                    </Link>
                    <span className={`${styles.outcomeBadge} ${statusClass}`}>
                      {displayStatus}
                    </span>
                  </div>
                </div>

                {/* Subjects Table */}
                {yearRecord.subjects && yearRecord.subjects.length > 0 ? (
                  <table className={styles.subjectTable}>
                    <thead>
                      <tr>
                        <th>Subject Name</th>
                        <th style={{ width: "120px" }}>Course Code</th>
                        <th style={{ width: "120px", textAlign: "right" }}>Annual Mark</th>
                        <th style={{ width: "100px", textAlign: "center" }}>Letter Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {yearRecord.subjects.map((sub) => (
                        <tr key={sub.subjectId}>
                          <td><strong>{sub.subjectName}</strong></td>
                          <td className={styles.subjectCode}>{sub.subjectCode || "—"}</td>
                          <td className={styles.scoreCol}>
                            {sub.score !== null && !isNaN(sub.score) ? `${sub.score}%` : "—"}
                          </td>
                          <td className={styles.letterCol}>{sub.letterGrade || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: "1rem 1.25rem", color: "#64748b", fontSize: "0.85rem" }}>
                    No subject examination scores cataloged for this academic session.
                  </div>
                )}

                <div className={styles.yearFooter}>
                  <div>
                    {yearRecord.final_average !== null && (
                      <span className={styles.yearAverage}>
                        Year Average: {yearRecord.final_average}%{" "}
                        {yearRecord.final_grade_letter ? `(Grade ${yearRecord.final_grade_letter})` : ""}
                      </span>
                    )}
                    {yearRecord.promoted_by_name && (
                      <span style={{ marginLeft: "1rem", color: "#64748b", fontSize: "0.8rem" }}>
                        Authorized by: {yearRecord.promoted_by_name}
                      </span>
                    )}
                  </div>
                  {yearRecord.remarks && (
                    <div className={styles.yearRemarks}>Remarks: {yearRecord.remarks}</div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Attestation & Certification Signatures */}
        <section className={styles.attestationSection}>
          <div className={styles.sealDisclaimer}>
            This certifies that the academic records above represent the true and complete history of
            the student according to the official archives of this institution.
          </div>

          <div className={styles.signatureGrid}>
            <div className={styles.sigBox}>
              <div className={styles.sigLine} />
              <span className={styles.sigTitle}>Registrar / Records Officer</span>
              <span className={styles.sigSubtitle}>Office of the Registrar</span>
            </div>

            <div className={styles.sigBox}>
              <div className={styles.sealBox}>OFFICIAL SCHOOL EMBOSSED SEAL</div>
            </div>

            <div className={styles.sigBox}>
              <div className={styles.sigLine} />
              <span className={styles.sigTitle}>School Principal / Headmaster</span>
              <span className={styles.sigSubtitle}>{principalName}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
