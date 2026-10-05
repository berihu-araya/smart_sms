"use client";

import { useParams, useRouter } from "next/navigation";
import StudentFormModal from "@/components/students/StudentFormModal";
import StudentListPage from "../../page";

export default function EditStudentPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params?.id;

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
        studentId={studentId}
        onSuccess={handleSuccess}
      />
    </>
  );
}
