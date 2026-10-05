"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewParentPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/parents?action=new");
  }, [router]);

  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
      <span>Opening guardian registration modal...</span>
    </div>
  );
}
