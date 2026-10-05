"use client";

import { useParams, useRouter } from "next/navigation";
import TeacherFormModal from "@/components/teachers/TeacherFormModal";
import TeacherListPage from "../../page";

export default function EditTeacherPage() {
  const params = useParams();
  const router = useRouter();
  const teacherId = params?.id;

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
        teacherId={teacherId}
        onSuccess={handleSuccess}
      />
    </>
  );
}
