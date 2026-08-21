"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import styles from "./Profile.module.css";

export default function ProfilePage() {
  const { user, logout, updateProfileImage } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [selectedImage, setSelectedImage] = useState(() => user?.profileImage || null);
  const [imageError, setImageError] = useState("");
  const [imageMessage, setImageMessage] = useState("");
  const [savingImage, setSavingImage] = useState(false);

  useEffect(() => {
    if (user === null) {
      router.push("/login");
    }
  }, [user, router]);

  function handleImageSelection(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    setImageError("");
    setImageMessage("");

    if (!file) {
      return;
    }

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setImageError("Choose a PNG, JPEG, or WebP image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setImageError("Profile images must be smaller than 5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setSelectedImage(reader.result);
    reader.onerror = () => setImageError("Unable to read this image.");
    reader.readAsDataURL(file);
  }

  async function handleImageSave() {
    if (!selectedImage || selectedImage === user.profileImage) {
      return;
    }

    setSavingImage(true);
    setImageError("");
    setImageMessage("");

    try {
      await updateProfileImage(selectedImage);
      setImageMessage("Profile picture updated.");
    } catch (error) {
      setImageError(error.message || "Unable to update profile picture.");
    } finally {
      setSavingImage(false);
    }
  }

  if (!user) {
    return (
      <main className={styles.wrapper}>
        <section className={styles.card}>
          <p>Loading profile...</p>
        </section>
      </main>
    );
  }

  const currentImage = selectedImage || user?.profileImage;

  return (
    <main className={styles.profileWrapper}>
      <section className={styles.profileCard}>
        <div className={styles.profileAvatar}>
          {currentImage ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={currentImage} alt="Profile preview" />
          ) : (
            "👤"
          )}
        </div>

        <div className={styles.imageActions}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className={styles.fileInput}
            onChange={handleImageSelection}
          />
          <button
            type="button"
            className={styles.imageButton}
            onClick={() => fileInputRef.current?.click()}
          >
            Choose Profile Picture
          </button>
          <button
            type="button"
            className={styles.saveImageButton}
            onClick={handleImageSave}
            disabled={savingImage || !selectedImage || selectedImage === user.profileImage}
          >
            {savingImage ? "Saving..." : "Save Picture"}
          </button>
          {imageError && <p className={styles.imageError}>{imageError}</p>}
          {imageMessage && <p className={styles.imageMessage}>{imageMessage}</p>}
        </div>

        <h1 className={styles.profileTitle}>My Profile</h1>

        <p className={styles.profileSubtitle}>
          Manage your account information and security.
        </p>

        <div className={styles.infoCard}>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Name</span>
            <span>{user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim() || "—"}</span>
          </div>

          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Email</span>
            <span>{user.email || "—"}</span>
          </div>

          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Role</span>
            <span>{user.role || "—"}</span>
          </div>

          {user.phone && (
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Phone</span>
              <span>{user.phone}</span>
            </div>
          )}
        </div>

        <div className={styles.actionButtons}>
          <Link href="/login/change-password" className={styles.primaryButton}>
            Change Password
          </Link>

          <button
            type="button"
            className={styles.secondaryButton}
            onClick={logout}
          >
            Logout
          </button>
        </div>

        <Link href="/dashboard" className={styles.backButton}>
          ← Back to Dashboard
        </Link>
      </section>
    </main>
  );
}
