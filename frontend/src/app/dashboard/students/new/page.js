"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewStudentPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/students?action=new");
  }, [router]);

  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
      <span>Opening student enrollment modal...</span>
    </div>
  );
}
