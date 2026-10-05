'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styles from './page.module.css';
import * as financeApi from '@/services/financeService';
import {
  FaReceipt,
  FaPlus,
  FaSearch,
  FaTimes,
  FaCheck,
  FaChartPie,
  FaCalendarAlt,
  FaExclamationTriangle,
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

export default function ExpensesPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Modals
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Forms
  const [expenseForm, setExpenseForm] = useState({
    expense_category_id: '',
    title: '',
    payee: '',
    amount: '',
    expense_date: new Date().toISOString().slice(0, 10),
    payment_method: 'CASH',
    reference_number: '',
    receipt_attachment_url: '',
    notes: '',
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    code: '',
    description: '',
    monthly_budget: '',
  });

  const loadExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await financeApi.listExpenses({
        expense_category_id: selectedCategory,
        search: searchTerm,
      });
      setExpenses(res.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchTerm]);

  const loadCategories = useCallback(async () => {
    try {
      const res = await financeApi.listExpenseCategories();
      setCategories(res.data || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadExpenses();
    loadCategories();
  }, [loadExpenses, loadCategories]);

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await financeApi.createExpense({
        ...expenseForm,
        amount: Number(expenseForm.amount),
      });
      setSuccessMsg('Expense voucher logged successfully');
      setIsExpenseModalOpen(false);
      setExpenseForm({
        expense_category_id: '',
        title: '',
        payee: '',
        amount: '',
        expense_date: new Date().toISOString().slice(0, 10),
        payment_method: 'CASH',
        reference_number: '',
        receipt_attachment_url: '',
        notes: '',
      });
      loadExpenses();
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
      await financeApi.createExpenseCategory({
        ...categoryForm,
        monthly_budget: Number(categoryForm.monthly_budget) || 0,
      });
      setSuccessMsg('Expense category created');
      setIsCategoryModalOpen(false);
      setCategoryForm({ name: '', code: '', description: '', monthly_budget: '' });
      loadCategories();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Delete this expense voucher?')) return;
    try {
      setLoading(true);
      await financeApi.deleteExpense(id);
      setSuccessMsg('Expense voucher deleted');
      loadExpenses();
      loadCategories();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalBudget = categories.reduce((sum, c) => sum + Number(c.monthly_budget || 0), 0);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.title}>
            <FaReceipt style={{ color: '#e11d48' }} />
            School Expense & Procurement Tracking
          </div>
          <div className={styles.subtitle}>
            Log operational disbursements, track departmental budgets, and maintain procurement vouchers.
          </div>
        </div>

        <div className={styles.headerActions}>
          <button className={styles.btnSecondary} onClick={() => setIsCategoryModalOpen(true)}>
            <FaPlus /> Expense Categories
          </button>
          <button className={styles.btnPrimary} onClick={() => setIsExpenseModalOpen(true)}>
            <FaPlus /> New Expense Voucher
          </button>
          <button className={styles.btnSecondary} onClick={() => loadExpenses()}>
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
          <div className={styles.kpiIcon} style={{ background: '#ffe4e6', color: '#e11d48' }}>
            <FaReceipt />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Total Expenditure</span>
            <span className={styles.kpiValue} style={{ color: '#e11d48' }}>
              {totalSpent.toLocaleString()} ETB
            </span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: '#e0e7ff', color: '#4f46e5' }}>
            <FaChartPie />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Total Monthly Budget</span>
            <span className={styles.kpiValue}>{totalBudget.toLocaleString()} ETB</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: '#f1f5f9', color: '#475569' }}>
            <FaCalendarAlt />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Vouchers Logged</span>
            <span className={styles.kpiValue}>{expenses.length}</span>
          </div>
        </div>
      </div>

      {/* Category Budget Tracker */}
      <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: '#0f172a' }}>
          Monthly Category Budget Allocation & Utilization
        </h3>
        <div className={styles.budgetCardGrid}>
          {categories.map((cat) => {
            const spent = Number(cat.current_month_spent || 0);
            const budget = Number(cat.monthly_budget || 0);
            const percent = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
            const isOver = spent > budget && budget > 0;

            return (
              <div key={cat.id} className={styles.budgetCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span>{cat.name}</span>
                  <span style={{ color: isOver ? '#e11d48' : '#059669' }}>{percent}%</span>
                </div>
                <div className={styles.progressBarBg}>
                  <div
                    className={styles.progressBarFill}
                    style={{
                      width: `${percent}%`,
                      background: isOver ? '#e11d48' : percent > 80 ? '#f59e0b' : '#10b981',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b' }}>
                  <span>Spent: {spent.toLocaleString()} ETB</span>
                  <span>Budget: {budget.toLocaleString()} ETB</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filterBar}>
        <div className={styles.searchGroup}>
          <FaSearch color="#94a3b8" />
          <input
            type="text"
            placeholder="Search voucher #, payee, title..."
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
                <th>Voucher #</th>
                <th>Title / Description</th>
                <th>Category</th>
                <th>Payee / Vendor</th>
                <th>Expense Date</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Proof</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                    No expense vouchers found. Click "New Expense Voucher" to log operational disbursements.
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id}>
                    <td style={{ fontWeight: 700, color: '#e11d48' }}>{exp.voucher_number}</td>
                    <td><strong>{exp.title}</strong></td>
                    <td>
                      <span style={{ padding: '0.2rem 0.5rem', background: '#f1f5f9', borderRadius: '6px', fontWeight: 600 }}>
                        {exp.category_name}
                      </span>
                    </td>
                    <td>{exp.payee}</td>
                    <td>{new Date(exp.expense_date).toLocaleDateString()}</td>
                    <td style={{ fontWeight: 800, color: '#e11d48' }}>{Number(exp.amount).toLocaleString()} ETB</td>
                    <td>{exp.payment_method}</td>
                    <td>
                      {exp.receipt_attachment_url ? (
                        <a href={exp.receipt_attachment_url} target="_blank" rel="noopener noreferrer" style={{ color: '#4f46e5' }}>
                          View Receipt
                        </a>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td>
                      <button
                        style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}
                        onClick={() => handleDeleteExpense(exp.id)}
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

      {/* MODAL 1: NEW EXPENSE */}
      <ModalPortal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <h3>
              <FaReceipt /> Log New Expense Voucher
            </h3>
            <button className={styles.closeBtn} onClick={() => setIsExpenseModalOpen(false)}>
              <FaTimes />
            </button>
          </div>
          <form onSubmit={handleCreateExpense}>
            <div className={styles.modalBody}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Expense Category *</label>
                  <select
                    className={styles.formSelect}
                    value={expenseForm.expense_category_id}
                    onChange={(e) => setExpenseForm({ ...expenseForm, expense_category_id: e.target.value })}
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
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Title / Description *</label>
                <input
                  type="text"
                  placeholder="e.g. Science Laboratory Reagents Purchase"
                  className={styles.formInput}
                  value={expenseForm.title}
                  onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                  required
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Payee / Vendor *</label>
                  <input
                    type="text"
                    placeholder="e.g. ABC Office Supplies Ltd."
                    className={styles.formInput}
                    value={expenseForm.payee}
                    onChange={(e) => setExpenseForm({ ...expenseForm, payee: e.target.value })}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Payment Method</label>
                  <select
                    className={styles.formSelect}
                    value={expenseForm.payment_method}
                    onChange={(e) => setExpenseForm({ ...expenseForm, payment_method: e.target.value })}
                  >
                    <option value="CASH">Cash (Petty Cash)</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CHECK">Bank Cheque</option>
                  </select>
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Expense Date</label>
                  <input
                    type="date"
                    className={styles.formInput}
                    value={expenseForm.expense_date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Receipt URL / Attachment Link</label>
                  <input
                    type="text"
                    placeholder="https://..."
                    className={styles.formInput}
                    value={expenseForm.receipt_attachment_url}
                    onChange={(e) => setExpenseForm({ ...expenseForm, receipt_attachment_url: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnSecondary} onClick={() => setIsExpenseModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className={styles.btnPrimary} disabled={loading}>
                Save Expense Voucher
              </button>
            </div>
          </form>
        </div>
      </ModalPortal>

      {/* MODAL 2: CATEGORY */}
      <ModalPortal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <h3>Add Expense Category</h3>
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
                    placeholder="e.g. Facility Maintenance, Vehicle Fuel"
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
                    placeholder="e.g. MAINT, FUEL, IT"
                    className={styles.formInput}
                    value={categoryForm.code}
                    onChange={(e) => setCategoryForm({ ...categoryForm, code: e.target.value.toUpperCase() })}
                    required
                  />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>Monthly Budget Target (ETB)</label>
                <input
                  type="number"
                  step="0.01"
                  className={styles.formInput}
                  value={categoryForm.monthly_budget}
                  onChange={(e) => setCategoryForm({ ...categoryForm, monthly_budget: e.target.value })}
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
