"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewTeacherSubjectRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/teachers/subjects?new=true");
  }, [router]);

  return (
    <div style={{ padding: "4rem 2rem", textAlign: "center", color: "#64748b", fontFamily: "inherit" }}>
      <p style={{ fontSize: "1rem", fontWeight: 600 }}>Opening Teacher Subject Assignment modal...</p>
    </div>
  );
}
