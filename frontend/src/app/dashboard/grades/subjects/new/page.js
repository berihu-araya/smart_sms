"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewGradeSubjectRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/grades/subjects?new=1");
  }, [router]);

  return (
    <div style={{ padding: "32px", textAlign: "center", color: "#64748b" }}>
      Opening Subject Allocation modal...
    </div>
  );
}
