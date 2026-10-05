"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import styles from "./rooms.module.css";
import roomService from "@/services/roomService";
import Modal from "@/components/common/Modal";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import {
  HiBuildingOffice,
  HiCalendarDays,
  HiClock,
  HiUserGroup,
  HiPlus,
  HiPencilSquare,
  HiTrash,
  HiCheckCircle,
  HiExclamationTriangle,
} from "react-icons/hi2";

export default function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    building: "",
    floor: "",
    capacity: 40,
    room_type: "NORMAL",
  });
  const [formErrors, setFormErrors] = useState({});
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Delete Confirm
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadRooms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await roomService.listRooms({ limit: 100 });
      setRooms(res.items || []);
    } catch (err) {
      showToast(err.message || "Failed to load rooms", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const handleOpenAddModal = () => {
    setEditingRoom(null);
    setFormData({
      name: "",
      building: "",
      floor: "",
      capacity: 40,
      room_type: "NORMAL",
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (room) => {
    setEditingRoom(room);
    setFormData({
      name: room.name,
      building: room.building || "",
      floor: room.floor || "",
      capacity: room.capacity || 40,
      room_type: room.room_type || "NORMAL",
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!formData.name.trim()) errors.name = "Room name is required";
    if (!formData.capacity || Number(formData.capacity) <= 0) {
      errors.capacity = "Valid capacity is required";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormSubmitting(true);
    try {
      if (editingRoom) {
        await roomService.updateRoom(editingRoom.id, formData);
        showToast("Room facility updated successfully");
      } else {
        await roomService.createRoom(formData);
        showToast("Room facility created successfully");
      }
      setIsModalOpen(false);
      loadRooms();
    } catch (err) {
      showToast(err.message || "Failed to save room", "error");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await roomService.deleteRoom(deleteTarget.id);
      showToast(`Room "${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      loadRooms();
    } catch (err) {
      showToast(err.message || "Failed to delete room", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1>
            <HiBuildingOffice color="#4f46e5" /> Rooms & Facilities Management
          </h1>
          <p>Define physical classrooms, specialized science labs, computer labs, and capacities.</p>
        </div>
        <button className={styles.primaryBtn} onClick={handleOpenAddModal}>
          <HiPlus /> Add Facility / Room
        </button>
      </div>

      {/* Sub-Tabs */}
      <div className={styles.navTabs}>
        <Link href="/dashboard/timetable" className={styles.navTab}>
          <HiCalendarDays /> Master Timetables
        </Link>
        <Link href="/dashboard/timetable/rooms" className={`${styles.navTab} ${styles.navTabActive}`}>
          <HiBuildingOffice /> Rooms & Facilities
        </Link>
        <Link href="/dashboard/timetable/periods" className={styles.navTab}>
          <HiClock /> Bell Schedule (Periods)
        </Link>
        <Link href="/dashboard/timetable/availability" className={styles.navTab}>
          <HiUserGroup /> Teacher Availability
        </Link>
      </div>

      {/* Rooms Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>Loading rooms...</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Room Name</th>
                <th>Building / Location</th>
                <th>Floor</th>
                <th>Facility Type</th>
                <th>Max Capacity</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((rm) => (
                <tr key={rm.id}>
                  <td>
                    <strong>{rm.name}</strong>
                  </td>
                  <td>{rm.building || "—"}</td>
                  <td>{rm.floor || "—"}</td>
                  <td>
                    <span className={rm.room_type === "NORMAL" ? styles.badgeNormal : styles.badgeLab}>
                      {rm.room_type}
                    </span>
                  </td>
                  <td>{rm.capacity} seats</td>
                  <td>
                    <span className={styles.badgeActive}>
                      {rm.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className={styles.actionBtn}
                      title="Edit Room"
                      onClick={() => handleOpenEditModal(rm)}
                    >
                      <HiPencilSquare />
                    </button>
                    <button
                      className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                      title="Delete Room"
                      onClick={() => setDeleteTarget(rm)}
                    >
                      <HiTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRoom ? "Edit Facility / Room" : "Add Facility / Room"}
      >
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Room Name *</label>
            <input
              type="text"
              placeholder="e.g. Science Lab 1, Room 102"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{ padding: "0.5rem", border: "1px solid #cbd5e1", borderRadius: "0.375rem" }}
            />
            {formErrors.name && <span style={{ color: "#ef4444", fontSize: "0.75rem" }}>{formErrors.name}</span>}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Building</label>
              <input
                type="text"
                placeholder="e.g. Science Block"
                value={formData.building}
                onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                style={{ padding: "0.5rem", border: "1px solid #cbd5e1", borderRadius: "0.375rem" }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Floor</label>
              <input
                type="text"
                placeholder="e.g. 2nd Floor"
                value={formData.floor}
                onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                style={{ padding: "0.5rem", border: "1px solid #cbd5e1", borderRadius: "0.375rem" }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Facility Type</label>
              <select
                value={formData.room_type}
                onChange={(e) => setFormData({ ...formData, room_type: e.target.value })}
                style={{ padding: "0.5rem", border: "1px solid #cbd5e1", borderRadius: "0.375rem" }}
              >
                <option value="NORMAL">Standard Classroom</option>
                <option value="LAB">Science Laboratory</option>
                <option value="COMPUTER_LAB">Computer Lab</option>
                <option value="WORKSHOP">Technical Workshop</option>
                <option value="LIBRARY">Library / Study Hall</option>
                <option value="SPORTS_HALL">Gymnasium / Sports Hall</option>
                <option value="AUDITORIUM">Auditorium / Hall</option>
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Capacity (Seats) *</label>
              <input
                type="number"
                min="1"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                style={{ padding: "0.5rem", border: "1px solid #cbd5e1", borderRadius: "0.375rem" }}
              />
              {formErrors.capacity && <span style={{ color: "#ef4444", fontSize: "0.75rem" }}>{formErrors.capacity}</span>}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
            <button
              type="button"
              style={{ padding: "0.55rem 1rem", border: "1px solid #cbd5e1", borderRadius: "0.375rem", background: "white" }}
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.primaryBtn}
              disabled={formSubmitting}
            >
              {formSubmitting ? "Saving..." : editingRoom ? "Update Facility" : "Create Facility"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Room Facility"
        message={`Are you sure you want to delete room "${deleteTarget?.name}"?`}
        confirmText={deleteLoading ? "Deleting..." : "Delete Room"}
        type="danger"
      />

      {/* Toast */}
      {toast && (
        <div
          className={`${styles.toast} ${
            toast.type === "error" ? styles.toastError : styles.toastSuccess
          }`}
        >
          {toast.type === "error" ? <HiExclamationTriangle /> : <HiCheckCircle />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
