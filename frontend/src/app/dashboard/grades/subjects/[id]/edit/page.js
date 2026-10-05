"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function EditGradeSubjectRedirectPage() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    if (params?.id) {
      router.replace(`/dashboard/grades/subjects?edit=${params.id}`);
    } else {
      router.replace("/dashboard/grades/subjects");
    }
  }, [params, router]);

  return (
    <div style={{ padding: "32px", textAlign: "center", color: "#64748b" }}>
      Opening Subject Assignment editor...
    </div>
  );
}
