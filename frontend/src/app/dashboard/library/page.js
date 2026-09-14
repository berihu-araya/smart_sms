'use client';

import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import styles from './page.module.css';
import { AuthContext } from '@/context/AuthContext';
import {
  getLibraryDashboardStats,
  getLibrarySettings,
  updateLibrarySettings,
  listLibraryBooks,
  getLibraryBook,
  createLibraryBook,
  updateLibraryBook,
  deleteLibraryBook,
  listBookCopies,
  createBookCopy,
  createBulkBookCopies,
  updateBookCopy,
  deleteBookCopy,
  findCopyByBarcode,
  listLibraryMembers,
  syncLibraryMembers,
  updateLibraryMemberStatus,
  listLibraryLoans,
  issueLibraryLoan,
  returnLibraryLoan,
  renewLibraryLoan,
  getMyLibraryLoans,
  listLibraryReservations,
  createLibraryReservation,
  cancelLibraryReservation,
  getMyLibraryReservations,
  listLibraryFines,
  payLibraryFine,
  waiveLibraryFine,
  getMyLibraryFines,
  listLibraryCategories,
  createLibraryCategory,
  deleteLibraryCategory,
  listLibrarySubjects,
  createLibrarySubject,
  deleteLibrarySubject,
  listLibraryAuthors,
  createLibraryAuthor,
  deleteLibraryAuthor,
  listLibraryPublishers,
  createLibraryPublisher,
  deleteLibraryPublisher,
  listLibraryAuditLogs,
} from '@/services/libraryService';

import {
  FaBook,
  FaBookReader,
  FaBarcode,
  FaHistory,
  FaUsers,
  FaMoneyBillWave,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSearch,
  FaPlus,
  FaEdit,
  FaTrash,
  FaUndo,
  FaSync,
  FaLayerGroup,
  FaCog,
  FaChartBar,
  FaSignature,
  FaHandHolding,
  FaFileAlt,
  FaTags,
  FaBuilding,
  FaPenNib,
  FaTimes,
  FaPrint,
  FaCalendarAlt,
  FaFilter,
  FaThLarge,
  FaList,
  FaUserGraduate,
  FaChalkboardTeacher,
  FaUserTie,
  FaArrowRight,
  FaInfoCircle,
  FaCheck,
  FaQrcode,
} from 'react-icons/fa';

