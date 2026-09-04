"use client";

import { useRouter } from "next/navigation";
import TeacherFormModal from "@/components/teachers/TeacherFormModal";
import TeacherListPage from "../page";

export default function NewTeacherPage() {
  const router = useRouter();

  const handleClose = () => {
    router.push("/dashboard/teachers");
  };

  const handleSuccess = () => {
    router.push("/dashboard/teachers");
  };

  return (
    <>
      <TeacherListPage />
      <TeacherFormModal
        isOpen={true}
        onClose={handleClose}
        teacherId={null}
        onSuccess={handleSuccess}
      />
    </>
  );
}
