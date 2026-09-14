import { request } from './apiClient';

// 1. Settings & Policies
export async function getLibrarySettings() {
  const res = await request('/api/v1/library/config');
  return res.data;
}

export async function updateLibrarySettings(data) {
  const res = await request('/api/v1/library/config', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.data;
}

// 2. Master Data: Categories, Subjects, Authors, Publishers
export async function listLibraryCategories() {
  const res = await request('/api/v1/library/categories');
  return res.data;
}

export async function createLibraryCategory(data) {
  const res = await request('/api/v1/library/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function updateLibraryCategory(id, data) {
  const res = await request(`/api/v1/library/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function deleteLibraryCategory(id) {
  const res = await request(`/api/v1/library/categories/${id}`, {
    method: 'DELETE',
  });
  return res;
}

export async function listLibrarySubjects() {
  const res = await request('/api/v1/library/subjects');
  return res.data;
}

export async function createLibrarySubject(data) {
  const res = await request('/api/v1/library/subjects', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function updateLibrarySubject(id, data) {
  const res = await request(`/api/v1/library/subjects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function deleteLibrarySubject(id) {
  const res = await request(`/api/v1/library/subjects/${id}`, {
    method: 'DELETE',
  });
  return res;
}

export async function listLibraryAuthors() {
  const res = await request('/api/v1/library/authors');
  return res.data;
}

export async function createLibraryAuthor(data) {
  const res = await request('/api/v1/library/authors', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function updateLibraryAuthor(id, data) {
  const res = await request(`/api/v1/library/authors/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function deleteLibraryAuthor(id) {
  const res = await request(`/api/v1/library/authors/${id}`, {
    method: 'DELETE',
  });
  return res;
}

export async function listLibraryPublishers() {
  const res = await request('/api/v1/library/publishers');
  return res.data;
}

export async function createLibraryPublisher(data) {
  const res = await request('/api/v1/library/publishers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function updateLibraryPublisher(id, data) {
  const res = await request(`/api/v1/library/publishers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function deleteLibraryPublisher(id) {
  const res = await request(`/api/v1/library/publishers/${id}`, {
    method: 'DELETE',
  });
  return res;
}

// 3. Books & Copies Catalog
export async function listLibraryBooks(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await request(`/api/v1/library/books${query ? `?${query}` : ''}`);
  return res.data;
}

export async function getLibraryBook(id) {
  const res = await request(`/api/v1/library/books/${id}`);
  return res.data;
}

export async function createLibraryBook(data) {
  const res = await request('/api/v1/library/books', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function updateLibraryBook(id, data) {
  const res = await request(`/api/v1/library/books/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function deleteLibraryBook(id) {
  const res = await request(`/api/v1/library/books/${id}`, {
    method: 'DELETE',
  });
  return res;
}

export async function listBookCopies(bookId) {
  const res = await request(`/api/v1/library/books/${bookId}/copies`);
  return res.data;
}

export async function findCopyByBarcode(identifier) {
  const res = await request(`/api/v1/library/copies/barcode/${encodeURIComponent(identifier)}`);
  return res.data;
}

export async function createBookCopy(data) {
  const res = await request('/api/v1/library/copies', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function createBulkBookCopies(data) {
  const res = await request('/api/v1/library/copies/bulk', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function updateBookCopy(id, data) {
  const res = await request(`/api/v1/library/copies/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function deleteBookCopy(id) {
  const res = await request(`/api/v1/library/copies/${id}`, {
    method: 'DELETE',
  });
  return res;
}

// 4. Members
export async function listLibraryMembers(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await request(`/api/v1/library/members${query ? `?${query}` : ''}`);
  return res.data;
}

export async function getLibraryMember(id) {
  const res = await request(`/api/v1/library/members/${id}`);
  return res.data;
}

export async function getMyLibraryProfile() {
  const res = await request('/api/v1/library/members/me');
  return res.data;
}

export async function syncLibraryMembers() {
  const res = await request('/api/v1/library/members/sync', {
    method: 'POST',
  });
  return res.data;
}

export async function updateLibraryMemberStatus(id, data) {
  const res = await request(`/api/v1/library/members/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return res.data;
}

// 5. Circulation: Loans, Returns, Renewals
export async function issueLibraryLoan(data) {
  const res = await request('/api/v1/library/loans/issue', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function returnLibraryLoan(id, data = {}) {
  const res = await request(`/api/v1/library/loans/${id}/return`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function renewLibraryLoan(id, data = {}) {
  const res = await request(`/api/v1/library/loans/${id}/renew`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function listLibraryLoans(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await request(`/api/v1/library/loans${query ? `?${query}` : ''}`);
  return res.data;
}

export async function getLibraryLoan(id) {
  const res = await request(`/api/v1/library/loans/${id}`);
  return res.data;
}

export async function getMyLibraryLoans() {
  const res = await request('/api/v1/library/loans/my-loans');
  return res.data;
}

// 6. Reservations
export async function listLibraryReservations(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await request(`/api/v1/library/reservations${query ? `?${query}` : ''}`);
  return res.data;
}

export async function createLibraryReservation(data) {
  const res = await request('/api/v1/library/reservations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function cancelLibraryReservation(id) {
  const res = await request(`/api/v1/library/reservations/${id}`, {
    method: 'DELETE',
  });
  return res.data;
}

export async function getMyLibraryReservations() {
  const res = await request('/api/v1/library/reservations/my-reservations');
  return res.data;
}

// 7. Fines & Payments & Waivers
export async function listLibraryFines(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await request(`/api/v1/library/fines${query ? `?${query}` : ''}`);
  return res.data;
}

export async function payLibraryFine(data) {
  const res = await request('/api/v1/library/fines/pay', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function waiveLibraryFine(data) {
  const res = await request('/api/v1/library/fines/waive', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function getMyLibraryFines() {
  const res = await request('/api/v1/library/fines/my-fines');
  return res.data;
}

// 8. Stats, Reports & Audit
export async function getLibraryDashboardStats() {
  const res = await request('/api/v1/library/stats');
  return res.data;
}

export async function getLibraryTopBooks(limit = 10) {
  const res = await request(`/api/v1/library/reports/top-books?limit=${limit}`);
  return res.data;
}

export async function listLibraryAuditLogs(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await request(`/api/v1/library/audit${query ? `?${query}` : ''}`);
  return res.data;
}
