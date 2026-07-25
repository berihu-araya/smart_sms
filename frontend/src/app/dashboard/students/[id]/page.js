"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import studentService from "@/services/studentService";

export default function StudentDetailsPage() {
  const params = useParams();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadStudent() {
      try {
        setLoading(true);
        const data = await studentService.getStudentProfile(params.id);
        setStudent(data.student);
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

  if (!student) {
    return <div style={{ padding: 24 }}>Student not found.</div>;
  }

  return (
    <div style={{ padding: 24, background: "white", borderRadius: 14, maxWidth: 900, margin: "24px auto" }}>
      <h1>{`${student.first_name} ${student.last_name}`}</h1>
      <p>Admission Number: {student.admission_number}</p>
      <p>Status: {student.status}</p>
      <p>Gender: {student.gender}</p>
      <p>Admission Date: {student.admission_date}</p>
      <p>Address: {student.address || "—"}</p>
    </div>
  );
}
