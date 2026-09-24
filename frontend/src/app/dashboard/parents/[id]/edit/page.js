"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function EditParentPage() {
  const params = useParams();
  const router = useRouter();
  const parentId = params?.id;

  useEffect(() => {
    if (parentId) {
      router.replace(`/dashboard/parents?edit=${parentId}`);
    } else {
      router.replace("/dashboard/parents");
    }
  }, [parentId, router]);

  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
      <span>Opening guardian edit modal...</span>
    </div>
  );
}
