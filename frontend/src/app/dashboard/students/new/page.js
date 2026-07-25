"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import studentService from "@/services/studentService";

export default function NewStudentPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    admissionNumber: "",
    firstName: "",
    lastName: "",
    gender: "MALE",
    dateOfBirth: "",
    admissionDate: "",
    parentId: "",
    sectionId: "",
    address: "",
    status: "ACTIVE",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await studentService.createStudent(form);
      router.push("/dashboard/students");
    } catch (err) {
      setError(err.message || "Unable to create student");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 760, margin: "24px auto", padding: 24, background: "white", borderRadius: 14 }}>
      <h1>Create Student</h1>
      <p style={{ color: "#667085" }}>Register a new student record with the required admission details.</p>

      {error ? <div style={{ padding: 12, background: "#fff7ed", color: "#9a5b00", borderRadius: 10 }}>{error}</div> : null}

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          <label>
            Admission Number
            <input name="admissionNumber" value={form.admissionNumber} onChange={handleChange} required style={{ width: "100%", padding: 10 }} />
          </label>
          <label>
            First Name
            <input name="firstName" value={form.firstName} onChange={handleChange} required style={{ width: "100%", padding: 10 }} />
          </label>
          <label>
            Last Name
            <input name="lastName" value={form.lastName} onChange={handleChange} required style={{ width: "100%", padding: 10 }} />
          </label>
          <label>
            Gender
            <select name="gender" value={form.gender} onChange={handleChange} style={{ width: "100%", padding: 10 }}>
              <option value="MALE">MALE</option>
              <option value="FEMALE">FEMALE</option>
              <option value="OTHER">OTHER</option>
            </select>
          </label>
          <label>
            Date of Birth
            <input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={handleChange} style={{ width: "100%", padding: 10 }} />
          </label>
          <label>
            Admission Date
            <input type="date" name="admissionDate" value={form.admissionDate} onChange={handleChange} required style={{ width: "100%", padding: 10 }} />
          </label>
          <label>
            Parent ID
            <input name="parentId" value={form.parentId} onChange={handleChange} style={{ width: "100%", padding: 10 }} />
          </label>
          <label>
            Section ID
            <input name="sectionId" value={form.sectionId} onChange={handleChange} style={{ width: "100%", padding: 10 }} />
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            Address
            <textarea name="address" value={form.address} onChange={handleChange} rows={4} style={{ width: "100%", padding: 10 }} />
          </label>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button type="submit" disabled={saving} style={{ padding: "12px 18px", background: "#2563eb", color: "white", border: 0, borderRadius: 10 }}>
            {saving ? "Saving..." : "Save Student"}
          </button>
          <button type="button" onClick={() => router.push("/dashboard/students")} style={{ padding: "12px 18px", border: "1px solid #d0d5dd", borderRadius: 10 }}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
