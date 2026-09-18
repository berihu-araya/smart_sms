'use client';

import React, { useState, useEffect, useCallback } from 'react';
import styles from './page.module.css';
import * as transportApi from '@/services/transportService';
import { listStudents } from '@/services/studentService';
import { listUsers } from '@/services/userService';
import { listGrades } from '@/services/gradeService';
import {
  FaBus,
  FaRoute,
  FaUsers,
  FaCalendarCheck,
  FaChartPie,
  FaCog,
  FaPlus,
  FaSearch,
  FaEdit,
  FaTrash,
  FaFilePdf,
  FaFileCsv,
  FaCheck,
  FaTimes,
  FaGasPump,
  FaUserShield,
  FaIdCard,
  FaMapMarkerAlt,
  FaClock,
  FaExclamationTriangle,
  FaClipboardList,
} from 'react-icons/fa';
import {
  HiOutlineTruck,
  HiOutlineUserGroup,
  HiOutlineMapPin,
  HiOutlineClipboardDocumentCheck,
  HiOutlineArrowPath,
} from 'react-icons/hi2';

export default function TransportDashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Data states
  const [stats, setStats] = useState(null);
  const [settings, setSettings] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [trips, setTrips] = useState([]);
  const [grades, setGrades] = useState([]);
  const [students, setStudents] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedRouteFilter, setSelectedRouteFilter] = useState('');
  const [tripDateFilter, setTripDateFilter] = useState(new Date().toISOString().split('T')[0]);

  // Modal states
  const [modalType, setModalType] = useState(null); // 'vehicle', 'driver', 'route', 'stop', 'allocation', 'trip', 'attendance'
  const [editingItem, setEditingItem] = useState(null);
  const [activeRouteForStop, setActiveRouteForStop] = useState(null);
  const [activeTripForAttendance, setActiveTripForAttendance] = useState(null);
  const [tripRoster, setTripRoster] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState({});

  // Reports state
  const [reportType, setReportType] = useState('roster'); // 'roster', 'fleet', 'attendance'
  const [selectedReportRoute, setSelectedReportRoute] = useState('');
  const [reportData, setReportData] = useState([]);

  // Forms data state
  const [formData, setFormData] = useState({});

  const showNotification = (msg, isErr = false) => {
    if (isErr) {
      setError(msg);
      setTimeout(() => setError(null), 5000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  // 1. Initial Data Fetching
  const loadStats = useCallback(async () => {
    try {
      const data = await transportApi.getTransportStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load transport stats:', err);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const data = await transportApi.getTransportSettings();
      setSettings(data);
    } catch (err) {
      console.error('Failed to load transport settings:', err);
    }
  }, []);

  const loadVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await transportApi.listVehicles({ search: searchQuery, status: statusFilter });
      setVehicles(res.data || []);
    } catch (err) {
      showNotification(err.message, true);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter]);

  const loadDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await transportApi.listDrivers({ search: searchQuery, status: statusFilter });
      setDrivers(res.data || []);
    } catch (err) {
      showNotification(err.message, true);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter]);

  const loadRoutes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await transportApi.listRoutes({ search: searchQuery, status: statusFilter });
      setRoutes(res.data || []);
    } catch (err) {
      showNotification(err.message, true);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter]);

  const loadAllocations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await transportApi.listStudentAllocations({
        search: searchQuery,
        routeId: selectedRouteFilter,
        status: statusFilter,
      });
      setAllocations(res.data || []);
    } catch (err) {
      showNotification(err.message, true);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedRouteFilter, statusFilter]);

  const loadTrips = useCallback(async () => {
    setLoading(true);
    try {
      const res = await transportApi.listTrips({
        date: tripDateFilter,
        routeId: selectedRouteFilter,
        status: statusFilter,
      });
      setTrips(res.data || []);
    } catch (err) {
      showNotification(err.message, true);
    } finally {
      setLoading(false);
    }
  }, [tripDateFilter, selectedRouteFilter, statusFilter]);

  // Load auxiliary data for forms
  const loadAuxiliaryData = async () => {
    try {
      const [gradeData, studentData, userData] = await Promise.all([
        listGrades().catch(() => []),
        listStudents({ limit: 200 }).catch(() => []),
        listUsers({ limit: 100 }).catch(() => []),
      ]);
      setGrades(gradeData || []);
      setStudents(studentData || []);
      setStaffUsers(userData || []);
    } catch (err) {
      console.error('Auxiliary data loading error:', err);
    }
  };

  useEffect(() => {
    loadStats();
    loadSettings();
    loadAuxiliaryData();
  }, [loadStats, loadSettings]);

  useEffect(() => {
    if (activeTab === 'overview') {
      loadStats();
      loadTrips();
    } else if (activeTab === 'vehicles') {
      loadVehicles();
    } else if (activeTab === 'drivers') {
      loadDrivers();
    } else if (activeTab === 'routes') {
      loadRoutes();
    } else if (activeTab === 'allocations') {
      loadAllocations();
    } else if (activeTab === 'trips') {
      loadTrips();
    }
  }, [activeTab, loadStats, loadVehicles, loadDrivers, loadRoutes, loadAllocations, loadTrips]);

  // Handle Report Generation
  const generateReport = async () => {
    setLoading(true);
    try {
      if (reportType === 'roster') {
        if (!selectedReportRoute) {
          showNotification('Please select a route to generate the roster report', true);
          setLoading(false);
          return;
        }
        const data = await transportApi.getRouteRosterReport(selectedReportRoute);
        setReportData(data || []);
      } else if (reportType === 'fleet') {
        const data = await transportApi.getFleetUtilizationReport();
        setReportData(data || []);
      } else if (reportType === 'attendance') {
        const data = await transportApi.getDailyAttendanceReport({
          date: tripDateFilter,
          routeId: selectedReportRoute || undefined,
        });
        setReportData(data || []);
      }
      showNotification('Report generated successfully!');
    } catch (err) {
      showNotification(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  // Export Report to CSV
  const exportToCsv = () => {
    if (!reportData || reportData.length === 0) {
      showNotification('No data available to export', true);
      return;
    }
    const headers = Object.keys(reportData[0]).join(',');
    const rows = reportData.map((obj) =>
      Object.values(obj)
        .map((val) => `"${val !== null && val !== undefined ? String(val).replace(/"/g, '""') : ''}"`)
        .join(',')
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `transport_${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Modal Handlers
  const openModal = (type, item = null) => {
    setModalType(type);
    setEditingItem(item);
    if (type === 'vehicle') {
      setFormData(
        item
          ? { ...item }
          : {
              vehicle_number: '',
              vehicle_model: '',
              seating_capacity: 30,
              fuel_type: 'Diesel',
              registration_number: '',
              ownership_type: 'OWNED',
              status: 'ACTIVE',
              insurance_expiry_date: '',
              fitness_certificate_expiry: '',
              notes: '',
            }
      );
    } else if (type === 'driver') {
      setFormData(
        item
          ? { ...item }
          : {
              user_id: staffUsers[0]?.id || '',
              license_number: '',
              license_type: 'Commercial',
              license_expiry_date: '',
              emergency_contact: '',
              status: 'ACTIVE',
              notes: '',
            }
      );
    } else if (type === 'route') {
      setFormData(
        item
          ? { ...item }
          : {
              route_name: '',
              route_code: '',
              start_location: '',
              end_location: '',
              default_vehicle_id: '',
              default_driver_id: '',
              distance_km: 10,
              estimated_duration_minutes: 40,
              fare_amount: 0,
              status: 'ACTIVE',
              description: '',
            }
      );
    } else if (type === 'stop') {
      setFormData(
        item
          ? { ...item }
          : {
              route_id: activeRouteForStop?.id || routes[0]?.id || '',
              stop_name: '',
              stop_order: (activeRouteForStop?.stops?.length || 0) + 1,
              pickup_time: '07:15',
              dropoff_time: '15:45',
              landmark: '',
              fare_amount: 0,
              status: 'ACTIVE',
            }
      );
    } else if (type === 'allocation') {
      setFormData(
        item
          ? { ...item }
          : {
              student_id: students[0]?.id || '',
              route_id: routes[0]?.id || '',
              pickup_stop_id: '',
              dropoff_stop_id: '',
              assigned_vehicle_id: '',
              trip_type: 'BOTH',
              seat_number: '',
              status: 'ACTIVE',
            }
      );
    } else if (type === 'trip') {
      setFormData(
        item
          ? { ...item }
          : {
              route_id: routes[0]?.id || '',
              vehicle_id: vehicles[0]?.id || '',
              driver_id: drivers[0]?.id || '',
              trip_date: new Date().toISOString().split('T')[0],
              trip_type: 'PICKUP',
              scheduled_start_time: '07:00',
              scheduled_end_time: '07:45',
              status: 'SCHEDULED',
              notes: '',
            }
      );
    }
  };

  const closeModal = () => {
    setModalType(null);
    setEditingItem(null);
    setFormData({});
  };

  // Open Attendance Sheet Modal
  const openAttendanceModal = async (trip) => {
    setActiveTripForAttendance(trip);
    setLoading(true);
    try {
      const data = await transportApi.getTripPassengerRoster(trip.id);
      setTripRoster(data.passengers || []);
      const initialMap = {};
      (data.passengers || []).forEach((p) => {
        initialMap[p.student_id] = {
          status: p.attendance_status || 'BOARDED',
          stop_id: trip.trip_type === 'DROPOFF' ? p.dropoff_stop_id : p.pickup_stop_id,
          remarks: p.remarks || '',
        };
      });
      setAttendanceRecords(initialMap);
      setModalType('attendance');
    } catch (err) {
      showNotification(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  // Save Form Handler
  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (modalType === 'vehicle') {
        if (editingItem) {
          await transportApi.updateVehicle(editingItem.id, formData);
          showNotification('Vehicle updated successfully');
        } else {
          await transportApi.createVehicle(formData);
          showNotification('Vehicle added to fleet successfully');
        }
        loadVehicles();
        loadStats();
      } else if (modalType === 'driver') {
        if (editingItem) {
          await transportApi.updateDriver(editingItem.id, formData);
          showNotification('Driver profile updated successfully');
        } else {
          await transportApi.createDriver(formData);
          showNotification('Driver registered successfully');
        }
        loadDrivers();
        loadStats();
      } else if (modalType === 'route') {
        if (editingItem) {
          await transportApi.updateRoute(editingItem.id, formData);
          showNotification('Route updated successfully');
        } else {
          await transportApi.createRoute(formData);
          showNotification('Transportation route created successfully');
        }
        loadRoutes();
        loadStats();
      } else if (modalType === 'stop') {
        if (editingItem) {
          await transportApi.updateStop(editingItem.id, formData);
          showNotification('Route stop updated successfully');
        } else {
          await transportApi.createStop(formData);
          showNotification('Stop added to route successfully');
        }
        loadRoutes();
      } else if (modalType === 'allocation') {
        if (editingItem) {
          await transportApi.updateStudentAllocation(editingItem.id, formData);
          showNotification('Student transport allocation updated');
        } else {
          await transportApi.createStudentAllocation(formData);
          showNotification('Student successfully allocated to route');
        }
        loadAllocations();
        loadStats();
      } else if (modalType === 'trip') {
        if (editingItem) {
          await transportApi.updateTrip(editingItem.id, formData);
          showNotification('Trip schedule updated');
        } else {
          await transportApi.createTrip(formData);
          showNotification('Daily transport trip scheduled');
        }
        loadTrips();
        loadStats();
      } else if (modalType === 'attendance') {
        const records = Object.keys(attendanceRecords).map((sId) => ({
          student_id: sId,
          status: attendanceRecords[sId].status,
          stop_id: attendanceRecords[sId].stop_id,
          remarks: attendanceRecords[sId].remarks,
        }));
        await transportApi.recordTripAttendance(activeTripForAttendance.id, records);
        showNotification('Passenger boarding attendance recorded successfully');
        loadTrips();
        loadStats();
      }
      closeModal();
    } catch (err) {
      showNotification(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  // Delete Action Handler
  const handleDelete = async (type, id) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    setLoading(true);
    try {
      if (type === 'vehicle') {
        await transportApi.deleteVehicle(id);
        showNotification('Vehicle deleted from fleet');
        loadVehicles();
      } else if (type === 'driver') {
        await transportApi.deleteDriver(id);
        showNotification('Driver removed');
        loadDrivers();
      } else if (type === 'route') {
        await transportApi.deleteRoute(id);
        showNotification('Route deleted');
        loadRoutes();
      } else if (type === 'stop') {
        await transportApi.deleteStop(id);
        showNotification('Stop deleted');
        loadRoutes();
      } else if (type === 'allocation') {
        await transportApi.deleteStudentAllocation(id);
        showNotification('Student allocation cancelled');
        loadAllocations();
      } else if (type === 'trip') {
        await transportApi.deleteTrip(id);
        showNotification('Trip cancelled');
        loadTrips();
      }
      loadStats();
    } catch (err) {
      showNotification(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  // Save Settings Handler
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await transportApi.updateTransportSettings(settings);
      setSettings(res);
      showNotification('Transport settings saved successfully');
    } catch (err) {
      showNotification(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* 1. Header Banner */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h1>
            <FaBus /> Fleet & Student Transport Logistics
          </h1>
          <p>
            Manage school buses, routes, ordered stops, student passenger allocations, capacity enforcement, and daily trip boarding.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.secondaryBtn} onClick={loadStats} title="Refresh Transport Stats">
            <HiOutlineArrowPath /> Refresh
          </button>
          {activeTab === 'vehicles' && (
            <button className={styles.primaryBtn} onClick={() => openModal('vehicle')}>
              <FaPlus /> Add Vehicle
            </button>
          )}
          {activeTab === 'drivers' && (
            <button className={styles.primaryBtn} onClick={() => openModal('driver')}>
              <FaPlus /> Add Driver
            </button>
          )}
          {activeTab === 'routes' && (
            <button className={styles.primaryBtn} onClick={() => openModal('route')}>
              <FaPlus /> Create Route
            </button>
          )}
          {activeTab === 'allocations' && (
            <button className={styles.primaryBtn} onClick={() => openModal('allocation')}>
              <FaPlus /> Allocate Student
            </button>
          )}
          {activeTab === 'trips' && (
            <button className={styles.primaryBtn} onClick={() => openModal('trip')}>
              <FaPlus /> Schedule Trip
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className={`${styles.alertBanner} ${styles.errorAlert}`}>
          <span>
            <FaExclamationTriangle /> {error}
          </span>
          <button className={styles.iconBtn} onClick={() => setError(null)}>
            <FaTimes />
          </button>
        </div>
      )}
      {successMsg && (
        <div className={`${styles.alertBanner} ${styles.successAlert}`}>
          <span>
            <FaCheck /> {successMsg}
          </span>
          <button className={styles.iconBtn} onClick={() => setSuccessMsg(null)}>
            <FaTimes />
          </button>
        </div>
      )}

      {/* 2. Tabs Navigation */}
      <div className={styles.tabsNav}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'overview' ? styles.activeTabBtn : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <FaChartPie /> Overview
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'vehicles' ? styles.activeTabBtn : ''}`}
          onClick={() => setActiveTab('vehicles')}
        >
          <HiOutlineTruck /> Vehicles / Fleet
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'drivers' ? styles.activeTabBtn : ''}`}
          onClick={() => setActiveTab('drivers')}
        >
          <FaUserShield /> Drivers
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'routes' ? styles.activeTabBtn : ''}`}
          onClick={() => setActiveTab('routes')}
        >
          <FaRoute /> Routes & Stops
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'allocations' ? styles.activeTabBtn : ''}`}
          onClick={() => setActiveTab('allocations')}
        >
          <FaUsers /> Student Allocations
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'trips' ? styles.activeTabBtn : ''}`}
          onClick={() => setActiveTab('trips')}
        >
          <FaCalendarCheck /> Daily Trips & Boarding
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'reports' ? styles.activeTabBtn : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          <FaClipboardList /> Reports
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'settings' ? styles.activeTabBtn : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <FaCog /> Settings
        </button>
      </div>

      {/* 3. TAB 1: OVERVIEW DASHBOARD */}
      {activeTab === 'overview' && (
        <div>
          {/* KPI Cards */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIconWrapper} style={{ background: '#e0f2fe', color: '#0284c7' }}>
                <FaBus />
              </div>
              <div className={styles.statInfo}>
                <h3>
                  {stats?.active_vehicles || 0} / {stats?.total_vehicles || 0}
                </h3>
                <p>Active Buses in Fleet</p>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIconWrapper} style={{ background: '#fef3c7', color: '#d97706' }}>
                <FaUserShield />
              </div>
              <div className={styles.statInfo}>
                <h3>{stats?.active_drivers || 0}</h3>
                <p>Registered Drivers</p>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIconWrapper} style={{ background: '#ede9fe', color: '#7c3aed' }}>
                <FaRoute />
              </div>
              <div className={styles.statInfo}>
                <h3>
                  {stats?.active_routes || 0} ({stats?.total_stops || 0} Stops)
                </h3>
                <p>Active Routes</p>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIconWrapper} style={{ background: '#dcfce7', color: '#15803d' }}>
                <FaUsers />
              </div>
              <div className={styles.statInfo}>
                <h3>{stats?.allocated_students || 0}</h3>
                <p>Allocated Passengers</p>
                <div className={styles.capacityBarContainer}>
                  <div
                    className={`${styles.capacityBarFill} ${
                      (stats?.capacity_utilization_rate || 0) > 90
                        ? styles.capacityDanger
                        : (stats?.capacity_utilization_rate || 0) > 75
                        ? styles.capacityWarning
                        : styles.capacityNormal
                    }`}
                    style={{ width: `${Math.min(stats?.capacity_utilization_rate || 0, 100)}%` }}
                  />
                </div>
                <small style={{ color: '#64748b', fontSize: '0.75rem' }}>
                  {stats?.capacity_utilization_rate || 0}% Fleet Capacity
                </small>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIconWrapper} style={{ background: '#fee2e2', color: '#dc2626' }}>
                <FaCalendarCheck />
              </div>
              <div className={styles.statInfo}>
                <h3>
                  {stats?.today_completed_trips || 0} / {stats?.today_total_trips || 0}
                </h3>
                <p>Today&apos;s Trips Completed</p>
                <small style={{ color: '#0369a1', fontWeight: 600 }}>
                  {stats?.today_boarding_rate || 0}% Boarding Rate
                </small>
              </div>
            </div>
          </div>

          {/* Today's Live Dispatch Board */}
          <div className={styles.contentCard}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                <FaCalendarCheck /> Today&apos;s Live Transport Trips
              </h2>
              <button className={styles.primaryBtn} onClick={() => openModal('trip')}>
                <FaPlus /> Dispatch New Trip
              </button>
            </div>

            {trips.length === 0 ? (
              <div className={styles.emptyState}>
                <FaBus className={styles.emptyStateIcon} />
                <h4>No trips scheduled for today</h4>
                <p>Click &quot;Schedule Trip&quot; or &quot;Dispatch New Trip&quot; to assign a bus and driver to a route.</p>
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Trip Type</th>
                      <th>Route</th>
                      <th>Bus / Capacity</th>
                      <th>Driver</th>
                      <th>Scheduled Time</th>
                      <th>Status</th>
                      <th>Boarding</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trips.map((t) => (
                      <tr key={t.id}>
                        <td>
                          <strong>{t.trip_type}</strong>
                        </td>
                        <td>
                          {t.route_name} <span style={{ color: '#64748b' }}>({t.route_code})</span>
                        </td>
                        <td>
                          <FaBus style={{ marginRight: 4, color: '#0284c7' }} />
                          {t.vehicle_number} ({t.seating_capacity} seats)
                        </td>
                        <td>
                          {t.driver_first_name} {t.driver_last_name}
                        </td>
                        <td>
                          {t.scheduled_start_time} - {t.scheduled_end_time}
                        </td>
                        <td>
                          <span
                            className={`${styles.statusBadge} ${
                              t.status === 'COMPLETED'
                                ? styles.statusActive
                                : t.status === 'IN_PROGRESS'
                                ? styles.statusBoarded
                                : t.status === 'CANCELLED'
                                ? styles.statusDanger
                                : styles.statusMaintenance
                            }`}
                          >
                            {t.status}
                          </span>
                        </td>
                        <td>
                          <strong>{t.boarded_count || 0}</strong> / {t.expected_passengers_count || 0} boarded
                        </td>
                        <td>
                          <div className={styles.actionBtnGroup}>
                            <button
                              className={styles.primaryBtn}
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                              onClick={() => openAttendanceModal(t)}
                              title="Open Boarding Attendance Sheet"
                            >
                              <HiOutlineClipboardDocumentCheck /> Attendance
                            </button>
                            <button
                              className={styles.iconBtn}
                              onClick={() => openModal('trip', t)}
                              title="Edit Trip Details"
                            >
                              <FaEdit />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. TAB 2: VEHICLES / FLEET */}
      {activeTab === 'vehicles' && (
        <div className={styles.contentCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              <HiOutlineTruck /> School Vehicle Fleet
            </h2>
            <div className={styles.filterBar}>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search plate number, model..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <select
                className={styles.filterSelect}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="OUT_OF_SERVICE">Out of Service</option>
              </select>
            </div>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Vehicle Number</th>
                  <th>Model / Year</th>
                  <th>Seating Capacity</th>
                  <th>Capacity Utilization</th>
                  <th>Fuel Type</th>
                  <th>Ownership</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>
                      No vehicles found in fleet.
                    </td>
                  </tr>
                ) : (
                  vehicles.map((v) => {
                    const allocated = v.current_allocated_students || 0;
                    const cap = v.seating_capacity || 30;
                    const pct = Math.round((allocated / cap) * 100);
                    return (
                      <tr key={v.id}>
                        <td>
                          <strong>{v.vehicle_number}</strong>
                          {v.registration_number && (
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Reg: {v.registration_number}</div>
                          )}
                        </td>
                        <td>
                          {v.vehicle_model} {v.manufacturing_year ? `(${v.manufacturing_year})` : ''}
                        </td>
                        <td>
                          <strong>{cap}</strong> Seats
                        </td>
                        <td>
                          <div style={{ width: 140 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                              <span>{allocated} assigned</span>
                              <span>{pct}%</span>
                            </div>
                            <div className={styles.capacityBarContainer}>
                              <div
                                className={`${styles.capacityBarFill} ${
                                  pct > 95
                                    ? styles.capacityDanger
                                    : pct > 80
                                    ? styles.capacityWarning
                                    : styles.capacityNormal
                                }`}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td>
                          <FaGasPump style={{ marginRight: 4, color: '#64748b' }} />
                          {v.fuel_type}
                        </td>
                        <td>{v.ownership_type}</td>
                        <td>
                          <span
                            className={`${styles.statusBadge} ${
                              v.status === 'ACTIVE'
                                ? styles.statusActive
                                : v.status === 'MAINTENANCE'
                                ? styles.statusMaintenance
                                : styles.statusInactive
                            }`}
                          >
                            {v.status}
                          </span>
                        </td>
                        <td>
                          <div className={styles.actionBtnGroup}>
                            <button className={styles.iconBtn} onClick={() => openModal('vehicle', v)} title="Edit">
                              <FaEdit />
                            </button>
                            <button
                              className={`${styles.iconBtn} ${styles.iconBtnDelete}`}
                              onClick={() => handleDelete('vehicle', v.id)}
                              title="Delete"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. TAB 3: DRIVERS */}
      {activeTab === 'drivers' && (
        <div className={styles.contentCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              <FaUserShield /> Transport Drivers (Linked to Staff)
            </h2>
            <div className={styles.filterBar}>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search driver name, license..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Driver Name</th>
                  <th>Email / Phone</th>
                  <th>License Number</th>
                  <th>License Type</th>
                  <th>Emergency Contact</th>
                  <th>Assigned Routes</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {drivers.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>
                      No drivers registered yet.
                    </td>
                  </tr>
                ) : (
                  drivers.map((d) => (
                    <tr key={d.id}>
                      <td>
                        <strong>
                          {d.first_name} {d.last_name}
                        </strong>
                      </td>
                      <td>
                        <div>{d.email}</div>
                        <small style={{ color: '#64748b' }}>{d.user_phone || d.emergency_contact || 'N/A'}</small>
                      </td>
                      <td>
                        <FaIdCard style={{ marginRight: 4, color: '#0284c7' }} />
                        {d.license_number}
                      </td>
                      <td>{d.license_type}</td>
                      <td>{d.emergency_contact || 'N/A'}</td>
                      <td>
                        <strong>{d.assigned_routes_count || 0}</strong> Route(s)
                      </td>
                      <td>
                        <span
                          className={`${styles.statusBadge} ${
                            d.status === 'ACTIVE' || d.status === 'ON_DUTY' ? styles.statusActive : styles.statusInactive
                          }`}
                        >
                          {d.status}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actionBtnGroup}>
                          <button className={styles.iconBtn} onClick={() => openModal('driver', d)} title="Edit">
                            <FaEdit />
                          </button>
                          <button
                            className={`${styles.iconBtn} ${styles.iconBtnDelete}`}
                            onClick={() => handleDelete('driver', d.id)}
                            title="Delete"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. TAB 4: ROUTES & ORDERED STOPS */}
      {activeTab === 'routes' && (
        <div>
          <div className={styles.contentCard}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                <FaRoute /> Transport Routes & Stop Sequences
              </h2>
              <div className={styles.filterBar}>
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Search route name, code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {routes.length === 0 ? (
              <div className={styles.emptyState}>
                <FaRoute className={styles.emptyStateIcon} />
                <h4>No routes created</h4>
                <p>Click &quot;Create Route&quot; to define a new bus route with designated stops.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.25rem' }}>
                {routes.map((r) => (
                  <div key={r.id} className={styles.contentCard} style={{ margin: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', color: '#0f172a' }}>
                          {r.route_name}
                        </h3>
                        <span className={styles.statusBadge} style={{ background: '#e0f2fe', color: '#0369a1' }}>
                          Code: {r.route_code}
                        </span>
                      </div>
                      <div className={styles.actionBtnGroup}>
                        <button
                          className={styles.outlineBtn}
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                          onClick={() => {
                            setActiveRouteForStop(r);
                            openModal('stop');
                          }}
                          title="Add Stop to this route"
                        >
                          <FaPlus /> Add Stop
                        </button>
                        <button className={styles.iconBtn} onClick={() => openModal('route', r)} title="Edit Route">
                          <FaEdit />
                        </button>
                        <button
                          className={`${styles.iconBtn} ${styles.iconBtnDelete}`}
                          onClick={() => handleDelete('route', r.id)}
                          title="Delete Route"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>

                    <div style={{ margin: '1rem 0', fontSize: '0.85rem', color: '#475569' }}>
                      <div>
                        <strong>Start:</strong> {r.start_location} ➔ <strong>End:</strong> {r.end_location}
                      </div>
                      <div style={{ marginTop: '0.35rem' }}>
                        <span>
                          <FaBus style={{ marginRight: 4, color: '#0284c7' }} />
                          {r.vehicle_number ? `${r.vehicle_number} (${r.seating_capacity} cap)` : 'No default bus'}
                        </span>
                        <span style={{ marginLeft: '1rem' }}>
                          <FaUserShield style={{ marginRight: 4, color: '#d97706' }} />
                          {r.driver_first_name ? `${r.driver_first_name} ${r.driver_last_name}` : 'No default driver'}
                        </span>
                      </div>
                      <div style={{ marginTop: '0.35rem', color: '#64748b' }}>
                        <span>{r.distance_km || 0} km</span> • <span>~{r.estimated_duration_minutes || 45} mins</span> •{' '}
                        <span>
                          <strong>{r.allocated_students_count || 0}</strong> Allocated Students
                        </span>
                      </div>
                    </div>

                    {/* Ordered Stops List */}
                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
                      <strong style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#64748b' }}>
                        Ordered Stops ({r.stops?.length || 0})
                      </strong>
                      <div className={styles.stopsTimeline}>
                        {(!r.stops || r.stops.length === 0) ? (
                          <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No stops added yet.</div>
                        ) : (
                          r.stops.map((st) => (
                            <div key={st.id} className={styles.timelineItem}>
                              <div className={styles.timelineDot} />
                              <div>
                                <strong style={{ fontSize: '0.85rem' }}>
                                  {st.stop_order}. {st.stop_name}
                                </strong>
                                {st.landmark && (
                                  <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: 6 }}>
                                    ({st.landmark})
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#0284c7', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span>
                                  <FaClock /> {st.pickup_time || '--:--'}
                                </span>
                                <button
                                  className={`${styles.iconBtn} ${styles.iconBtnDelete}`}
                                  style={{ width: 22, height: 22, fontSize: '0.7rem' }}
                                  onClick={() => handleDelete('stop', st.id)}
                                  title="Delete stop"
                                >
                                  <FaTrash />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. TAB 5: STUDENT TRANSPORT ALLOCATIONS */}
      {activeTab === 'allocations' && (
        <div className={styles.contentCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              <FaUsers /> Student Transport Passenger Roster
            </h2>
            <div className={styles.filterBar}>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search student, admission #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <select
                className={styles.filterSelect}
                value={selectedRouteFilter}
                onChange={(e) => setSelectedRouteFilter(e.target.value)}
              >
                <option value="">All Routes</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.route_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Admission #</th>
                  <th>Grade / Section</th>
                  <th>Route</th>
                  <th>Pickup Stop</th>
                  <th>Drop-off Stop</th>
                  <th>Bus / Seat</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {allocations.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '2rem' }}>
                      No student transport allocations found.
                    </td>
                  </tr>
                ) : (
                  allocations.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <strong>
                          {a.student_first_name} {a.student_last_name}
                        </strong>
                        {a.parent_name && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Parent: {a.parent_name}</div>
                        )}
                      </td>
                      <td>{a.admission_number}</td>
                      <td>
                        {a.grade_name ? `${a.grade_name} - ${a.section_name || ''}` : 'N/A'}
                      </td>
                      <td>
                        <strong>{a.route_name}</strong>
                      </td>
                      <td>
                        <FaMapMarkerAlt style={{ marginRight: 4, color: '#10b981' }} />
                        {a.pickup_stop_name || 'Default Start'} ({a.pickup_stop_time || '07:00'})
                      </td>
                      <td>
                        <FaMapMarkerAlt style={{ marginRight: 4, color: '#ef4444' }} />
                        {a.dropoff_stop_name || 'Default End'} ({a.dropoff_stop_time || '15:30'})
                      </td>
                      <td>
                        <FaBus style={{ marginRight: 4, color: '#0284c7' }} />
                        {a.vehicle_number || 'Route Default'} {a.seat_number ? `(Seat ${a.seat_number})` : ''}
                      </td>
                      <td>
                        <span
                          className={`${styles.statusBadge} ${
                            a.status === 'ACTIVE' ? styles.statusActive : styles.statusInactive
                          }`}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actionBtnGroup}>
                          <button className={styles.iconBtn} onClick={() => openModal('allocation', a)} title="Edit">
                            <FaEdit />
                          </button>
                          <button
                            className={`${styles.iconBtn} ${styles.iconBtnDelete}`}
                            onClick={() => handleDelete('allocation', a.id)}
                            title="Delete"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 8. TAB 6: DAILY TRIPS & ATTENDANCE */}
      {activeTab === 'trips' && (
        <div className={styles.contentCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              <FaCalendarCheck /> Daily Transport Schedules & Boarding Logging
            </h2>
            <div className={styles.filterBar}>
              <input
                type="date"
                className={styles.filterSelect}
                value={tripDateFilter}
                onChange={(e) => setTripDateFilter(e.target.value)}
              />
              <select
                className={styles.filterSelect}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Trip Type</th>
                  <th>Route</th>
                  <th>Assigned Vehicle</th>
                  <th>Assigned Driver</th>
                  <th>Schedule</th>
                  <th>Status</th>
                  <th>Boarding Summary</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {trips.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '2rem' }}>
                      No trips scheduled for this date.
                    </td>
                  </tr>
                ) : (
                  trips.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <strong>{t.trip_date?.split('T')[0] || t.trip_date}</strong>
                      </td>
                      <td>
                        <span className={styles.statusBadge} style={{ background: '#f1f5f9', color: '#0f172a' }}>
                          {t.trip_type}
                        </span>
                      </td>
                      <td>
                        <strong>{t.route_name}</strong>
                      </td>
                      <td>
                        <FaBus style={{ marginRight: 4, color: '#0284c7' }} />
                        {t.vehicle_number} ({t.seating_capacity} seats)
                      </td>
                      <td>
                        <FaUserShield style={{ marginRight: 4, color: '#d97706' }} />
                        {t.driver_first_name} {t.driver_last_name}
                      </td>
                      <td>
                        {t.scheduled_start_time} - {t.scheduled_end_time}
                      </td>
                      <td>
                        <span
                          className={`${styles.statusBadge} ${
                            t.status === 'COMPLETED'
                              ? styles.statusActive
                              : t.status === 'IN_PROGRESS'
                              ? styles.statusBoarded
                              : t.status === 'CANCELLED'
                              ? styles.statusDanger
                              : styles.statusMaintenance
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td>
                        <strong>{t.boarded_count || 0}</strong> / {t.expected_passengers_count || 0} Boarded
                      </td>
                      <td>
                        <div className={styles.actionBtnGroup}>
                          <button
                            className={styles.primaryBtn}
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                            onClick={() => openAttendanceModal(t)}
                            title="Open Boarding Attendance Sheet"
                          >
                            <HiOutlineClipboardDocumentCheck /> Attendance
                          </button>
                          <button className={styles.iconBtn} onClick={() => openModal('trip', t)} title="Edit Trip">
                            <FaEdit />
                          </button>
                          <button
                            className={`${styles.iconBtn} ${styles.iconBtnDelete}`}
                            onClick={() => handleDelete('trip', t.id)}
                            title="Delete Trip"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 9. TAB 7: REPORTS & EXPORTS */}
      {activeTab === 'reports' && (
        <div className={styles.contentCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              <FaClipboardList /> Transport Management Reports & Logs
            </h2>
            <div className={styles.filterBar}>
              <select
                className={styles.filterSelect}
                value={reportType}
                onChange={(e) => {
                  setReportType(e.target.value);
                  setReportData([]);
                }}
              >
                <option value="roster">Route Passenger Roster Report</option>
                <option value="fleet">Fleet Capacity & Utilization Report</option>
                <option value="attendance">Daily Boarding Attendance Log</option>
              </select>

              {reportType === 'roster' && (
                <select
                  className={styles.filterSelect}
                  value={selectedReportRoute}
                  onChange={(e) => setSelectedReportRoute(e.target.value)}
                >
                  <option value="">-- Select Route --</option>
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.route_name}
                    </option>
                  ))}
                </select>
              )}

              {reportType === 'attendance' && (
                <input
                  type="date"
                  className={styles.filterSelect}
                  value={tripDateFilter}
                  onChange={(e) => setTripDateFilter(e.target.value)}
                />
              )}

              <button className={styles.primaryBtn} onClick={generateReport}>
                Generate Report
              </button>
              {reportData.length > 0 && (
                <>
                  <button className={styles.secondaryBtn} onClick={exportToCsv}>
                    <FaFileCsv /> Export CSV
                  </button>
                  <button className={styles.outlineBtn} onClick={() => window.print()}>
                    <FaFilePdf /> Print View
                  </button>
                </>
              )}
            </div>
          </div>

          {reportData.length === 0 ? (
            <div className={styles.emptyState}>
              <FaClipboardList className={styles.emptyStateIcon} />
              <h4>No report generated yet</h4>
              <p>Select a report type and parameters above, then click &quot;Generate Report&quot;.</p>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    {Object.keys(reportData[0] || {}).map((col) => (
                      <th key={col}>{col.replace(/_/g, ' ')}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row, idx) => (
                    <tr key={idx}>
                      {Object.values(row).map((val, cIdx) => (
                        <td key={cIdx}>
                          {typeof val === 'boolean'
                            ? val
                              ? 'YES'
                              : 'NO'
                            : val !== null && val !== undefined
                            ? String(val)
                            : '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 10. TAB 8: SETTINGS & POLICIES */}
      {activeTab === 'settings' && settings && (
        <div className={styles.contentCard} style={{ maxWidth: 800 }}>
          <h2 className={styles.cardTitle} style={{ marginBottom: '1.25rem' }}>
            <FaCog /> Transport Policies & Configurations
          </h2>
          <form onSubmit={handleSaveSettings}>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Strict Vehicle Capacity Enforcement</label>
                <select
                  className={styles.formSelect}
                  value={settings.enforce_strict_capacity ? 'true' : 'false'}
                  onChange={(e) =>
                    setSettings({ ...settings, enforce_strict_capacity: e.target.value === 'true' })
                  }
                >
                  <option value="true">Enabled (Block allocations exceeding seating capacity)</option>
                  <option value="false">Disabled (Allow over-capacity with warning)</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Parent Boarding Notifications</label>
                <select
                  className={styles.formSelect}
                  value={settings.notify_parents_on_boarding ? 'true' : 'false'}
                  onChange={(e) =>
                    setSettings({ ...settings, notify_parents_on_boarding: e.target.value === 'true' })
                  }
                >
                  <option value="true">Enabled (Notify guardian when child boards/drops off)</option>
                  <option value="false">Disabled</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Default Morning Departure Time</label>
                <input
                  type="time"
                  className={styles.formInput}
                  value={settings.default_morning_departure || '07:00'}
                  onChange={(e) =>
                    setSettings({ ...settings, default_morning_departure: e.target.value })
                  }
                />
              </div>

              <div className={styles.formGroup}>
                <label>Default Afternoon Departure Time</label>
                <input
                  type="time"
                  className={styles.formInput}
                  value={settings.default_afternoon_departure || '15:30'}
                  onChange={(e) =>
                    setSettings({ ...settings, default_afternoon_departure: e.target.value })
                  }
                />
              </div>

              <div className={styles.formGroup}>
                <label>Transport Fare Currency</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={settings.fare_currency || 'USD'}
                  onChange={(e) => setSettings({ ...settings, fare_currency: e.target.value })}
                />
              </div>

              <div className={styles.formGroupFull} style={{ marginTop: '1rem' }}>
                <button type="submit" className={styles.primaryBtn} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODALS */}
      {/* ========================================================= */}

      {/* MODAL 1: VEHICLE MODAL */}
      {modalType === 'vehicle' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <div className={styles.modalHeader}>
              <h2>{editingItem ? 'Edit Vehicle' : 'Add Vehicle to Fleet'}</h2>
              <button className={styles.closeBtn} onClick={closeModal}>
                &times;
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className={styles.modalBody}>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label>Vehicle / Plate Number *</label>
                    <input
                      type="text"
                      required
                      className={styles.formInput}
                      placeholder="e.g. BUS-101"
                      value={formData.vehicle_number || ''}
                      onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Vehicle Model *</label>
                    <input
                      type="text"
                      required
                      className={styles.formInput}
                      placeholder="e.g. Mercedes Sprinter"
                      value={formData.vehicle_model || ''}
                      onChange={(e) => setFormData({ ...formData, vehicle_model: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Seating Capacity *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={200}
                      className={styles.formInput}
                      value={formData.seating_capacity || 30}
                      onChange={(e) => setFormData({ ...formData, seating_capacity: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Fuel Type</label>
                    <select
                      className={styles.formSelect}
                      value={formData.fuel_type || 'Diesel'}
                      onChange={(e) => setFormData({ ...formData, fuel_type: e.target.value })}
                    >
                      <option value="Diesel">Diesel</option>
                      <option value="Petrol">Petrol</option>
                      <option value="Electric">Electric</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="CNG">CNG</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Registration / Chassis Number</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      value={formData.registration_number || ''}
                      onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Status</label>
                    <select
                      className={styles.formSelect}
                      value={formData.status || 'ACTIVE'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="MAINTENANCE">Under Maintenance</option>
                      <option value="OUT_OF_SERVICE">Out of Service</option>
                      <option value="RETIRED">Retired</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Insurance Expiry Date</label>
                    <input
                      type="date"
                      className={styles.formInput}
                      value={formData.insurance_expiry_date?.split('T')[0] || ''}
                      onChange={(e) => setFormData({ ...formData, insurance_expiry_date: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Fitness / Inspection Expiry</label>
                    <input
                      type="date"
                      className={styles.formInput}
                      value={formData.fitness_certificate_expiry?.split('T')[0] || ''}
                      onChange={(e) => setFormData({ ...formData, fitness_certificate_expiry: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.outlineBtn} onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className={styles.primaryBtn} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: DRIVER MODAL (LINKED TO EXISTING STAFF/USERS) */}
      {modalType === 'driver' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <div className={styles.modalHeader}>
              <h2>{editingItem ? 'Edit Driver Profile' : 'Onboard Transport Driver'}</h2>
              <button className={styles.closeBtn} onClick={closeModal}>
                &times;
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className={styles.modalBody}>
                <div className={styles.formGrid}>
                  {!editingItem && (
                    <div className={styles.formGroupFull}>
                      <label>Select Staff Member / User Account *</label>
                      <select
                        required
                        className={styles.formSelect}
                        value={formData.user_id || ''}
                        onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                      >
                        <option value="">-- Select Staff Account --</option>
                        {staffUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.first_name} {u.last_name} ({u.email})
                          </option>
                        ))}
                      </select>
                      <small style={{ color: '#64748b' }}>
                        Reuses the existing staff record to prevent duplicate person entities.
                      </small>
                    </div>
                  )}

                  <div className={styles.formGroup}>
                    <label>Driver License Number *</label>
                    <input
                      type="text"
                      required
                      className={styles.formInput}
                      placeholder="e.g. DL-987654"
                      value={formData.license_number || ''}
                      onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>License Type</label>
                    <select
                      className={styles.formSelect}
                      value={formData.license_type || 'Commercial'}
                      onChange={(e) => setFormData({ ...formData, license_type: e.target.value })}
                    >
                      <option value="Commercial">Commercial Heavy</option>
                      <option value="Passenger Bus">Passenger Bus</option>
                      <option value="Standard">Standard</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Emergency Contact Phone</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      value={formData.emergency_contact || ''}
                      onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>License Expiry Date</label>
                    <input
                      type="date"
                      className={styles.formInput}
                      value={formData.license_expiry_date?.split('T')[0] || ''}
                      onChange={(e) => setFormData({ ...formData, license_expiry_date: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Status</label>
                    <select
                      className={styles.formSelect}
                      value={formData.status || 'ACTIVE'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="ON_DUTY">On Duty</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="SUSPENDED">Suspended</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.outlineBtn} onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className={styles.primaryBtn} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ROUTE MODAL */}
      {modalType === 'route' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <div className={styles.modalHeader}>
              <h2>{editingItem ? 'Edit Route' : 'Create Transportation Route'}</h2>
              <button className={styles.closeBtn} onClick={closeModal}>
                &times;
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className={styles.modalBody}>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label>Route Name *</label>
                    <input
                      type="text"
                      required
                      className={styles.formInput}
                      placeholder="e.g. North Highland - Campus"
                      value={formData.route_name || ''}
                      onChange={(e) => setFormData({ ...formData, route_name: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Route Code *</label>
                    <input
                      type="text"
                      required
                      className={styles.formInput}
                      placeholder="e.g. R-101-N"
                      value={formData.route_code || ''}
                      onChange={(e) => setFormData({ ...formData, route_code: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Start Location *</label>
                    <input
                      type="text"
                      required
                      className={styles.formInput}
                      placeholder="e.g. Highland Square"
                      value={formData.start_location || ''}
                      onChange={(e) => setFormData({ ...formData, start_location: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>End Location *</label>
                    <input
                      type="text"
                      required
                      className={styles.formInput}
                      placeholder="e.g. Main School Gate"
                      value={formData.end_location || ''}
                      onChange={(e) => setFormData({ ...formData, end_location: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Default Vehicle</label>
                    <select
                      className={styles.formSelect}
                      value={formData.default_vehicle_id || ''}
                      onChange={(e) => setFormData({ ...formData, default_vehicle_id: e.target.value })}
                    >
                      <option value="">-- None --</option>
                      {vehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.vehicle_number} ({v.vehicle_model} - {v.seating_capacity} seats)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Default Driver</label>
                    <select
                      className={styles.formSelect}
                      value={formData.default_driver_id || ''}
                      onChange={(e) => setFormData({ ...formData, default_driver_id: e.target.value })}
                    >
                      <option value="">-- None --</option>
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.first_name} {d.last_name} ({d.license_number})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Distance (km)</label>
                    <input
                      type="number"
                      step="0.1"
                      className={styles.formInput}
                      value={formData.distance_km || 0}
                      onChange={(e) => setFormData({ ...formData, distance_km: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Est. Duration (minutes)</label>
                    <input
                      type="number"
                      className={styles.formInput}
                      value={formData.estimated_duration_minutes || 45}
                      onChange={(e) => setFormData({ ...formData, estimated_duration_minutes: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.outlineBtn} onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className={styles.primaryBtn} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Route'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: STOP MODAL */}
      {modalType === 'stop' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <div className={styles.modalHeader}>
              <h2>{editingItem ? 'Edit Stop' : `Add Stop to ${activeRouteForStop?.route_name || 'Route'}`}</h2>
              <button className={styles.closeBtn} onClick={closeModal}>
                &times;
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className={styles.modalBody}>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label>Stop Name *</label>
                    <input
                      type="text"
                      required
                      className={styles.formInput}
                      placeholder="e.g. Oakridge Crossing"
                      value={formData.stop_name || ''}
                      onChange={(e) => setFormData({ ...formData, stop_name: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Stop Sequence Order *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      className={styles.formInput}
                      value={formData.stop_order || 1}
                      onChange={(e) => setFormData({ ...formData, stop_order: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Pickup Time</label>
                    <input
                      type="time"
                      className={styles.formInput}
                      value={formData.pickup_time || '07:15'}
                      onChange={(e) => setFormData({ ...formData, pickup_time: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Drop-off Time</label>
                    <input
                      type="time"
                      className={styles.formInput}
                      value={formData.dropoff_time || '15:45'}
                      onChange={(e) => setFormData({ ...formData, dropoff_time: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroupFull}>
                    <label>Landmark / Description</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="e.g. Opposite Post Office"
                      value={formData.landmark || ''}
                      onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.outlineBtn} onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className={styles.primaryBtn} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Stop'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: STUDENT ALLOCATION MODAL (CAPACITY ENFORCEMENT) */}
      {modalType === 'allocation' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <div className={styles.modalHeader}>
              <h2>{editingItem ? 'Edit Student Allocation' : 'Allocate Student to Transport'}</h2>
              <button className={styles.closeBtn} onClick={closeModal}>
                &times;
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className={styles.modalBody}>
                <div className={styles.formGrid}>
                  {!editingItem && (
                    <div className={styles.formGroupFull}>
                      <label>Select Student *</label>
                      <select
                        required
                        className={styles.formSelect}
                        value={formData.student_id || ''}
                        onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                      >
                        <option value="">-- Choose Student --</option>
                        {students.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.first_name} {s.last_name} (Adm: {s.admission_number})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className={styles.formGroupFull}>
                    <label>Transportation Route *</label>
                    <select
                      required
                      className={styles.formSelect}
                      value={formData.route_id || ''}
                      onChange={(e) => setFormData({ ...formData, route_id: e.target.value })}
                    >
                      <option value="">-- Select Route --</option>
                      {routes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.route_name} ({r.route_code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Pickup Stop</label>
                    <select
                      className={styles.formSelect}
                      value={formData.pickup_stop_id || ''}
                      onChange={(e) => setFormData({ ...formData, pickup_stop_id: e.target.value })}
                    >
                      <option value="">-- Route Default / Start --</option>
                      {routes
                        .find((r) => r.id === formData.route_id)
                        ?.stops?.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.stop_order}. {st.stop_name} ({st.pickup_time || '--:--'})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Drop-off Stop</label>
                    <select
                      className={styles.formSelect}
                      value={formData.dropoff_stop_id || ''}
                      onChange={(e) => setFormData({ ...formData, dropoff_stop_id: e.target.value })}
                    >
                      <option value="">-- Route Default / End --</option>
                      {routes
                        .find((r) => r.id === formData.route_id)
                        ?.stops?.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.stop_order}. {st.stop_name} ({st.dropoff_time || '--:--'})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Trip Type</label>
                    <select
                      className={styles.formSelect}
                      value={formData.trip_type || 'BOTH'}
                      onChange={(e) => setFormData({ ...formData, trip_type: e.target.value })}
                    >
                      <option value="BOTH">Both (Pickup & Drop-off)</option>
                      <option value="PICKUP_ONLY">Morning Pickup Only</option>
                      <option value="DROPOFF_ONLY">Afternoon Drop-off Only</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Seat Number</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="e.g. 4B"
                      value={formData.seat_number || ''}
                      onChange={(e) => setFormData({ ...formData, seat_number: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.outlineBtn} onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className={styles.primaryBtn} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: SCHEDULE TRIP MODAL */}
      {modalType === 'trip' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <div className={styles.modalHeader}>
              <h2>{editingItem ? 'Edit Trip Schedule' : 'Schedule Transport Trip'}</h2>
              <button className={styles.closeBtn} onClick={closeModal}>
                &times;
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className={styles.modalBody}>
                <div className={styles.formGrid}>
                  <div className={styles.formGroupFull}>
                    <label>Route *</label>
                    <select
                      required
                      className={styles.formSelect}
                      value={formData.route_id || ''}
                      onChange={(e) => {
                        const selR = routes.find((r) => r.id === e.target.value);
                        setFormData({
                          ...formData,
                          route_id: e.target.value,
                          vehicle_id: selR?.default_vehicle_id || formData.vehicle_id,
                          driver_id: selR?.default_driver_id || formData.driver_id,
                        });
                      }}
                    >
                      <option value="">-- Choose Route --</option>
                      {routes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.route_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Assign Vehicle *</label>
                    <select
                      required
                      className={styles.formSelect}
                      value={formData.vehicle_id || ''}
                      onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                    >
                      <option value="">-- Select Bus --</option>
                      {vehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.vehicle_number} ({v.seating_capacity} seats)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Assign Driver *</label>
                    <select
                      required
                      className={styles.formSelect}
                      value={formData.driver_id || ''}
                      onChange={(e) => setFormData({ ...formData, driver_id: e.target.value })}
                    >
                      <option value="">-- Select Driver --</option>
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.first_name} {d.last_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Trip Date *</label>
                    <input
                      type="date"
                      required
                      className={styles.formInput}
                      value={formData.trip_date?.split('T')[0] || ''}
                      onChange={(e) => setFormData({ ...formData, trip_date: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Trip Type</label>
                    <select
                      className={styles.formSelect}
                      value={formData.trip_type || 'PICKUP'}
                      onChange={(e) => setFormData({ ...formData, trip_type: e.target.value })}
                    >
                      <option value="PICKUP">Morning Pickup</option>
                      <option value="DROPOFF">Afternoon Drop-off</option>
                      <option value="SPECIAL">Special / Excursion</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Scheduled Start Time</label>
                    <input
                      type="time"
                      className={styles.formInput}
                      value={formData.scheduled_start_time || '07:00'}
                      onChange={(e) => setFormData({ ...formData, scheduled_start_time: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Scheduled End Time</label>
                    <input
                      type="time"
                      className={styles.formInput}
                      value={formData.scheduled_end_time || '07:45'}
                      onChange={(e) => setFormData({ ...formData, scheduled_end_time: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.outlineBtn} onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className={styles.primaryBtn} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Trip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 7: BOARDING ATTENDANCE SHEET */}
      {modalType === 'attendance' && activeTripForAttendance && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox} style={{ maxWidth: 800 }}>
            <div className={styles.modalHeader}>
              <h2>
                <HiOutlineClipboardDocumentCheck /> Passenger Boarding Sheet - {activeTripForAttendance.route_name}
              </h2>
              <button className={styles.closeBtn} onClick={closeModal}>
                &times;
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className={styles.modalBody}>
                <div style={{ marginBottom: '1rem', display: 'flex', gap: '1.5rem', fontSize: '0.85rem' }}>
                  <span>
                    <strong>Date:</strong> {activeTripForAttendance.trip_date?.split('T')[0]}
                  </span>
                  <span>
                    <strong>Type:</strong> {activeTripForAttendance.trip_type}
                  </span>
                  <span>
                    <strong>Bus:</strong> {activeTripForAttendance.vehicle_number}
                  </span>
                  <span>
                    <strong>Driver:</strong> {activeTripForAttendance.driver_first_name}{' '}
                    {activeTripForAttendance.driver_last_name}
                  </span>
                </div>

                {tripRoster.length === 0 ? (
                  <div className={styles.emptyState}>
                    <h4>No allocated students on this route</h4>
                    <p>Allocate students to this route in the &quot;Student Allocations&quot; tab.</p>
                  </div>
                ) : (
                  <div className={styles.tableWrapper}>
                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          <th>Passenger</th>
                          <th>Stop</th>
                          <th>Seat</th>
                          <th>Boarding Status</th>
                          <th>Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tripRoster.map((p) => {
                          const currentRec = attendanceRecords[p.student_id] || { status: 'BOARDED' };
                          return (
                            <tr key={p.student_id}>
                              <td>
                                <strong>
                                  {p.student_first_name} {p.student_last_name}
                                </strong>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Adm: {p.admission_number}</div>
                              </td>
                              <td>
                                {activeTripForAttendance.trip_type === 'DROPOFF'
                                  ? p.dropoff_stop_name || 'End Terminal'
                                  : p.pickup_stop_name || 'Start Terminal'}
                              </td>
                              <td>{p.seat_number || '-'}</td>
                              <td>
                                <select
                                  className={styles.formSelect}
                                  style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                                  value={currentRec.status}
                                  onChange={(e) =>
                                    setAttendanceRecords({
                                      ...attendanceRecords,
                                      [p.student_id]: {
                                        ...currentRec,
                                        status: e.target.value,
                                      },
                                    })
                                  }
                                >
                                  <option value="BOARDED">Boarded</option>
                                  <option value="DROPPED_OFF">Dropped Off</option>
                                  <option value="ABSENT">Absent</option>
                                  <option value="EXCUSED">Excused</option>
                                  <option value="SKIPPED">Skipped</option>
                                </select>
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className={styles.formInput}
                                  style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                                  placeholder="Notes..."
                                  value={currentRec.remarks || ''}
                                  onChange={(e) =>
                                    setAttendanceRecords({
                                      ...attendanceRecords,
                                      [p.student_id]: {
                                        ...currentRec,
                                        remarks: e.target.value,
                                      },
                                    })
                                  }
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.outlineBtn} onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className={styles.primaryBtn} disabled={loading || tripRoster.length === 0}>
                  {loading ? 'Saving...' : 'Submit Attendance Sheet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
