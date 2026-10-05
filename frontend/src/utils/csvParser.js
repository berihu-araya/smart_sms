export function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === '"') {
      if (quoted && nextCharacter === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      row.push(value);
      value = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && nextCharacter === '\n') index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim() !== '')) rows.push(row);
      row = [];
      value = '';
    } else {
      value += character;
    }
  }

  if (quoted) throw new Error('CSV contains an unterminated quoted field');
  if (value !== '' || row.length > 0) {
    row.push(value);
    if (row.some((cell) => cell.trim() !== '')) rows.push(row);
  }
  if (rows.length === 0) return [];

  const headers = rows[0].map((header, index) => {
    const normalized = header.trim().toLowerCase().replace(/\s+/g, '_');
    return normalized || `column_${index + 1}`;
  });

  return rows.slice(1).map((cells, rowIndex) => {
    const record = { _row: rowIndex + 2 };
    headers.forEach((header, index) => {
      record[header] = (cells[index] || '').trim();
    });
    return record;
  });
}

export function csvToText(rows, columns = Object.keys(rows[0] || {}).filter((key) => key !== '_row')) {
  const escapeCell = (value) => {
    const text = value === null || value === undefined ? '' : String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  return [
    columns.map(escapeCell).join(','),
    ...rows.map((row) => columns.map((column) => escapeCell(row[column])).join(',')),
  ].join('\r\n');
}
