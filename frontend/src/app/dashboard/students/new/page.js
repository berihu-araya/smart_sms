"use client";

import { useRouter } from "next/navigation";
import StudentFormModal from "@/components/students/StudentFormModal";
import StudentListPage from "../page";

export default function NewStudentPage() {
  const router = useRouter();

  const handleClose = () => {
    router.push("/dashboard/students");
  };

  const handleSuccess = () => {
    router.push("/dashboard/students");
  };

  return (
    <>
      <StudentListPage />
      <StudentFormModal
        isOpen={true}
        onClose={handleClose}
        studentId={null}
        onSuccess={handleSuccess}
      />
    </>
  );
}