export default function LibraryDashboardPage() {
  const { user } = useContext(AuthContext);

  // Role detection
  const roleName = (user?.role || user?.role_name || '').toLowerCase();
  const isLibrarianOrAdmin = roleName.includes('librarian') || roleName.includes('admin');
  const isStaff = roleName.includes('staff');
  const isStudent = roleName.includes('student');
  const isTeacher = roleName.includes('teacher') && !isLibrarianOrAdmin;
  const isPatronOnly = (isStudent || isTeacher) && !isLibrarianOrAdmin && !isStaff;

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState(isPatronOnly ? 'my_library' : 'overview');

  // Core Data States
  const [stats, setStats] = useState(null);
  const [settings, setSettings] = useState(null);
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [publishers, setPublishers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [fines, setFines] = useState([]);
  const [members, setMembers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [myLoans, setMyLoans] = useState([]);
  const [myReservations, setMyReservations] = useState([]);
  const [myFines, setMyFines] = useState([]);

  // UI States
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedAvailability, setSelectedAvailability] = useState('');
  const [catalogViewMode, setCatalogViewMode] = useState('grid');
  const [alertMsg, setAlertMsg] = useState(null);

  // Modals & Drawers
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [selectedBookForDetails, setSelectedBookForDetails] = useState(null);
  const [bookCopies, setBookCopies] = useState([]);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [activeLoanForAction, setActiveLoanForAction] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [activeFineForPayment, setActiveFineForPayment] = useState(null);
  const [isWaiveModalOpen, setIsWaiveModalOpen] = useState(false);
  const [activeFineForWaive, setActiveFineForWaive] = useState(null);
  const [isAddCopyModalOpen, setIsAddCopyModalOpen] = useState(false);
  const [isMasterDataModalOpen, setIsMasterDataModalOpen] = useState(false);
  const [masterDataType, setMasterDataType] = useState('category'); // 'category' | 'subject' | 'author' | 'publisher'

  // Master Data sub-tab
  const [masterSubTab, setMasterSubTab] = useState('categories');

  // Signature Pad Ref & Drawing State
  const signatureCanvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureData, setSignatureData] = useState(null);
  const [acknowledgmentType, setAcknowledgmentType] = useState('SIGNATURE');

  // Forms
  const [bookFormData, setBookFormData] = useState({
    title: '',
    isbn: '',
    edition: '',
    category_id: '',
    subject_id: '',
    publisher_id: '',
    publication_year: new Date().getFullYear(),
    language: 'English',
    pages: '',
    ddc_number: '',
    shelf_location: '',
    cover_image: '',
    description: '',
    author_ids: [],
    initial_copies: 1,
    accession_prefix: 'LIB',
    call_number: '',
  });

  const [issueFormData, setIssueFormData] = useState({
    identifier: '', // barcode / accession / title
    memberIdentifier: '', // student ID / email / member number
    loan_duration_days: '',
    condition_on_issue: 'GOOD',
    issue_notes: '',
  });
  const [memberRoleFilter, setMemberRoleFilter] = useState('ALL');

  const [returnFormData, setReturnFormData] = useState({
    condition_on_return: 'GOOD',
    damage_fine_amount: 0,
    return_notes: '',
  });

  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    payment_method: 'CASH',
    reference_number: '',
    notes: '',
  });

  const [waiveFormData, setWaiveFormData] = useState({
    waived_reason: '',
  });

  const [policyFormData, setPolicyFormData] = useState({});

  // Helper Toast
  const showToast = (message, type = 'success') => {
    setAlertMsg({ message, type });
    setTimeout(() => setAlertMsg(null), 4500);
  };

  // Initial Data Fetch
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsData, catData, subData, authData, pubData] = await Promise.all([
        getLibrarySettings().catch(() => null),
        listLibraryCategories().catch(() => []),
        listLibrarySubjects().catch(() => []),
        listLibraryAuthors().catch(() => []),
        listLibraryPublishers().catch(() => []),
      ]);

      setSettings(settingsData);
      if (settingsData) setPolicyFormData(settingsData);
      setCategories(catData || []);
      setSubjects(subData || []);
      setAuthors(authData || []);
      setPublishers(pubData || []);

      // Role specific data
      if (isPatronOnly) {
        const [booksData, myL, myR, myF] = await Promise.all([
          listLibraryBooks().catch(() => []),
          getMyLibraryLoans().catch(() => []),
          getMyLibraryReservations().catch(() => []),
          getMyLibraryFines().catch(() => []),
        ]);
        setBooks(booksData || []);
        setMyLoans(myL || []);
        setMyReservations(myR || []);
        setMyFines(myF || []);
      } else {
        const [statsData, booksData, loansData, resData, finesData, memData, auditData] = await Promise.all([
          getLibraryDashboardStats().catch(() => null),
          listLibraryBooks().catch(() => []),
          listLibraryLoans().catch(() => []),
          listLibraryReservations().catch(() => []),
          listLibraryFines().catch(() => []),
          listLibraryMembers().catch(() => []),
          listLibraryAuditLogs().catch(() => []),
        ]);
        setStats(statsData);
        setBooks(booksData || []);
        setLoans(loansData || []);
        setReservations(resData || []);
        setFines(finesData || []);
        setMembers(memData || []);
        setAuditLogs(auditData || []);
      }
    } catch (err) {
      console.error('Failed to load library data:', err);
      showToast('Error loading library resources: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [isPatronOnly]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Signature Pad Handlers
  const startDrawing = (e) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e1b4b';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      const canvas = signatureCanvasRef.current;
      if (canvas) {
        setSignatureData(canvas.toDataURL('image/png'));
      }
    }
  };

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setSignatureData(null);
    }
  };

  // Filtered Books Catalog
  const filteredBooks = books.filter((b) => {
    const matchSearch =
      !searchQuery ||
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.isbn && b.isbn.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (b.shelf_location && b.shelf_location.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchCategory = !selectedCategory || b.category_id === selectedCategory;
    const matchSubject = !selectedSubject || b.subject_id === selectedSubject;
    const matchAvailability =
      !selectedAvailability ||
      (selectedAvailability === 'available' && b.available_copies_count > 0) ||
      (selectedAvailability === 'unavailable' && b.available_copies_count === 0);

    return matchSearch && matchCategory && matchSubject && matchAvailability;
  });

  // Open Book Details & Copies Drawer
  const handleOpenBookDetails = async (book) => {
    setSelectedBookForDetails(book);
    try {
      const copies = await listBookCopies(book.id);
      setBookCopies(copies || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Handlers for Book Create / Edit
  const handleSaveBook = async (e) => {
    e.preventDefault();
    try {
      if (editingBook) {
        await updateLibraryBook(editingBook.id, bookFormData);
        showToast('Book updated successfully');
      } else {
        await createLibraryBook(bookFormData);
        showToast('Book and copies registered successfully');
      }
      setIsBookModalOpen(false);
      setEditingBook(null);
      fetchAllData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteBook = async (bookId) => {
    if (!window.confirm('Are you sure you want to delete this book and its physical copies?')) return;
    try {
      await deleteLibraryBook(bookId);
      showToast('Book removed from catalog');
      if (selectedBookForDetails?.id === bookId) setSelectedBookForDetails(null);
      fetchAllData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Handlers for Circulation
  const handleIssueLoanSubmit = async (e) => {
    e.preventDefault();
    try {
      await issueLibraryLoan({
        copy_id: issueFormData.copy_id || undefined,
        accession_number: issueFormData.identifier,
        barcode: issueFormData.identifier,
        accessionNumber: issueFormData.identifier,
        member_number: issueFormData.memberIdentifier,
        memberNumber: issueFormData.memberIdentifier,
        member_id: issueFormData.member_id || undefined,
        loan_duration_days: issueFormData.loan_duration_days || undefined,
        loanDurationDays: issueFormData.loan_duration_days || undefined,
        condition_on_issue: issueFormData.condition_on_issue,
        conditionOnIssue: issueFormData.condition_on_issue,
        borrower_acknowledgment_type: acknowledgmentType,
        borrowerAcknowledgmentType: acknowledgmentType,
        borrower_signature: signatureData || (acknowledgmentType === 'DIGITAL_ACK' ? 'E-ACK-CONFIRMED' : null),
        borrowerSignature: signatureData || (acknowledgmentType === 'DIGITAL_ACK' ? 'E-ACK-CONFIRMED' : null),
        issue_notes: issueFormData.issue_notes,
        issueNotes: issueFormData.issue_notes,
      });

      showToast('Book issued successfully!');
      setIsIssueModalOpen(false);
      setIssueFormData({ identifier: '', memberIdentifier: '', loan_duration_days: '', condition_on_issue: 'GOOD', issue_notes: '' });
      setSignatureData(null);
      fetchAllData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    if (!activeLoanForAction) return;
    try {
      const res = await returnLibraryLoan(activeLoanForAction.id, returnFormData);
      showToast(res.overdueFineAmount > 0 ? `Book returned. Overdue fine assessed: $${res.overdueFineAmount}` : 'Book returned successfully!');
      setIsReturnModalOpen(false);
      setActiveLoanForAction(null);
      fetchAllData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleRenewLoan = async (loanId) => {
    if (!window.confirm('Renew this book loan according to library policy?')) return;
    try {
      await renewLibraryLoan(loanId);
      showToast('Loan renewed successfully!');
      fetchAllData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Reservation Handlers
  const handleReserveBook = async (bookId) => {
    try {
      await createLibraryReservation({ book_id: bookId });
      showToast('Book reserved successfully! You will be notified when ready for pickup.');
      fetchAllData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleCancelReservation = async (reservationId) => {
    if (!window.confirm('Cancel this book reservation?')) return;
    try {
      await cancelLibraryReservation(reservationId);
      showToast('Reservation cancelled');
      fetchAllData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Fine Payment & Waiver Handlers
  const handlePayFineSubmit = async (e) => {
    e.preventDefault();
    if (!activeFineForPayment) return;
    try {
      await payLibraryFine({
        fine_id: activeFineForPayment.id,
        amount: Number(paymentFormData.amount),
        payment_method: paymentFormData.payment_method,
        reference_number: paymentFormData.reference_number,
        notes: paymentFormData.notes,
      });
      showToast('Payment recorded successfully with receipt issued!');
      setIsPaymentModalOpen(false);
      setActiveFineForPayment(null);
      fetchAllData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleWaiveFineSubmit = async (e) => {
    e.preventDefault();
    if (!activeFineForWaive) return;
    try {
      await waiveLibraryFine({
        fine_id: activeFineForWaive.id,
        waived_reason: waiveFormData.waived_reason,
      });
      showToast('Fine waived and recorded in audit log');
      setIsWaiveModalOpen(false);
      setActiveFineForWaive(null);
      fetchAllData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Policy Settings Handler
  const handleSavePolicy = async (e) => {
    e.preventDefault();
    try {
      await updateLibrarySettings(policyFormData);
      showToast('Library configuration and policies saved successfully');
      fetchAllData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Sync Members
  const handleSyncMembers = async () => {
    try {
      const res = await syncLibraryMembers();
      showToast(`Library member accounts synced (${res.count} updated)`);
      fetchAllData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Add Copy to existing book
  const handleAddCopySubmit = async (e, bookId) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const quantity = Number(formData.get('quantity') || 1);
    try {
      if (quantity > 1) {
        await createBulkBookCopies({
          book_id: bookId,
          quantity,
          accession_prefix: formData.get('accession_prefix') || 'LIB',
          call_number: formData.get('call_number') || null,
          condition: formData.get('condition') || 'EXCELLENT',
          price: formData.get('price') || null,
        });
        showToast(`${quantity} copies added to inventory`);
      } else {
        await createBookCopy({
          book_id: bookId,
          accession_number: formData.get('accession_number'),
          barcode: formData.get('barcode') || formData.get('accession_number'),
          call_number: formData.get('call_number') || null,
          condition: formData.get('condition') || 'EXCELLENT',
          price: formData.get('price') || null,
        });
        showToast('Book copy registered');
      }
      setIsAddCopyModalOpen(false);
      if (selectedBookForDetails) {
        const copies = await listBookCopies(bookId);
        setBookCopies(copies || []);
      }
      fetchAllData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className={styles.container}>
      {/* Toast Alert */}
      {alertMsg && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            padding: '1rem 1.5rem',
            borderRadius: '12px',
            background: alertMsg.type === 'error' ? '#ef4444' : '#10b981',
            color: '#ffffff',
            fontWeight: 600,
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          {alertMsg.type === 'error' ? <FaExclamationTriangle /> : <FaCheckCircle />}
          {alertMsg.message}
        </div>
      )}

      {/* Header Banner */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h1>
            <FaBookReader /> {settings?.library_name || 'Library & Media Resource Management'}
          </h1>
          <p>
            {settings?.branch || 'Main Campus'} • {settings?.opening_hours || 'Mon-Fri 08:00 - 17:00'} • Configurable Circulation & Media Center
          </p>
        </div>

        <div className={styles.headerActions}>
          {!isPatronOnly && (
            <>
              <button
                className={styles.primaryBtn}
                onClick={() => {
                  setSignatureData(null);
                  setIsIssueModalOpen(true);
                }}
              >
                <FaHandHolding /> Issue Book
              </button>
              <button
                className={styles.secondaryBtn}
                onClick={() => {
                  setEditingBook(null);
                  setBookFormData({
                    title: '',
                    isbn: '',
                    edition: '',
                    category_id: categories[0]?.id || '',
                    subject_id: subjects[0]?.id || '',
                    publisher_id: publishers[0]?.id || '',
                    publication_year: new Date().getFullYear(),
                    language: 'English',
                    pages: '',
                    ddc_number: '',
                    shelf_location: '',
                    cover_image: '',
                    description: '',
                    author_ids: [],
                    initial_copies: 1,
                    accession_prefix: 'LIB',
                    call_number: '',
                  });
                  setIsBookModalOpen(true);
                }}
              >
                <FaPlus /> Add New Book
              </button>
            </>
          )}

          <button className={styles.secondaryBtn} onClick={fetchAllData} title="Refresh library data">
            <FaSync />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className={styles.tabsContainer}>
        {isPatronOnly ? (
          <>
            <button
              className={`${styles.tabBtn} ${activeTab === 'my_library' ? styles.activeTabBtn : ''}`}
              onClick={() => setActiveTab('my_library')}
            >
              <FaBook /> My Active Loans ({myLoans.length})
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === 'catalog' ? styles.activeTabBtn : ''}`}
              onClick={() => setActiveTab('catalog')}
            >
              <FaSearch /> Explore Catalog
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === 'my_reservations' ? styles.activeTabBtn : ''}`}
              onClick={() => setActiveTab('my_reservations')}
            >
              <FaClock /> My Reservations ({myReservations.length})
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === 'my_fines' ? styles.activeTabBtn : ''}`}
              onClick={() => setActiveTab('my_fines')}
            >
              <FaMoneyBillWave /> Fines & History
            </button>
          </>
        ) : (
          <>
            <button
              className={`${styles.tabBtn} ${activeTab === 'overview' ? styles.activeTabBtn : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <FaChartBar /> Overview
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === 'catalog' ? styles.activeTabBtn : ''}`}
              onClick={() => setActiveTab('catalog')}
            >
              <FaBook /> Books Catalog
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === 'circulation' ? styles.activeTabBtn : ''}`}
              onClick={() => setActiveTab('circulation')}
            >
              <FaHistory /> Circulation Desk
              {loans.filter((l) => l.status === 'ACTIVE' && new Date(l.due_date) < new Date()).length > 0 && (
                <span className={styles.tabBadge}>
                  {loans.filter((l) => l.status === 'ACTIVE' && new Date(l.due_date) < new Date()).length} overdue
                </span>
              )}
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === 'reservations' ? styles.activeTabBtn : ''}`}
              onClick={() => setActiveTab('reservations')}
            >
              <FaClock /> Reservations ({reservations.filter((r) => r.status === 'PENDING' || r.status === 'READY_FOR_PICKUP').length})
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === 'fines' ? styles.activeTabBtn : ''}`}
              onClick={() => setActiveTab('fines')}
            >
              <FaMoneyBillWave /> Fines & Cashier
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === 'members' ? styles.activeTabBtn : ''}`}
              onClick={() => setActiveTab('members')}
            >
              <FaUsers /> Members ({members.length})
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === 'master' ? styles.activeTabBtn : ''}`}
              onClick={() => setActiveTab('master')}
            >
              <FaLayerGroup /> Master Data
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === 'audit' ? styles.activeTabBtn : ''}`}
              onClick={() => setActiveTab('audit')}
            >
              <FaHistory /> Audit Trail
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === 'settings' ? styles.activeTabBtn : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <FaCog /> Policy & Config
            </button>
          </>
        )}
      </div>

      {/* TAB 1: OVERVIEW (Librarian/Admin) */}
      {!isPatronOnly && activeTab === 'overview' && stats && (
        <>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIconWrapper} style={{ background: '#e0e7ff', color: '#4338ca' }}>
                <FaBook />
              </div>
              <div>
                <div className={styles.statLabel}>Total Book Titles</div>
                <div className={styles.statValue}>{stats.total_titles || 0}</div>
                <div className={styles.statSubtext}>{stats.total_copies || 0} physical copies across shelves</div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIconWrapper} style={{ background: '#dcfce7', color: '#15803d' }}>
                <FaCheckCircle />
              </div>
              <div>
                <div className={styles.statLabel}>Available Copies</div>
                <div className={styles.statValue}>{stats.available_copies || 0}</div>
                <div className={styles.statSubtext}>Ready for immediate loan</div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIconWrapper} style={{ background: '#fef3c7', color: '#d97706' }}>
                <FaHandHolding />
              </div>
              <div>
                <div className={styles.statLabel}>Active Loans</div>
                <div className={styles.statValue}>{stats.active_loans || 0}</div>
                <div className={styles.statSubtext}>{stats.borrowed_copies || 0} copies in circulation</div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIconWrapper} style={{ background: '#fee2e2', color: '#b91c1c' }}>
                <FaExclamationTriangle />
              </div>
              <div>
                <div className={styles.statLabel}>Overdue Loans</div>
                <div className={styles.statValue} style={{ color: '#dc2626' }}>
                  {stats.overdue_loans || 0}
                </div>
                <div className={styles.statSubtext}>Action required / fine accruing</div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIconWrapper} style={{ background: '#f3e8ff', color: '#7e22ce' }}>
                <FaMoneyBillWave />
              </div>
              <div>
                <div className={styles.statLabel}>Fines Collected</div>
                <div className={styles.statValue}>${Number(stats.total_fines_collected || 0).toFixed(2)}</div>
                <div className={styles.statSubtext}>Outstanding: ${Number(stats.outstanding_fines || 0).toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* Top Borrowed Books & Recent Circulation Feed */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className={styles.tableContainer} style={{ padding: '1.25rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FaChartBar color="#4f46e5" /> Most Popular Titles
              </h3>
              {stats.top_borrowed_books?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {stats.top_borrowed_books.map((b, idx) => (
                    <div
                      key={b.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem',
                        background: '#f8fafc',
                        borderRadius: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontWeight: 800, color: '#4f46e5', width: '20px' }}>#{idx + 1}</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{b.title}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {b.category_name} • {b.subject_name || 'General'}
                          </div>
                        </div>
                      </div>
                      <span className={`${styles.badge} ${styles.badgePurple}`}>{b.borrow_count} checkouts</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No circulation history recorded yet.</p>
              )}
            </div>

            <div className={styles.tableContainer} style={{ padding: '1.25rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FaClock color="#059669" /> Quick Actions & Barcode Lookup
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
                Scan or type any book barcode, accession number, or member card ID to quickly check status or process issues/returns.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <input
                  type="text"
                  placeholder="Scan accession/barcode (e.g. LIB-2026-00001)..."
                  className={styles.formInput}
                  style={{ flex: 1 }}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      try {
                        const copy = await findCopyByBarcode(e.target.value.trim());
                        if (copy) {
                          alert(`Found Copy: ${copy.book_title} (${copy.accession_number})\nStatus: ${copy.status}\nShelf: ${copy.shelf_location || 'N/A'}`);
                        }
                      } catch (err) {
                        showToast('Barcode not found: ' + err.message, 'error');
                      }
                    }
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  className={styles.outlineBtn}
                  onClick={() => {
                    setActiveTab('circulation');
                  }}
                >
                  <FaHistory /> View Active Loans
                </button>
                <button
                  className={styles.outlineBtn}
                  onClick={() => {
                    setActiveTab('members');
                  }}
                >
                  <FaUsers /> Member Directory
                </button>
                <button className={styles.outlineBtn} onClick={handleSyncMembers}>
                  <FaSync /> Sync All Users
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: BOOKS CATALOG */}
      {activeTab === 'catalog' && (
        <>
          {/* Filters Bar */}
          <div className={styles.filterBar}>
            <div className={styles.searchWrapper}>
              <FaSearch color="#94a3b8" />
              <input
                type="text"
                placeholder="Search by title, ISBN, shelf location, or classification..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                >
                  <FaTimes />
                </button>
              )}
            </div>

            <div className={styles.filterGroup}>
              <select
                className={styles.filterSelect}
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                className={styles.filterSelect}
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
              >
                <option value="">All Subjects</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              <select
                className={styles.filterSelect}
                value={selectedAvailability}
                onChange={(e) => setSelectedAvailability(e.target.value)}
              >
                <option value="">All Availability</option>
                <option value="available">Available Now</option>
                <option value="unavailable">All Checked Out</option>
              </select>

              <div style={{ display: 'flex', gap: '0.25rem', borderLeft: '1px solid #cbd5e1', paddingLeft: '0.5rem' }}>
                <button
                  className={`${styles.outlineBtn} ${catalogViewMode === 'grid' ? styles.activeTabBtn : ''}`}
                  onClick={() => setCatalogViewMode('grid')}
                  title="Grid View"
                >
                  <FaThLarge />
                </button>
                <button
                  className={`${styles.outlineBtn} ${catalogViewMode === 'list' ? styles.activeTabBtn : ''}`}
                  onClick={() => setCatalogViewMode('list')}
                  title="Table View"
                >
                  <FaList />
                </button>
              </div>
            </div>
          </div>

          {/* Books List / Grid */}
          {filteredBooks.length > 0 ? (
            catalogViewMode === 'grid' ? (
              <div className={styles.booksGrid}>
                {filteredBooks.map((book) => (
                  <div key={book.id} className={styles.bookCard}>
                    <div className={styles.bookCoverWrapper}>
                      {book.cover_image ? (
                        <img src={book.cover_image} alt={book.title} className={styles.bookCoverImg} />
                      ) : (
                        <div className={styles.bookCoverPlaceholder}>
                          <FaBook />
                        </div>
                      )}
                      <span
                        className={`${styles.bookStatusBadge} ${book.available_copies_count > 0 ? styles.statusAvailable : styles.statusUnavailable
                          }`}
                      >
                        {book.available_copies_count > 0 ? `${book.available_copies_count} Available` : 'Checked Out'}
                      </span>
                    </div>

                    <div className={styles.bookBody}>
                      {book.category_name && <span className={styles.bookCategoryTag}>{book.category_name}</span>}
                      <h3 className={styles.bookTitle} title={book.title}>
                        {book.title}
                      </h3>
                      <div className={styles.bookAuthors}>
                        {book.authors?.length > 0 ? book.authors.map((a) => a.name).join(', ') : 'Unknown Author'}
                      </div>

                      <div className={styles.bookMetaRow}>
                        <span>Shelf: {book.shelf_location || 'General'}</span>
                        <span>DDC: {book.ddc_number || 'N/A'}</span>
                      </div>
                    </div>

                    <div className={styles.bookCardFooter}>
                      <button className={styles.outlineBtn} onClick={() => handleOpenBookDetails(book)}>
                        <FaBook /> Details & Copies
                      </button>

                      {isPatronOnly ? (
                        <button
                          className={styles.primaryBtn}
                          style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
                          onClick={() => handleReserveBook(book.id)}
                        >
                          <FaClock /> Reserve
                        </button>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button
                            className={styles.outlineBtn}
                            onClick={() => {
                              setEditingBook(book);
                              setBookFormData({
                                title: book.title,
                                isbn: book.isbn || '',
                                edition: book.edition || '',
                                category_id: book.category_id || '',
                                subject_id: book.subject_id || '',
                                publisher_id: book.publisher_id || '',
                                publication_year: book.publication_year || '',
                                language: book.language || 'English',
                                pages: book.pages || '',
                                ddc_number: book.ddc_number || '',
                                shelf_location: book.shelf_location || '',
                                cover_image: book.cover_image || '',
                                description: book.description || '',
                                author_ids: book.authors?.map((a) => a.id) || [],
                              });
                              setIsBookModalOpen(true);
                            }}
                            title="Edit metadata"
                          >
                            <FaEdit />
                          </button>
                          <button
                            className={styles.dangerBtn}
                            onClick={() => handleDeleteBook(book.id)}
                            title="Delete book"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.tableContainer}>
                <div className={styles.tableWrapper}>
                  <table className={styles.customTable}>
                    <thead>
                      <tr>
                        <th>Title & ISBN</th>
                        <th>Category / Subject</th>
                        <th>Authors</th>
                        <th>Shelf Location</th>
                        <th>Total / Available</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBooks.map((book) => (
                        <tr key={book.id}>
                          <td>
                            <div style={{ fontWeight: 700 }}>{book.title}</div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>ISBN: {book.isbn || 'N/A'}</div>
                          </td>
                          <td>
                            <div>{book.category_name || '-'}</div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{book.subject_name || '-'}</div>
                          </td>
                          <td>{book.authors?.map((a) => a.name).join(', ') || 'Unknown'}</td>
                          <td>{book.shelf_location || 'General Stacks'}</td>
                          <td>
                            <span className={book.available_copies_count > 0 ? styles.badgeGreen : styles.badgeRed}>
                              {book.available_copies_count} / {book.total_copies_count} copies
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button className={styles.outlineBtn} onClick={() => handleOpenBookDetails(book)}>
                                Details
                              </button>
                              {isPatronOnly ? (
                                <button className={styles.primaryBtn} onClick={() => handleReserveBook(book.id)}>
                                  Reserve
                                </button>
                              ) : (
                                <>
                                  <button
                                    className={styles.outlineBtn}
                                    onClick={() => {
                                      setEditingBook(book);
                                      setBookFormData({
                                        title: book.title,
                                        isbn: book.isbn || '',
                                        edition: book.edition || '',
                                        category_id: book.category_id || '',
                                        subject_id: book.subject_id || '',
                                        publisher_id: book.publisher_id || '',
                                        publication_year: book.publication_year || '',
                                        language: book.language || 'English',
                                        pages: book.pages || '',
                                        ddc_number: book.ddc_number || '',
                                        shelf_location: book.shelf_location || '',
                                        cover_image: book.cover_image || '',
                                        description: book.description || '',
                                        author_ids: book.authors?.map((a) => a.id) || [],
                                      });
                                      setIsBookModalOpen(true);
                                    }}
                                  >
                                    <FaEdit />
                                  </button>
                                  <button className={styles.dangerBtn} onClick={() => handleDeleteBook(book.id)}>
                                    <FaTrash />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyStateIcon}>
                <FaBook />
              </div>
              <h3 className={styles.emptyStateTitle}>No Books Found</h3>
              <p className={styles.emptyStateText}>Try adjusting your search criteria or add new books to the catalog.</p>
            </div>
          )}
        </>
      )}

      {/* TAB 3: CIRCULATION DESK (Librarian/Admin) */}
      {!isPatronOnly && activeTab === 'circulation' && (
        <div className={styles.tableContainer}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Active & Historical Loans</h3>
            <button
              className={styles.primaryBtn}
              onClick={() => {
                setSignatureData(null);
                setIsIssueModalOpen(true);
              }}
            >
              <FaHandHolding /> Issue New Book Loan
            </button>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.customTable}>
              <thead>
                <tr>
                  <th>Borrower</th>
                  <th>Book Title & Copy</th>
                  <th>Issue Date</th>
                  <th>Due Date</th>
                  <th>Status & Overdue</th>
                  <th>Acknowledgment</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loans.map((loan) => {
                  const isOverdue = loan.status === 'ACTIVE' && new Date(loan.due_date) < new Date();
                  return (
                    <tr key={loan.id}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{loan.member_name}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          {loan.member_number} • {loan.member_role}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{loan.book_title}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          Accession: <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{loan.accession_number}</span>
                        </div>
                      </td>
                      <td>{new Date(loan.issue_date).toLocaleDateString()}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: isOverdue ? '#dc2626' : 'inherit' }}>
                          {new Date(loan.due_date).toLocaleDateString()}
                        </div>
                      </td>
                      <td>
                        {loan.status === 'RETURNED' ? (
                          <span className={`${styles.badge} ${styles.badgeGreen}`}>Returned</span>
                        ) : isOverdue ? (
                          <span className={`${styles.badge} ${styles.badgeRed}`}>
                            Overdue ({loan.days_overdue} days)
                          </span>
                        ) : (
                          <span className={`${styles.badge} ${styles.badgeBlue}`}>Active Loan</span>
                        )}
                        {loan.renewal_count > 0 && (
                          <span className={`${styles.badge} ${styles.badgeYellow}`} style={{ marginLeft: '0.3rem' }}>
                            {loan.renewal_count} renewals
                          </span>
                        )}
                      </td>
                      <td>
                        {loan.borrower_signature ? (
                          <span className={`${styles.badge} ${styles.badgePurple}`} title="Signature recorded on file">
                            <FaSignature /> Signed
                          </span>
                        ) : (
                          <span className={`${styles.badge} ${styles.badgeGray}`}>
                            {loan.borrower_acknowledgment_type}
                          </span>
                        )}
                      </td>
                      <td>
                        {loan.status === 'ACTIVE' && (
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                              className={styles.successBtn}
                              onClick={() => {
                                setActiveLoanForAction(loan);
                                setReturnFormData({ condition_on_return: 'GOOD', damage_fine_amount: 0, return_notes: '' });
                                setIsReturnModalOpen(true);
                              }}
                            >
                              <FaUndo /> Return
                            </button>
                            <button
                              className={styles.outlineBtn}
                              onClick={() => handleRenewLoan(loan.id)}
                              title="Renew loan period"
                            >
                              <FaSync /> Renew
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: RESERVATIONS */}
      {!isPatronOnly && activeTab === 'reservations' && (
        <div className={styles.tableContainer}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: 0 }}>Book Reservations & Holds Queue</h3>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.customTable}>
              <thead>
                <tr>
                  <th>Priority</th>
                  <th>Member</th>
                  <th>Book Title</th>
                  <th>Reservation Date</th>
                  <th>Hold Expiry</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((res) => (
                  <tr key={res.id}>
                    <td>
                      <span style={{ fontWeight: 800, color: '#4f46e5' }}>#{res.priority}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{res.member_name}</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{res.member_number}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{res.book_title}</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>ISBN: {res.isbn || 'N/A'}</div>
                    </td>
                    <td>{new Date(res.reservation_date).toLocaleDateString()}</td>
                    <td>{res.hold_until ? new Date(res.hold_until).toLocaleDateString() : '-'}</td>
                    <td>
                      <span
                        className={`${styles.badge} ${res.status === 'READY_FOR_PICKUP'
                            ? styles.badgeGreen
                            : res.status === 'PENDING'
                              ? styles.badgeYellow
                              : res.status === 'FULFILLED'
                                ? styles.badgeBlue
                                : styles.badgeGray
                          }`}
                      >
                        {res.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      {res.status === 'PENDING' && (
                        <button className={styles.dangerBtn} onClick={() => handleCancelReservation(res.id)}>
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: FINES & CASHIER */}
      {!isPatronOnly && activeTab === 'fines' && (
        <div className={styles.tableContainer}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: 0 }}>Outstanding & Settled Library Fines</h3>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.customTable}>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Fine Type & Reason</th>
                  <th>Amount</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {fines.map((fine) => {
                  const balance = Number(fine.amount) - Number(fine.amount_paid);
                  return (
                    <tr key={fine.id}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{fine.member_name}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{fine.member_number}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{fine.fine_type.replace(/_/g, ' ')}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{fine.reason || '-'}</div>
                      </td>
                      <td>${Number(fine.amount).toFixed(2)}</td>
                      <td>${Number(fine.amount_paid).toFixed(2)}</td>
                      <td style={{ fontWeight: 700, color: balance > 0 ? '#dc2626' : '#15803d' }}>
                        ${balance.toFixed(2)}
                      </td>
                      <td>
                        <span
                          className={`${styles.badge} ${fine.status === 'PAID'
                              ? styles.badgeGreen
                              : fine.status === 'WAIVED'
                                ? styles.badgePurple
                                : styles.badgeRed
                            }`}
                        >
                          {fine.status}
                        </span>
                      </td>
                      <td>
                        {fine.status !== 'PAID' && fine.status !== 'WAIVED' && (
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                              className={styles.successBtn}
                              onClick={() => {
                                setActiveFineForPayment(fine);
                                setPaymentFormData({
                                  amount: balance.toString(),
                                  payment_method: 'CASH',
                                  reference_number: '',
                                  notes: '',
                                });
                                setIsPaymentModalOpen(true);
                              }}
                            >
                              <FaMoneyBillWave /> Pay
                            </button>
                            <button
                              className={styles.outlineBtn}
                              onClick={() => {
                                setActiveFineForWaive(fine);
                                setWaiveFormData({ waived_reason: '' });
                                setIsWaiveModalOpen(true);
                              }}
                            >
                              Waive
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: MEMBERS DIRECTORY */}
      {!isPatronOnly && activeTab === 'members' && (
        <div className={styles.tableContainer}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Registered Library Members</h3>
            <button className={styles.secondaryBtn} onClick={handleSyncMembers} style={{ color: '#1e1b4b', background: '#e0e7ff', border: '1px solid #c7d2fe' }}>
              <FaSync /> Sync All Students & Staff
            </button>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.customTable}>
              <thead>
                <tr>
                  <th>Member ID & Card</th>
                  <th>Full Name</th>
                  <th>Type & Role</th>
                  <th>Active Loans</th>
                  <th>Outstanding Fines</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((mem) => (
                  <tr key={mem.id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#4f46e5' }}>
                        {mem.member_number}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{mem.full_name}</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{mem.email || mem.phone || '-'}</div>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${styles.badgeBlue}`}>{mem.member_type}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700 }}>{mem.active_loans_count || 0}</span> active
                      {mem.overdue_loans_count > 0 && (
                        <span style={{ color: '#dc2626', fontSize: '0.75rem', display: 'block' }}>
                          ({mem.overdue_loans_count} overdue)
                        </span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: Number(mem.outstanding_fines_sum) > 0 ? '#dc2626' : '#15803d' }}>
                        ${Number(mem.outstanding_fines_sum || 0).toFixed(2)}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${mem.status === 'ACTIVE' ? styles.badgeGreen : styles.badgeRed}`}>
                        {mem.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className={styles.outlineBtn}
                        onClick={async () => {
                          const newStatus = mem.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
                          await updateLibraryMemberStatus(mem.id, { status: newStatus });
                          showToast(`Member status changed to ${newStatus}`);
                          fetchAllData();
                        }}
                      >
                        {mem.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: MASTER DATA (Categories, Subjects, Authors, Publishers) */}
      {!isPatronOnly && activeTab === 'master' && (
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <button
              className={`${styles.tabBtn} ${masterSubTab === 'categories' ? styles.activeTabBtn : ''}`}
              onClick={() => setMasterSubTab('categories')}
            >
              <FaLayerGroup /> Categories ({categories.length})
            </button>
            <button
              className={`${styles.tabBtn} ${masterSubTab === 'subjects' ? styles.activeTabBtn : ''}`}
              onClick={() => setMasterSubTab('subjects')}
            >
              <FaTags /> Subjects ({subjects.length})
            </button>
            <button
              className={`${styles.tabBtn} ${masterSubTab === 'authors' ? styles.activeTabBtn : ''}`}
              onClick={() => setMasterSubTab('authors')}
            >
              <FaPenNib /> Authors ({authors.length})
            </button>
            <button
              className={`${styles.tabBtn} ${masterSubTab === 'publishers' ? styles.activeTabBtn : ''}`}
              onClick={() => setMasterSubTab('publishers')}
            >
              <FaBuilding /> Publishers ({publishers.length})
            </button>
          </div>

          <div className={styles.tableContainer}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, textTransform: 'capitalize' }}>Library {masterSubTab}</h3>
              <button
                className={styles.primaryBtn}
                onClick={() => {
                  const typeMap = { categories: 'category', subjects: 'subject', authors: 'author', publishers: 'publisher' };
                  setMasterDataType(typeMap[masterSubTab]);
                  setIsMasterDataModalOpen(true);
                }}
              >
                <FaPlus /> Add New {masterSubTab.slice(0, -1)}
              </button>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.customTable}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Code / Details</th>
                    <th>Books Linked</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {masterSubTab === 'categories' &&
                    categories.map((c) => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 700 }}>{c.name}</td>
                        <td>{c.code || '-'}</td>
                        <td>{c.book_count || 0} books</td>
                        <td>
                          <button
                            className={styles.dangerBtn}
                            onClick={async () => {
                              if (window.confirm(`Delete category "${c.name}"?`)) {
                                await deleteLibraryCategory(c.id);
                                showToast('Category removed');
                                fetchAllData();
                              }
                            }}
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))}

                  {masterSubTab === 'subjects' &&
                    subjects.map((s) => (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 700 }}>{s.name}</td>
                        <td>{s.code || '-'}</td>
                        <td>{s.book_count || 0} books</td>
                        <td>
                          <button
                            className={styles.dangerBtn}
                            onClick={async () => {
                              if (window.confirm(`Delete subject "${s.name}"?`)) {
                                await deleteLibrarySubject(s.id);
                                showToast('Subject removed');
                                fetchAllData();
                              }
                            }}
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))}

                  {masterSubTab === 'authors' &&
                    authors.map((a) => (
                      <tr key={a.id}>
                        <td style={{ fontWeight: 700 }}>{a.name}</td>
                        <td>{a.biography || '-'}</td>
                        <td>{a.book_count || 0} books</td>
                        <td>
                          <button
                            className={styles.dangerBtn}
                            onClick={async () => {
                              if (window.confirm(`Delete author "${a.name}"?`)) {
                                await deleteLibraryAuthor(a.id);
                                showToast('Author removed');
                                fetchAllData();
                              }
                            }}
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))}

                  {masterSubTab === 'publishers' &&
                    publishers.map((p) => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 700 }}>{p.name}</td>
                        <td>{p.contact_email || p.contact_phone || '-'}</td>
                        <td>{p.book_count || 0} books</td>
                        <td>
                          <button
                            className={styles.dangerBtn}
                            onClick={async () => {
                              if (window.confirm(`Delete publisher "${p.name}"?`)) {
                                await deleteLibraryPublisher(p.id);
                                showToast('Publisher removed');
                                fetchAllData();
                              }
                            }}
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: AUDIT TRAIL */}
      {!isPatronOnly && activeTab === 'audit' && (
        <div className={styles.tableContainer}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: 0 }}>Library Operations Audit Trail</h3>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.customTable}>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Entity Type</th>
                  <th>Performed By</th>
                  <th>Details Summary</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.created_at).toLocaleString()}</td>
                    <td>
                      <span className={`${styles.badge} ${styles.badgePurple}`}>{log.action}</span>
                    </td>
                    <td>{log.entity_type}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{log.user_name || 'System'}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{log.user_role}</div>
                    </td>
                    <td>
                      <pre style={{ margin: 0, fontSize: '0.75rem', fontFamily: 'monospace', maxWidth: '350px', overflowX: 'auto' }}>
                        {JSON.stringify(log.details)}
                      </pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 9: POLICY CONFIGURATION */}
      {!isPatronOnly && activeTab === 'settings' && (
        <form onSubmit={handleSavePolicy} className={styles.policyCard}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FaCog color="#4f46e5" /> Configurable Library Policies & Rules
          </h2>

          <div className={styles.policySectionTitle}>
            <FaBuilding /> Library Identification
          </div>
          <div className={styles.formRow3}>
            <div className={styles.formGroup}>
              <label>Library Name</label>
              <input
                type="text"
                className={styles.formInput}
                value={policyFormData.library_name || ''}
                onChange={(e) => setPolicyFormData({ ...policyFormData, library_name: e.target.value })}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Campus / Branch</label>
              <input
                type="text"
                className={styles.formInput}
                value={policyFormData.branch || ''}
                onChange={(e) => setPolicyFormData({ ...policyFormData, branch: e.target.value })}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Opening Hours Schedule</label>
              <input
                type="text"
                className={styles.formInput}
                value={policyFormData.opening_hours || ''}
                onChange={(e) => setPolicyFormData({ ...policyFormData, opening_hours: e.target.value })}
              />
            </div>
          </div>

          <div className={styles.policySectionTitle}>
            <FaClock /> Loan Periods & Active Checkout Limits
          </div>
          <div className={styles.formRow3}>
            <div className={styles.formGroup}>
              <label>Student Loan Period (Days)</label>
              <input
                type="number"
                min="1"
                className={styles.formInput}
                value={policyFormData.default_student_loan_period || 14}
                onChange={(e) => setPolicyFormData({ ...policyFormData, default_student_loan_period: Number(e.target.value) })}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Teacher Loan Period (Days)</label>
              <input
                type="number"
                min="1"
                className={styles.formInput}
                value={policyFormData.default_teacher_loan_period || 30}
                onChange={(e) => setPolicyFormData({ ...policyFormData, default_teacher_loan_period: Number(e.target.value) })}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Staff Loan Period (Days)</label>
              <input
                type="number"
                min="1"
                className={styles.formInput}
                value={policyFormData.default_staff_loan_period || 21}
                onChange={(e) => setPolicyFormData({ ...policyFormData, default_staff_loan_period: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className={styles.formRow3} style={{ marginTop: '1rem' }}>
            <div className={styles.formGroup}>
              <label>Max Active Loans (Student)</label>
              <input
                type="number"
                min="1"
                className={styles.formInput}
                value={policyFormData.max_active_loans_student || 3}
                onChange={(e) => setPolicyFormData({ ...policyFormData, max_active_loans_student: Number(e.target.value) })}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Max Active Loans (Teacher)</label>
              <input
                type="number"
                min="1"
                className={styles.formInput}
                value={policyFormData.max_active_loans_teacher || 10}
                onChange={(e) => setPolicyFormData({ ...policyFormData, max_active_loans_teacher: Number(e.target.value) })}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Max Active Loans (Staff)</label>
              <input
                type="number"
                min="1"
                className={styles.formInput}
                value={policyFormData.max_active_loans_staff || 5}
                onChange={(e) => setPolicyFormData({ ...policyFormData, max_active_loans_staff: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className={styles.policySectionTitle}>
            <FaMoneyBillWave /> Fines, Renewals & Reservations
          </div>
          <div className={styles.formRow3}>
            <div className={styles.formGroup}>
              <label>Fine Per Overdue Day ($)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                className={styles.formInput}
                value={policyFormData.fine_per_overdue_day || 2.0}
                onChange={(e) => setPolicyFormData({ ...policyFormData, fine_per_overdue_day: Number(e.target.value) })}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Max Renewal Count</label>
              <input
                type="number"
                min="0"
                className={styles.formInput}
                value={policyFormData.max_renewal_count || 2}
                onChange={(e) => setPolicyFormData({ ...policyFormData, max_renewal_count: Number(e.target.value) })}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Reservation Hold Period (Days)</label>
              <input
                type="number"
                min="1"
                className={styles.formInput}
                value={policyFormData.reservation_hold_period || 3}
                onChange={(e) => setPolicyFormData({ ...policyFormData, reservation_hold_period: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className={styles.policySectionTitle}>
            <FaSignature /> Permissions & Electronic Signatures
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className={styles.toggleWrapper}>
              <div>
                <div className={styles.toggleLabel}>Require Digital Signature on Issue</div>
                <div className={styles.toggleSubtext}>Enforces signature pad canvas signing on book issue</div>
              </div>
              <input
                type="checkbox"
                checked={policyFormData.require_signature ?? true}
                onChange={(e) => setPolicyFormData({ ...policyFormData, require_signature: e.target.checked })}
              />
            </div>

            <div className={styles.toggleWrapper}>
              <div>
                <div className={styles.toggleLabel}>Allow Student Self-Borrowing</div>
                <div className={styles.toggleSubtext}>Enables student checkout rights</div>
              </div>
              <input
                type="checkbox"
                checked={policyFormData.allow_student_borrowing ?? true}
                onChange={(e) => setPolicyFormData({ ...policyFormData, allow_student_borrowing: e.target.checked })}
              />
            </div>

            <div className={styles.toggleWrapper}>
              <div>
                <div className={styles.toggleLabel}>Allow Teacher Borrowing</div>
                <div className={styles.toggleSubtext}>Enables teacher book checkout privileges</div>
              </div>
              <input
                type="checkbox"
                checked={policyFormData.allow_teacher_borrowing ?? true}
                onChange={(e) => setPolicyFormData({ ...policyFormData, allow_teacher_borrowing: e.target.checked })}
              />
            </div>

            <div className={styles.toggleWrapper}>
              <div>
                <div className={styles.toggleLabel}>Allow Online Reservations</div>
                <div className={styles.toggleSubtext}>Enables patron book hold requests</div>
              </div>
              <input
                type="checkbox"
                checked={policyFormData.allow_reservations ?? true}
                onChange={(e) => setPolicyFormData({ ...policyFormData, allow_reservations: e.target.checked })}
              />
            </div>
          </div>

          <div style={{ marginTop: '1.75rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className={styles.primaryBtn} style={{ padding: '0.75rem 2rem' }}>
              <FaCheckCircle /> Save Policy Changes
            </button>
          </div>
        </form>
      )}

      {/* PATRON VIEW: MY LIBRARY */}
      {isPatronOnly && activeTab === 'my_library' && (
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '1.25rem' }}>My Borrowed Books</h2>
          {myLoans.length > 0 ? (
            <div className={styles.booksGrid}>
              {myLoans.map((loan) => {
                const isOverdue = loan.status === 'ACTIVE' && new Date(loan.due_date) < new Date();
                return (
                  <div key={loan.id} className={styles.bookCard}>
                    <div className={styles.bookBody}>
                      <span className={isOverdue ? styles.badgeRed : styles.badgeBlue}>
                        {isOverdue ? `Overdue by ${loan.days_overdue} days` : 'Active Loan'}
                      </span>
                      <h3 className={styles.bookTitle} style={{ marginTop: '0.5rem' }}>
                        {loan.book_title}
                      </h3>
                      <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.25rem 0' }}>
                        Accession Number: <strong>{loan.accession_number}</strong>
                      </p>
                      <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.25rem 0' }}>
                        Due Date: <strong style={{ color: isOverdue ? '#dc2626' : '#15803d' }}>{new Date(loan.due_date).toLocaleDateString()}</strong>
                      </p>
                    </div>
                    <div className={styles.bookCardFooter}>
                      <button className={styles.primaryBtn} onClick={() => handleRenewLoan(loan.id)}>
                        <FaSync /> Request Renewal
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyStateIcon}>
                <FaBookReader />
              </div>
              <h3 className={styles.emptyStateTitle}>No Active Loans</h3>
              <p className={styles.emptyStateText}>You do not currently have any borrowed library books.</p>
              <button className={styles.primaryBtn} onClick={() => setActiveTab('catalog')}>
                <FaSearch /> Browse Catalog
              </button>
            </div>
          )}
        </div>
      )}

      {/* PATRON VIEW: MY RESERVATIONS */}
      {isPatronOnly && activeTab === 'my_reservations' && (
        <div className={styles.tableContainer}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: 0 }}>My Book Reservations</h3>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.customTable}>
              <thead>
                <tr>
                  <th>Book Title</th>
                  <th>Reserved On</th>
                  <th>Hold Expiry</th>
                  <th>Queue Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {myReservations.map((res) => (
                  <tr key={res.id}>
                    <td style={{ fontWeight: 700 }}>{res.book_title}</td>
                    <td>{new Date(res.reservation_date).toLocaleDateString()}</td>
                    <td>{res.hold_until ? new Date(res.hold_until).toLocaleDateString() : '-'}</td>
                    <td>
                      <span className={`${styles.badge} ${res.status === 'READY_FOR_PICKUP' ? styles.badgeGreen : styles.badgeYellow}`}>
                        {res.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      {res.status === 'PENDING' && (
                        <button className={styles.dangerBtn} onClick={() => handleCancelReservation(res.id)}>
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PATRON VIEW: MY FINES */}
      {isPatronOnly && activeTab === 'my_fines' && (
        <div className={styles.tableContainer}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: 0 }}>My Library Fines & Invoices</h3>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.customTable}>
              <thead>
                <tr>
                  <th>Book / Reason</th>
                  <th>Amount</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {myFines.map((f) => (
                  <tr key={f.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{f.book_title || f.fine_type}</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{f.reason}</div>
                    </td>
                    <td>${Number(f.amount).toFixed(2)}</td>
                    <td>${Number(f.amount_paid).toFixed(2)}</td>
                    <td style={{ fontWeight: 700, color: Number(f.amount) - Number(f.amount_paid) > 0 ? '#dc2626' : '#15803d' }}>
                      ${(Number(f.amount) - Number(f.amount_paid)).toFixed(2)}
                    </td>
                    <td>
                      <span className={`${styles.badge} ${f.status === 'PAID' ? styles.badgeGreen : styles.badgeRed}`}>
                        {f.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT BOOK */}
      {isBookModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>{editingBook ? <FaEdit /> : <FaPlus />} {editingBook ? 'Edit Book Catalog Item' : 'Register New Book'}</h2>
              <button className={styles.closeModalBtn} onClick={() => setIsBookModalOpen(false)}>
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSaveBook}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label>Book Title *</label>
                  <input
                    type="text"
                    required
                    className={styles.formInput}
                    value={bookFormData.title}
                    onChange={(e) => setBookFormData({ ...bookFormData, title: e.target.value })}
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>ISBN</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      value={bookFormData.isbn}
                      onChange={(e) => setBookFormData({ ...bookFormData, isbn: e.target.value })}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Edition</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      value={bookFormData.edition}
                      onChange={(e) => setBookFormData({ ...bookFormData, edition: e.target.value })}
                    />
                  </div>
                </div>

                <div className={styles.formRow3}>
                  <div className={styles.formGroup}>
                    <label>Category</label>
                    <select
                      className={styles.formSelect}
                      value={bookFormData.category_id}
                      onChange={(e) => setBookFormData({ ...bookFormData, category_id: e.target.value })}
                    >
                      <option value="">Select Category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Subject</label>
                    <select
                      className={styles.formSelect}
                      value={bookFormData.subject_id}
                      onChange={(e) => setBookFormData({ ...bookFormData, subject_id: e.target.value })}
                    >
                      <option value="">Select Subject</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Publisher</label>
                    <select
                      className={styles.formSelect}
                      value={bookFormData.publisher_id}
                      onChange={(e) => setBookFormData({ ...bookFormData, publisher_id: e.target.value })}
                    >
                      <option value="">Select Publisher</option>
                      {publishers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={styles.formRow3}>
                  <div className={styles.formGroup}>
                    <label>Shelf Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Aisle 3, Shelf B"
                      className={styles.formInput}
                      value={bookFormData.shelf_location}
                      onChange={(e) => setBookFormData({ ...bookFormData, shelf_location: e.target.value })}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Dewey (DDC)</label>
                    <input
                      type="text"
                      placeholder="e.g. 530.1"
                      className={styles.formInput}
                      value={bookFormData.ddc_number}
                      onChange={(e) => setBookFormData({ ...bookFormData, ddc_number: e.target.value })}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Publication Year</label>
                    <input
                      type="number"
                      className={styles.formInput}
                      value={bookFormData.publication_year}
                      onChange={(e) => setBookFormData({ ...bookFormData, publication_year: e.target.value })}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Authors (Hold Ctrl/Cmd to select multiple)</label>
                  <select
                    multiple
                    className={styles.formSelect}
                    style={{ height: '90px' }}
                    value={bookFormData.author_ids}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                      setBookFormData({ ...bookFormData, author_ids: selected });
                    }}
                  >
                    {authors.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                {!editingBook && (
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Initial Physical Copies Count</label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        className={styles.formInput}
                        value={bookFormData.initial_copies}
                        onChange={(e) => setBookFormData({ ...bookFormData, initial_copies: e.target.value })}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Barcode Prefix</label>
                      <input
                        type="text"
                        className={styles.formInput}
                        value={bookFormData.accession_prefix}
                        onChange={(e) => setBookFormData({ ...bookFormData, accession_prefix: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.modalFooter}>
                <button type="button" className={styles.outlineBtn} onClick={() => setIsBookModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.primaryBtn}>
                  <FaCheckCircle /> Save Book
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SMART ISSUE BOOK LOAN WORKSTATION */}
      {isIssueModalOpen && (() => {
        const cleanBookIdent = (issueFormData.identifier || '').trim().toLowerCase();
        const matchedBook = books.find(
          (b) =>
            b.title?.toLowerCase() === cleanBookIdent ||
            (b.isbn && b.isbn.toLowerCase() === cleanBookIdent) ||
            b.id === cleanBookIdent
        );

        const cleanMemIdent = (issueFormData.memberIdentifier || '').trim().toLowerCase();
        const matchedMember = members.find(
          (m) =>
            m.member_number?.toLowerCase() === cleanMemIdent ||
            (m.email && m.email.toLowerCase() === cleanMemIdent) ||
            m.id === cleanMemIdent ||
            m.full_name?.toLowerCase() === cleanMemIdent
        );

        const defaultDuration = matchedMember?.member_type === 'TEACHER'
          ? (settings?.default_teacher_loan_period || 30)
          : matchedMember?.member_type === 'STAFF'
          ? (settings?.default_staff_loan_period || 21)
          : (settings?.default_student_loan_period || 14);

        const durationDays = issueFormData.loan_duration_days ? Number(issueFormData.loan_duration_days) : defaultDuration;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (isNaN(durationDays) || durationDays < 1 ? 14 : durationDays));

        const maxLoans = matchedMember?.member_type === 'TEACHER'
          ? (settings?.max_active_loans_teacher || 10)
          : matchedMember?.member_type === 'STAFF'
          ? (settings?.max_active_loans_staff || 5)
          : (settings?.max_active_loans_student || 3);

        const activeLoansCount = matchedMember?.active_loans_count || 0;
        const isLimitReached = matchedMember && activeLoansCount >= maxLoans;
        const hasUnpaidFines = Number(matchedMember?.outstanding_fines_sum || 0) > 0;

        const filteredMembersList = members.filter((m) => {
          if (memberRoleFilter === 'ALL') return true;
          return m.member_type === memberRoleFilter;
        });

        return (
          <div className={styles.modalOverlay}>
            <div className={styles.issueModalContent}>
              {/* Header */}
              <div className={styles.issueHeader}>
                <div className={styles.issueHeaderTitle}>
                  <div className={styles.issueHeaderIcon}>
                    <FaHandHolding />
                  </div>
                  <div>
                    <span className={styles.issueHeaderTag}>Circulation Desk</span>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#ffffff', fontWeight: 800 }}>
                      Issue Book Loan & Physical Checkout
                    </h2>
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.issueHeaderClose}
                  onClick={() => {
                    setIsIssueModalOpen(false);
                    setIssueFormData({ identifier: '', memberIdentifier: '', loan_duration_days: '', condition_on_issue: 'GOOD', issue_notes: '' });
                    setSignatureData(null);
                  }}
                  title="Close"
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleIssueLoanSubmit}>
                <div className={styles.issueBody}>
                  {/* Two-Column Intelligence Grid */}
                  <div className={styles.issueGrid}>
                    {/* Left Column: Book & Physical Copy Selection */}
                    <div className={styles.issueCardPanel}>
                      <div className={styles.issueCardHeader}>
                        <div className={styles.issueCardHeaderTitle}>
                          <FaBook color="#4f46e5" /> 1. Select Book Copy
                        </div>
                        {matchedBook && (
                          <span className={`${styles.miniTag} ${matchedBook.available_copies_count > 0 ? styles.miniTagGreen : styles.miniTagRed}`}>
                            {matchedBook.available_copies_count > 0 ? `${matchedBook.available_copies_count} in stock` : 'Out of Stock'}
                          </span>
                        )}
                      </div>

                      <div className={styles.formGroup}>
                        <label>Scan Barcode, Enter Accession #, or Search Title</label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="text"
                            required
                            list="available-books-list"
                            placeholder="e.g. LIB-2026-00001 or Advanced Mathematics"
                            className={styles.formInput}
                            style={{ paddingLeft: '2.4rem' }}
                            value={issueFormData.identifier}
                            onChange={(e) => setIssueFormData({ ...issueFormData, identifier: e.target.value })}
                          />
                          <FaQrcode style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        </div>
                        <datalist id="available-books-list">
                          {books.map((b) => (
                            <option key={b.id} value={b.title}>
                              {b.title} {b.isbn ? `[ISBN: ${b.isbn}]` : ''} — {b.available_copies_count} available
                            </option>
                          ))}
                        </datalist>
                      </div>

                      {/* Quick Dropdown Picker */}
                      {books.length > 0 && (
                        <div className={styles.formGroup}>
                          <label style={{ fontSize: '0.75rem', color: '#64748b' }}>Or Quick Pick from Catalog</label>
                          <select
                            className={styles.formSelect}
                            style={{ fontSize: '0.82rem', padding: '0.45rem 0.75rem', background: '#f8fafc' }}
                            onChange={(e) => {
                              if (e.target.value) {
                                setIssueFormData({ ...issueFormData, identifier: e.target.value });
                              }
                            }}
                            value={matchedBook ? matchedBook.title : ''}
                          >
                            <option value="">Select a catalog book...</option>
                            {books.map((b) => (
                              <option key={b.id} value={b.title}>
                                {b.title} ({b.available_copies_count} avail) {b.category_name ? `• ${b.category_name}` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Dynamic Book Preview Card */}
                      {matchedBook ? (
                        <div className={`${styles.smartPreviewBox} ${styles.smartPreviewBoxActive}`}>
                          {matchedBook.cover_image ? (
                            <img
                              src={matchedBook.cover_image}
                              alt={matchedBook.title}
                              className={styles.bookThumb}
                              style={{ objectFit: 'cover' }}
                            />
                          ) : (
                            <div className={styles.bookThumb}>
                              <FaBook />
                            </div>
                          )}
                          <div className={styles.previewInfo}>
                            <div className={styles.previewTitle} title={matchedBook.title}>
                              {matchedBook.title}
                            </div>
                            <div className={styles.previewSub}>
                              {matchedBook.authors?.length > 0 ? `By ${matchedBook.authors.map(a => a.name).join(', ')}` : (matchedBook.category_name || 'General Catalog')}
                            </div>
                            <div className={styles.previewTags}>
                              {matchedBook.isbn && <span className={styles.miniTag}>ISBN: {matchedBook.isbn}</span>}
                              {matchedBook.shelf_location && <span className={styles.miniTag}>Shelf: {matchedBook.shelf_location}</span>}
                              <span className={`${styles.miniTag} ${matchedBook.available_copies_count > 0 ? styles.miniTagGreen : styles.miniTagRed}`}>
                                {matchedBook.available_copies_count > 0 ? '✓ Ready to Checkout' : '⚠️ No copies available'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className={styles.smartPreviewBox}>
                          <div className={styles.bookThumb} style={{ background: '#e2e8f0', color: '#94a3b8' }}>
                            <FaBook />
                          </div>
                          <div className={styles.previewInfo}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>No Book Selected Yet</div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                              Type an Accession # / Barcode, or choose a title from the catalog.
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Column: Borrower Selection & Profile */}
                    <div className={styles.issueCardPanel}>
                      <div className={styles.issueCardHeader}>
                        <div className={styles.issueCardHeaderTitle}>
                          <FaUsers color="#4f46e5" /> 2. Select Borrower
                        </div>
                        {matchedMember && (
                          <span className={`${styles.miniTag} ${isLimitReached ? styles.miniTagRed : styles.miniTagGreen}`}>
                            {isLimitReached ? 'Loan Limit Reached' : 'Eligible to Borrow'}
                          </span>
                        )}
                      </div>

                      {/* Role Filter Pills */}
                      <div className={styles.roleFilterPills}>
                        {['ALL', 'STUDENT', 'TEACHER', 'STAFF'].map((role) => (
                          <button
                            key={role}
                            type="button"
                            className={`${styles.roleFilterPill} ${memberRoleFilter === role ? styles.roleFilterPillActive : ''}`}
                            onClick={() => setMemberRoleFilter(role)}
                          >
                            {role === 'ALL' ? 'All Roles' : `${role.charAt(0) + role.slice(1).toLowerCase()}s`}
                          </button>
                        ))}
                      </div>

                      <div className={styles.formGroup}>
                        <label>Member Number, Email, or Name</label>
                        <input
                          type="text"
                          required
                          list="registered-members-list"
                          placeholder="e.g. LIB-STU-2026-0001 or student@school.edu"
                          className={styles.formInput}
                          value={issueFormData.memberIdentifier}
                          onChange={(e) => setIssueFormData({ ...issueFormData, memberIdentifier: e.target.value })}
                        />
                        <datalist id="registered-members-list">
                          {filteredMembersList.map((m) => (
                            <option key={m.id} value={m.member_number}>
                              {m.full_name} ({m.member_type}) — {m.email}
                            </option>
                          ))}
                        </datalist>
                      </div>

                      {/* Quick Dropdown Picker */}
                      {filteredMembersList.length > 0 && (
                        <div className={styles.formGroup}>
                          <select
                            className={styles.formSelect}
                            style={{ fontSize: '0.82rem', padding: '0.45rem 0.75rem', background: '#f8fafc' }}
                            onChange={(e) => {
                              if (e.target.value) {
                                setIssueFormData({ ...issueFormData, memberIdentifier: e.target.value });
                              }
                            }}
                            value={matchedMember ? matchedMember.member_number : ''}
                          >
                            <option value="">Quick Pick {memberRoleFilter === 'ALL' ? 'Member' : memberRoleFilter.toLowerCase()}...</option>
                            {filteredMembersList.map((m) => (
                              <option key={m.id} value={m.member_number}>
                                {m.full_name} ({m.member_type}) • {m.member_number}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Dynamic Borrower Preview Card */}
                      {matchedMember ? (
                        <div className={`${styles.smartPreviewBox} ${styles.smartPreviewBoxActive}`}>
                          <div
                            className={`${styles.memberAvatar} ${
                              matchedMember.member_type === 'TEACHER'
                                ? styles.avatarTeacher
                                : matchedMember.member_type === 'STAFF'
                                ? styles.avatarStaff
                                : styles.avatarStudent
                            }`}
                          >
                            {matchedMember.full_name?.charAt(0)?.toUpperCase() || 'M'}
                          </div>
                          <div className={styles.previewInfo}>
                            <div className={styles.previewTitle}>
                              {matchedMember.full_name}
                            </div>
                            <div className={styles.previewSub}>
                              <strong style={{ color: '#4f46e5' }}>{matchedMember.member_number}</strong> • {matchedMember.role_name || matchedMember.member_type}
                            </div>
                            <div style={{ marginTop: '0.4rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b' }}>
                                <span>Active Loans: <strong>{activeLoansCount} / {maxLoans}</strong></span>
                                {hasUnpaidFines && (
                                  <span style={{ color: '#dc2626', fontWeight: 700 }}>
                                    ⚠️ Unpaid: ${matchedMember.outstanding_fines_sum}
                                  </span>
                                )}
                              </div>
                              <div className={styles.meterBar}>
                                <div
                                  className={`${styles.meterBarFill} ${
                                    activeLoansCount >= maxLoans
                                      ? styles.meterBarFillDanger
                                      : activeLoansCount >= maxLoans * 0.7
                                      ? styles.meterBarFillWarning
                                      : ''
                                  }`}
                                  style={{ width: `${Math.min(100, (activeLoansCount / maxLoans) * 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className={styles.smartPreviewBox}>
                          <div className={styles.memberAvatar} style={{ background: '#e2e8f0', color: '#94a3b8' }}>
                            <FaUsers />
                          </div>
                          <div className={styles.previewInfo}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>No Borrower Selected</div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                              Type a Member ID / Email or pick from the list above.
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Smart Terms & Due Date Dynamic Timeline */}
                  <div className={styles.timelineCard}>
                    <div className={styles.timelineStep}>
                      <div className={styles.timelineIconBox}>
                        <FaCalendarAlt />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div className={styles.timelineLabel}>Issue Date</div>
                        <div className={styles.timelineDate}>{new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', minWidth: 0 }}>
                      <div className={styles.formGroup} style={{ flex: 1, minWidth: '90px' }}>
                        <label style={{ fontSize: '0.72rem' }}>Days Loaned</label>
                        <input
                          type="number"
                          min="1"
                          max="365"
                          placeholder={`${defaultDuration}d`}
                          className={styles.formInput}
                          style={{ padding: '0.35rem 0.5rem', fontWeight: 700, textAlign: 'center', fontSize: '0.85rem' }}
                          value={issueFormData.loan_duration_days}
                          onChange={(e) => setIssueFormData({ ...issueFormData, loan_duration_days: e.target.value })}
                        />
                      </div>

                      <div className={styles.formGroup} style={{ flex: 1.2, minWidth: '100px' }}>
                        <label style={{ fontSize: '0.72rem' }}>Condition</label>
                        <select
                          className={styles.formSelect}
                          style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                          value={issueFormData.condition_on_issue}
                          onChange={(e) => setIssueFormData({ ...issueFormData, condition_on_issue: e.target.value })}
                        >
                          <option value="EXCELLENT">⭐ EXCELLENT</option>
                          <option value="GOOD">✓ GOOD</option>
                          <option value="FAIR">⚠️ FAIR</option>
                        </select>
                      </div>
                    </div>

                    <div className={styles.timelineStep}>
                      <div className={`${styles.timelineIconBox} ${styles.timelineIconBoxDue}`}>
                        <FaClock />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div className={styles.timelineLabel} style={{ color: '#059669' }}>Due Return Date</div>
                        <div className={styles.timelineDate} style={{ color: '#047857' }}>
                          {dueDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Digital Signature & E-Consent Section */}
                  <div className={styles.signatureVerificationBox}>
                    <div className={styles.signatureHeaderRow}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: '#1e293b', fontSize: '0.85rem' }}>
                        <FaSignature color="#4f46e5" /> Borrower Verification
                        {signatureData && acknowledgmentType === 'SIGNATURE' && (
                          <span className={`${styles.miniTag} ${styles.miniTagGreen}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                            <FaCheck /> Signed ✓
                          </span>
                        )}
                      </label>
                      <div className={styles.tabSegment}>
                        <button
                          type="button"
                          className={`${styles.tabSegmentBtn} ${acknowledgmentType === 'SIGNATURE' ? styles.tabSegmentBtnActive : ''}`}
                          onClick={() => setAcknowledgmentType('SIGNATURE')}
                        >
                          <FaSignature /> Draw Signature
                        </button>
                        <button
                          type="button"
                          className={`${styles.tabSegmentBtn} ${acknowledgmentType === 'DIGITAL_ACK' ? styles.tabSegmentBtnActive : ''}`}
                          onClick={() => setAcknowledgmentType('DIGITAL_ACK')}
                        >
                          <FaCheckCircle /> 1-Click E-Consent
                        </button>
                      </div>
                    </div>

                    {acknowledgmentType === 'SIGNATURE' ? (
                      <div className={styles.signaturePadContainer}>
                        <canvas
                          ref={signatureCanvasRef}
                          width={500}
                          height={100}
                          className={styles.signatureCanvas}
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={draw}
                          onTouchEnd={stopDrawing}
                        />
                        <div className={styles.signatureActions}>
                          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            Draw signature above using mouse or touch
                          </span>
                          <button
                            type="button"
                            className={styles.outlineBtn}
                            onClick={clearSignature}
                            style={{ padding: '0.2rem 0.55rem', fontSize: '0.72rem' }}
                          >
                            <FaTimes /> Clear Canvas
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '0.85rem', background: '#eef2ff', borderRadius: '8px', border: '1px solid #c7d2fe', fontSize: '0.82rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, color: '#312e81' }}>
                          <input type="checkbox" required defaultChecked />
                          I verify the borrower agrees to return the book within {durationDays} days (Due: {dueDate.toLocaleDateString()}).
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Summary Banner before confirmation */}
                  <div className={styles.checkoutSummaryBanner}>
                    <div className={styles.summaryFlow}>
                      <div className={styles.summaryFlowItem}>
                        <FaBook color="#a5b4fc" />
                        <span>Book: <strong>{matchedBook ? matchedBook.title : (issueFormData.identifier || 'Pending...')}</strong></span>
                      </div>
                      <span>➔</span>
                      <div className={styles.summaryFlowItem}>
                        <FaUsers color="#86efac" />
                        <span>Borrower: <strong>{matchedMember ? matchedMember.full_name : (issueFormData.memberIdentifier || 'Pending...')}</strong></span>
                      </div>
                      <span>➔</span>
                      <div className={styles.summaryFlowItem}>
                        <FaClock color="#fde047" />
                        <span>Due: <strong>{dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className={styles.modalFooter}>
                  <button
                    type="button"
                    className={styles.outlineBtn}
                    onClick={() => {
                      setIsIssueModalOpen(false);
                      setIssueFormData({ identifier: '', memberIdentifier: '', loan_duration_days: '', condition_on_issue: 'GOOD', issue_notes: '' });
                      setSignatureData(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={styles.primaryBtn}
                    style={{ padding: '0.75rem 1.75rem', fontSize: '0.95rem' }}
                    disabled={Boolean(isLimitReached)}
                  >
                    <FaCheckCircle /> Confirm & Issue Book Loan
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* MODAL 3: RETURN BOOK */}
      {isReturnModalOpen && activeLoanForAction && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2><FaUndo /> Process Book Return</h2>
              <button className={styles.closeModalBtn} onClick={() => setIsReturnModalOpen(false)}>
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleReturnSubmit}>
              <div className={styles.modalBody}>
                <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{activeLoanForAction.book_title}</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    Accession: {activeLoanForAction.accession_number} • Borrower: {activeLoanForAction.member_name}
                  </div>
                  <div style={{ fontSize: '0.85rem', marginTop: '0.35rem' }}>
                    Due Date: <strong>{new Date(activeLoanForAction.due_date).toLocaleDateString()}</strong>
                    {new Date(activeLoanForAction.due_date) < new Date() && (
                      <span style={{ color: '#dc2626', fontWeight: 700, marginLeft: '0.5rem' }}>
                        (Overdue return - policy daily fine will be calculated automatically)
                      </span>
                    )}
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Condition on Return</label>
                    <select
                      className={styles.formSelect}
                      value={returnFormData.condition_on_return}
                      onChange={(e) => setReturnFormData({ ...returnFormData, condition_on_return: e.target.value })}
                    >
                      <option value="EXCELLENT">EXCELLENT</option>
                      <option value="GOOD">GOOD</option>
                      <option value="FAIR">FAIR</option>
                      <option value="POOR">POOR</option>
                      <option value="DAMAGED">DAMAGED</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Additional Damage Fine ($)</label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      className={styles.formInput}
                      value={returnFormData.damage_fine_amount}
                      onChange={(e) => setReturnFormData({ ...returnFormData, damage_fine_amount: e.target.value })}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Return Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Add any inspection remarks..."
                    className={styles.formTextarea}
                    value={returnFormData.return_notes}
                    onChange={(e) => setReturnFormData({ ...returnFormData, return_notes: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button type="button" className={styles.outlineBtn} onClick={() => setIsReturnModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.successBtn}>
                  <FaCheckCircle /> Accept Return & Check-in
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: RECORD FINE PAYMENT */}
      {isPaymentModalOpen && activeFineForPayment && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2><FaMoneyBillWave /> Record Fine Payment</h2>
              <button className={styles.closeModalBtn} onClick={() => setIsPaymentModalOpen(false)}>
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handlePayFineSubmit}>
              <div className={styles.modalBody}>
                <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '10px' }}>
                  <div style={{ fontWeight: 700 }}>Member: {activeFineForPayment.member_name}</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Reason: {activeFineForPayment.reason}</div>
                  <div style={{ fontWeight: 700, color: '#dc2626', marginTop: '0.35rem' }}>
                    Remaining Balance: ${(Number(activeFineForPayment.amount) - Number(activeFineForPayment.amount_paid)).toFixed(2)}
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Amount to Pay ($) *</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      required
                      className={styles.formInput}
                      value={paymentFormData.amount}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Payment Method</label>
                    <select
                      className={styles.formSelect}
                      value={paymentFormData.payment_method}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_method: e.target.value })}
                    >
                      <option value="CASH">CASH</option>
                      <option value="MOBILE_MONEY">MOBILE MONEY</option>
                      <option value="CARD">CARD / POS</option>
                      <option value="BANK_TRANSFER">BANK TRANSFER</option>
                    </select>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Transaction / Reference Number</label>
                  <input
                    type="text"
                    placeholder="e.g. TXN-998242"
                    className={styles.formInput}
                    value={paymentFormData.reference_number}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, reference_number: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button type="button" className={styles.outlineBtn} onClick={() => setIsPaymentModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.primaryBtn}>
                  <FaCheckCircle /> Issue Receipt & Settle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: WAIVE FINE */}
      {isWaiveModalOpen && activeFineForWaive && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Waive Library Fine</h2>
              <button className={styles.closeModalBtn} onClick={() => setIsWaiveModalOpen(false)}>
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleWaiveFineSubmit}>
              <div className={styles.modalBody}>
                <p style={{ fontSize: '0.9rem', color: '#475569' }}>
                  Waiving fine for <strong>{activeFineForWaive.member_name}</strong> of amount{' '}
                  <strong style={{ color: '#dc2626' }}>
                    ${(Number(activeFineForWaive.amount) - Number(activeFineForWaive.amount_paid)).toFixed(2)}
                  </strong>
                  . A mandatory explanation is required for library audit records.
                </p>

                <div className={styles.formGroup}>
                  <label>Waiver Justification / Reason *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Explain why this fine is being waived (e.g. Medical exemption, approved principal waiver)..."
                    className={styles.formTextarea}
                    value={waiveFormData.waived_reason}
                    onChange={(e) => setWaiveFormData({ ...waiveFormData, waived_reason: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button type="button" className={styles.outlineBtn} onClick={() => setIsWaiveModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.dangerBtn}>
                  Confirm Waiver
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: BOOK DETAILS & COPIES DRAWER */}
      {selectedBookForDetails && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: '800px' }}>
            <div className={styles.modalHeader}>
              <h2><FaBook /> {selectedBookForDetails.title}</h2>
              <button className={styles.closeModalBtn} onClick={() => setSelectedBookForDetails(null)}>
                <FaTimes />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', marginBottom: '1.25rem' }}>
                <div style={{ height: '220px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {selectedBookForDetails.cover_image ? (
                    <img src={selectedBookForDetails.cover_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <FaBook style={{ fontSize: '4rem', color: '#94a3b8' }} />
                  )}
                </div>

                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0' }}>{selectedBookForDetails.title}</h3>
                  <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '0.75rem' }}>
                    By: {selectedBookForDetails.authors?.map((a) => a.name).join(', ') || 'Unknown'}
                  </div>
                  <div style={{ fontSize: '0.85rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div><strong>ISBN:</strong> {selectedBookForDetails.isbn || 'N/A'}</div>
                    <div><strong>Category:</strong> {selectedBookForDetails.category_name || '-'}</div>
                    <div><strong>Subject:</strong> {selectedBookForDetails.subject_name || '-'}</div>
                    <div><strong>Publisher:</strong> {selectedBookForDetails.publisher_name || '-'}</div>
                    <div><strong>Shelf:</strong> {selectedBookForDetails.shelf_location || 'General'}</div>
                    <div><strong>DDC:</strong> {selectedBookForDetails.ddc_number || 'N/A'}</div>
                  </div>
                  {selectedBookForDetails.description && (
                    <p style={{ fontSize: '0.85rem', color: '#475569', marginTop: '0.75rem', lineHeight: 1.4 }}>
                      {selectedBookForDetails.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Copies Section */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h4 style={{ margin: 0 }}>Physical Inventory Copies ({bookCopies.length})</h4>
                  {!isPatronOnly && (
                    <button
                      className={styles.outlineBtn}
                      onClick={() => setIsAddCopyModalOpen(true)}
                    >
                      <FaPlus /> Add More Copies
                    </button>
                  )}
                </div>

                <div className={styles.tableWrapper}>
                  <table className={styles.customTable}>
                    <thead>
                      <tr>
                        <th>Accession Number / Barcode</th>
                        <th>Condition</th>
                        <th>Status</th>
                        <th>Current Borrower</th>
                        {!isPatronOnly && <th>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {bookCopies.map((copy) => (
                        <tr key={copy.id}>
                          <td>
                            <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#4f46e5' }}>
                              {copy.accession_number}
                            </div>
                          </td>
                          <td>{copy.condition}</td>
                          <td>
                            <span
                              className={`${styles.badge} ${copy.status === 'AVAILABLE'
                                  ? styles.badgeGreen
                                  : copy.status === 'BORROWED'
                                    ? styles.badgeYellow
                                    : styles.badgeRed
                                }`}
                            >
                              {copy.status}
                            </span>
                          </td>
                          <td>{copy.borrower_name ? `${copy.borrower_name} (${copy.borrower_member_number})` : '-'}</td>
                          {!isPatronOnly && (
                            <td>
                              <button
                                className={styles.dangerBtn}
                                onClick={async () => {
                                  if (window.confirm('Delete this copy?')) {
                                    await deleteBookCopy(copy.id);
                                    const updated = await listBookCopies(selectedBookForDetails.id);
                                    setBookCopies(updated || []);
                                    fetchAllData();
                                  }
                                }}
                              >
                                <FaTrash />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.outlineBtn} onClick={() => setSelectedBookForDetails(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: ADD COPIES MODAL */}
      {isAddCopyModalOpen && selectedBookForDetails && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2><FaPlus /> Add Copies for {selectedBookForDetails.title}</h2>
              <button className={styles.closeModalBtn} onClick={() => setIsAddCopyModalOpen(false)}>
                <FaTimes />
              </button>
            </div>

            <form onSubmit={(e) => handleAddCopySubmit(e, selectedBookForDetails.id)}>
              <div className={styles.modalBody}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Quantity to Generate</label>
                    <input type="number" name="quantity" min="1" max="50" defaultValue={1} className={styles.formInput} />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Accession Prefix</label>
                    <input type="text" name="accession_prefix" defaultValue="LIB" className={styles.formInput} />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Condition</label>
                    <select name="condition" defaultValue="EXCELLENT" className={styles.formSelect}>
                      <option value="EXCELLENT">EXCELLENT</option>
                      <option value="GOOD">GOOD</option>
                      <option value="FAIR">FAIR</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Price ($)</label>
                    <input type="number" step="0.5" name="price" className={styles.formInput} />
                  </div>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button type="button" className={styles.outlineBtn} onClick={() => setIsAddCopyModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.primaryBtn}>
                  Generate Copies
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 8: MASTER DATA QUICK CREATE */}
      {isMasterDataModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2><FaPlus /> Add New {masterDataType}</h2>
              <button className={styles.closeModalBtn} onClick={() => setIsMasterDataModalOpen(false)}>
                <FaTimes />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const name = formData.get('name');
                const code = formData.get('code');
                const description = formData.get('description');
                try {
                  if (masterDataType === 'category') await createLibraryCategory({ name, code, description });
                  else if (masterDataType === 'subject') await createLibrarySubject({ name, code, description });
                  else if (masterDataType === 'author') await createLibraryAuthor({ name, biography: description });
                  else if (masterDataType === 'publisher') await createLibraryPublisher({ name, contact_email: code });
                  showToast(`${masterDataType} added successfully`);
                  setIsMasterDataModalOpen(false);
                  fetchAllData();
                } catch (err) {
                  showToast(err.message, 'error');
                }
              }}
            >
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label>{masterDataType} Name *</label>
                  <input type="text" name="name" required className={styles.formInput} />
                </div>
                <div className={styles.formGroup}>
                  <label>{masterDataType === 'publisher' ? 'Contact Email' : 'Code'}</label>
                  <input type="text" name="code" className={styles.formInput} />
                </div>
                <div className={styles.formGroup}>
                  <label>Description / Details</label>
                  <textarea name="description" rows={2} className={styles.formTextarea} />
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button type="button" className={styles.outlineBtn} onClick={() => setIsMasterDataModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.primaryBtn}>
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
