/**
 * Utility to convert an array of objects to CSV and trigger browser download.
 *
 * @param {Array<Object>} data - Array of objects to export
 * @param {Array<{ key: string, label: string }>} columns - Column definitions
 * @param {string} filename - Download file name without extension
 */
export function exportToCSV(data, columns, filename = "export") {
  if (!data || data.length === 0) {
    alert("No data available to export");
    return;
  }

  const headers = columns.map((col) => `"${col.label.replace(/"/g, '""')}"`).join(",");
  const rows = data.map((item) => {
    return columns
      .map((col) => {
        let val = item[col.key];
        if (val === null || val === undefined) val = "";
        val = String(val).replace(/"/g, '""');
        return `"${val}"`;
      })
      .join(",");
  });

  const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
