'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styles from './page.module.css';
import * as financeApi from '@/services/financeService';
import {
  FaPiggyBank,
  FaPlus,
  FaSearch,
  FaTimes,
  FaReceipt,
  FaCalendarAlt,
  FaTrash,
} from 'react-icons/fa';
import { HiOutlineArrowPath } from 'react-icons/hi2';

function ModalPortal({ isOpen, onClose, children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className={styles.modalOverlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      {children}
    </div>,
    document.body
  );
}

export default function IncomePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [incomes, setIncomes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Modals
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Forms
  const [incomeForm, setIncomeForm] = useState({
    income_category_id: '',
    title: '',
    payer: '',
    amount: '',
    income_date: new Date().toISOString().slice(0, 10),
    payment_method: 'CASH',
    reference_number: '',
    receipt_attachment_url: '',
    notes: '',
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    code: '',
    description: '',
  });

  const loadIncomes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await financeApi.listIncomes({
        income_category_id: selectedCategory,
        search: searchTerm,
      });
      setIncomes(res.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchTerm]);

  const loadCategories = useCallback(async () => {
    try {
      const res = await financeApi.listIncomeCategories();
      setCategories(res.data || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadIncomes();
    loadCategories();
  }, [loadIncomes, loadCategories]);

  const handleCreateIncome = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await financeApi.createIncome({
        ...incomeForm,
        amount: Number(incomeForm.amount),
      });
      setSuccessMsg('Revenue transaction recorded successfully');
      setIsIncomeModalOpen(false);
      setIncomeForm({
        income_category_id: '',
        title: '',
        payer: '',
        amount: '',
        income_date: new Date().toISOString().slice(0, 10),
        payment_method: 'CASH',
        reference_number: '',
        receipt_attachment_url: '',
        notes: '',
      });
      loadIncomes();
      loadCategories();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await financeApi.createIncomeCategory(categoryForm);
      setSuccessMsg('Income category created');
      setIsCategoryModalOpen(false);
      setCategoryForm({ name: '', code: '', description: '' });
      loadCategories();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteIncome = async (id) => {
    if (!window.confirm('Delete this revenue record?')) return;
    try {
      setLoading(true);
      await financeApi.deleteIncome(id);
      setSuccessMsg('Revenue record deleted');
      loadIncomes();
      loadCategories();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalIncome = incomes.reduce((sum, i) => sum + Number(i.amount), 0);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.title}>
            <FaPiggyBank style={{ color: '#0d9488' }} />
            School Income & Miscellaneous Revenue
          </div>
          <div className={styles.subtitle}>
            Track direct revenues, cafeteria concessions, bookshop sales, facility rentals, and donor grants.
          </div>
        </div>

        <div className={styles.headerActions}>
          <button className={styles.btnSecondary} onClick={() => setIsCategoryModalOpen(true)}>
            <FaPlus /> Income Categories
          </button>
          <button className={styles.btnPrimary} onClick={() => setIsIncomeModalOpen(true)}>
            <FaPlus /> Record Revenue
          </button>
          <button className={styles.btnSecondary} onClick={() => loadIncomes()}>
            <HiOutlineArrowPath /> Refresh
          </button>
        </div>
      </div>

      {successMsg && (
        <div style={{ background: '#ecfdf5', color: '#065f46', padding: '0.75rem 1rem', borderRadius: '10px' }}>
          {successMsg}
        </div>
      )}
      {error && (
        <div style={{ background: '#fef2f2', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '10px' }}>
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: '#ccfbf1', color: '#0d9488' }}>
            <FaPiggyBank />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Total Non-Tuition Income</span>
            <span className={styles.kpiValue} style={{ color: '#0d9488' }}>
              {totalIncome.toLocaleString()} ETB
            </span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: '#e0e7ff', color: '#4f46e5' }}>
            <FaReceipt />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Revenue Categories</span>
            <span className={styles.kpiValue}>{categories.length}</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: '#f1f5f9', color: '#475569' }}>
            <FaCalendarAlt />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Recorded Receipts</span>
            <span className={styles.kpiValue}>{incomes.length}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filterBar}>
        <div className={styles.searchGroup}>
          <FaSearch color="#94a3b8" />
          <input
            type="text"
            placeholder="Search receipt #, payer, title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className={styles.filterControls}>
          <select className={styles.filterSelect} value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Receipt #</th>
                <th>Revenue Title</th>
                <th>Category</th>
                <th>Payer / Source</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {incomes.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                    No revenue records logged yet. Click "Record Revenue" to register non-tuition incomes.
                  </td>
                </tr>
              ) : (
                incomes.map((inc) => (
                  <tr key={inc.id}>
                    <td style={{ fontWeight: 700, color: '#0d9488' }}>{inc.receipt_number}</td>
                    <td><strong>{inc.title}</strong></td>
                    <td>
                      <span style={{ padding: '0.2rem 0.5rem', background: '#f1f5f9', borderRadius: '6px', fontWeight: 600 }}>
                        {inc.category_name}
                      </span>
                    </td>
                    <td>{inc.payer}</td>
                    <td>{new Date(inc.income_date).toLocaleDateString()}</td>
                    <td style={{ fontWeight: 800, color: '#0d9488' }}>{Number(inc.amount).toLocaleString()} ETB</td>
                    <td>{inc.payment_method}</td>
                    <td>
                      <button
                        style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}
                        onClick={() => handleDeleteIncome(inc.id)}
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: NEW INCOME */}
      <ModalPortal isOpen={isIncomeModalOpen} onClose={() => setIsIncomeModalOpen(false)}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <h3>
              <FaPiggyBank /> Record School Revenue
            </h3>
            <button className={styles.closeBtn} onClick={() => setIsIncomeModalOpen(false)}>
              <FaTimes />
            </button>
          </div>
          <form onSubmit={handleCreateIncome}>
            <div className={styles.modalBody}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Income Category *</label>
                  <select
                    className={styles.formSelect}
                    value={incomeForm.income_category_id}
                    onChange={(e) => setIncomeForm({ ...incomeForm, income_category_id: e.target.value })}
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Amount (ETB) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className={styles.formInput}
                    value={incomeForm.amount}
                    onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Revenue Title / Description *</label>
                <input
                  type="text"
                  placeholder="e.g. Auditorium Hall Rental for Community Seminar"
                  className={styles.formInput}
                  value={incomeForm.title}
                  onChange={(e) => setIncomeForm({ ...incomeForm, title: e.target.value })}
                  required
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Payer / Organization *</label>
                  <input
                    type="text"
                    placeholder="e.g. City Youth Association"
                    className={styles.formInput}
                    value={incomeForm.payer}
                    onChange={(e) => setIncomeForm({ ...incomeForm, payer: e.target.value })}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Payment Method</label>
                  <select
                    className={styles.formSelect}
                    value={incomeForm.payment_method}
                    onChange={(e) => setIncomeForm({ ...incomeForm, payment_method: e.target.value })}
                  >
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Direct Bank Deposit</option>
                    <option value="CHECK">Cheque</option>
                  </select>
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Date Received</label>
                  <input
                    type="date"
                    className={styles.formInput}
                    value={incomeForm.income_date}
                    onChange={(e) => setIncomeForm({ ...incomeForm, income_date: e.target.value })}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Reference Number</label>
                  <input
                    type="text"
                    placeholder="Deposit slip / cheque ref"
                    className={styles.formInput}
                    value={incomeForm.reference_number}
                    onChange={(e) => setIncomeForm({ ...incomeForm, reference_number: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnSecondary} onClick={() => setIsIncomeModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className={styles.btnPrimary} disabled={loading}>
                Save Revenue Record
              </button>
            </div>
          </form>
        </div>
      </ModalPortal>

      {/* MODAL 2: CATEGORY */}
      <ModalPortal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <h3>Add Income Category</h3>
            <button className={styles.closeBtn} onClick={() => setIsCategoryModalOpen(false)}>
              <FaTimes />
            </button>
          </div>
          <form onSubmit={handleCreateCategory}>
            <div className={styles.modalBody}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Category Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Canteen Concessions, Hall Rental"
                    className={styles.formInput}
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Code *</label>
                  <input
                    type="text"
                    placeholder="e.g. CANTEEN, RENTAL, GRANT"
                    className={styles.formInput}
                    value={categoryForm.code}
                    onChange={(e) => setCategoryForm({ ...categoryForm, code: e.target.value.toUpperCase() })}
                    required
                  />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea
                  className={styles.formTextarea}
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnSecondary} onClick={() => setIsCategoryModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className={styles.btnPrimary}>
                Save Category
              </button>
            </div>
          </form>
        </div>
      </ModalPortal>
    </div>
  );
}
