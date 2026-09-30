"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewSubjectRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/subjects?new=1");
  }, [router]);

  return (
    <div style={{ padding: "32px", textAlign: "center", color: "#64748b" }}>
      Opening Subject creation modal...
    </div>
  );
}
