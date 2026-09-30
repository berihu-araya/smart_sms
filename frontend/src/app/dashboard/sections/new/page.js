"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewSectionRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/sections?new=1");
  }, [router]);

  return (
    <div style={{ padding: "32px", textAlign: "center", color: "#64748b" }}>
      Opening Section creation modal...
    </div>
  );
}
