"use client";

import { useState, useMemo } from "react";
import styles from "./SmartTable.module.css";
import {
  HiMagnifyingGlass,
  HiXMark,
  HiChevronLeft,
  HiChevronRight,
  HiArrowPath,
  HiPlus,
  HiChevronUpDown,
  HiChevronUp,
  HiChevronDown,
  HiInbox,
} from "react-icons/hi2";

export default function SmartTable({
  columns = [],
  data = [],
  total = 0,
  page = 1,
  limit = 20,
  onPageChange,
  onLimitChange,
  search = "",
  onSearchChange,
  searchPlaceholder = "Search records...",
  status = "active",
  onStatusChange,
  statusOptions = [
    { label: "Active", value: "active" },
    { label: "Inactive", value: "inactive" },
    { label: "All", value: "all" },
  ],
  sortBy = "",
  sortOrder = "ASC",
  onSortChange,
  loading = false,
  error = "",
  onRetry,
  onAddNew,
  addNewText = "Add New",
  extraFilters = null,
  emptyTitle = "No records found",
  emptyDescription = "No data matches your active search or filters.",
}) {
  const handleSortClick = (colKey, isSortable) => {
    if (!isSortable || !onSortChange) return;

    if (sortBy === colKey) {
      onSortChange(colKey, sortOrder === "ASC" ? "DESC" : "ASC");
    } else {
      onSortChange(colKey, "ASC");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const startRecord = total === 0 ? 0 : (page - 1) * limit + 1;
  const endRecord = Math.min(total, page * limit);

  return (
    <div className={styles.container}>
      {/* Top Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          {/* Search Input */}
          {onSearchChange && (
            <div className={styles.searchWrapper}>
              <HiMagnifyingGlass className={styles.searchIcon} />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className={styles.searchInput}
              />
              {search && (
                <button
                  type="button"
                  className={styles.clearSearchBtn}
                  onClick={() => onSearchChange("")}
                  title="Clear search"
                >
                  <HiXMark size={16} />
                </button>
              )}
            </div>
          )}

          {/* Status Filter Tabs */}
          {onStatusChange && (
            <div className={styles.statusTabs}>
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`${styles.statusTab} ${
                    status === opt.value ? styles.statusTabActive : ""
                  }`}
                  onClick={() => onStatusChange(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* Extra Custom Filters (e.g. Grade dropdown on section list) */}
          {extraFilters}
        </div>

        <div className={styles.toolbarRight}>
          {onRetry && (
            <button
              type="button"
              className={styles.btnIcon}
              onClick={onRetry}
              title="Refresh list"
            >
              <HiArrowPath size={17} />
            </button>
          )}

          {onAddNew && (
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={onAddNew}
            >
              <HiPlus size={18} />
              <span>{addNewText}</span>
            </button>
          )}
        </div>
      </div>

      {/* Table Card */}
      <div className={styles.tableCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                {columns.map((col) => {
                  const isSorted = sortBy === col.key;
                  return (
                    <th
                      key={col.key}
                      style={{
                        width: col.width || "auto",
                        textAlign: col.align || "left",
                      }}
                      className={`${styles.th} ${
                        col.sortable ? styles.thSortable : ""
                      }`}
                      onClick={() => handleSortClick(col.key, col.sortable)}
                    >
                      <div
                        className={styles.thContent}
                        style={{
                          justifyContent:
                            col.align === "right"
                              ? "flex-end"
                              : col.align === "center"
                              ? "center"
                              : "flex-start",
                        }}
                      >
                        <span>{col.label}</span>
                        {col.sortable && (
                          <span
                            className={`${styles.sortIcon} ${
                              isSorted ? styles.sortIconActive : ""
                            }`}
                          >
                            {isSorted ? (
                              sortOrder === "ASC" ? (
                                <HiChevronUp size={14} />
                              ) : (
                                <HiChevronDown size={14} />
                              )
                            ) : (
                              <HiChevronUpDown size={14} />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                // Skeleton Rows
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx}>
                    {columns.map((col, cIdx) => (
                      <td key={cIdx} className={styles.td}>
                        <div
                          className={styles.skeletonCell}
                          style={{ width: cIdx === 0 ? "60%" : "85%" }}
                        ></div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={columns.length} className={styles.td}>
                    <div className={styles.emptyState}>
                      <p style={{ color: "#dc2626", margin: 0, fontWeight: 600 }}>
                        {error}
                      </p>
                      {onRetry && (
                        <button
                          type="button"
                          className={styles.btnPrimary}
                          onClick={onRetry}
                          style={{ marginTop: "10px" }}
                        >
                          Retry Loading
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className={styles.td}>
                    <div className={styles.emptyState}>
                      <HiInbox className={styles.emptyIcon} />
                      <h3 className={styles.emptyTitle}>{emptyTitle}</h3>
                      <p className={styles.emptyText}>{emptyDescription}</p>
                      {onAddNew && (
                        <button
                          type="button"
                          className={styles.btnPrimary}
                          onClick={onAddNew}
                          style={{ marginTop: "8px" }}
                        >
                          <HiPlus size={18} />
                          <span>{addNewText}</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((row, index) => (
                  <tr key={row.id || index} className={styles.tr}>
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={styles.td}
                        style={{ textAlign: col.align || "left" }}
                      >
                        {col.render ? col.render(row, index) : row[col.key] ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!loading && data.length > 0 && (
          <div className={styles.paginationFooter}>
            <div className={styles.recordsInfo}>
              Showing <strong>{startRecord}</strong> to{" "}
              <strong>{endRecord}</strong> of <strong>{total}</strong> records
            </div>

            <div className={styles.paginationControls}>
              {onLimitChange && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "13px", color: "#64748b" }}>Rows:</span>
                  <select
                    value={limit}
                    onChange={(e) => onLimitChange(Number(e.target.value))}
                    className={styles.pageSizeSelect}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              )}

              {onPageChange && (
                <>
                  <button
                    type="button"
                    className={styles.pageBtn}
                    onClick={() => onPageChange(page - 1)}
                    disabled={page <= 1}
                    aria-label="Previous page"
                  >
                    <HiChevronLeft size={16} /> Prev
                  </button>

                  <span className={styles.pageIndicator}>
                    Page {page} of {totalPages}
                  </span>

                  <button
                    type="button"
                    className={styles.pageBtn}
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= totalPages}
                    aria-label="Next page"
                  >
                    Next <HiChevronRight size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
