"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewClassTeacherRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/teachers/subjects/class-teachers?new=true");
  }, [router]);

  return (
    <div style={{ padding: "4rem 2rem", textAlign: "center", color: "#64748b", fontFamily: "inherit" }}>
      <p style={{ fontSize: "1rem", fontWeight: 600 }}>Opening Class Teacher Assignment modal...</p>
    </div>
  );
}
