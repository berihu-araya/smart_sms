import { request } from './apiClient';

/**
 * Builds a query string from a parameters object.
 * Filters out undefined, null, and empty string values.
 * @param {object} params
 * @returns {string}
 */
function buildQueryString(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, value);
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * High-fidelity offline fallback dataset.
 * Allows frontend development and UI demonstration to proceed independently with real data fidelity.
 */
let mockAnnouncements = [
  {
    id: 'mock-ann-01',
    school_id: 'default-school',
    title: 'Semester 1 Final Examination Schedule & Examination Hall Protocol',
    content: 'The official final examination schedules for Grades 7 through 12 have been published. All candidates are expected to be present at least 30 minutes prior to exam commencement in proper uniform with their admission identification card and authorized stationery. Electronic gadgets, smart watches, and unauthorized materials are strictly prohibited in the examination halls.',
    category: 'EXAMINATION',
    priority: 'URGENT',
    audience: 'ALL',
    grade_id: null,
    grade_name: 'All Grades',
    section_id: null,
    section_name: null,
    attachment_url: 'https://smart-sms.edu.et/docs/term1-exam-schedule.pdf',
    attachment_name: 'Term1_Official_Exam_Schedule_2026.pdf',
    is_pinned: true,
    requires_acknowledgement: true,
    status: 'PUBLISHED',
    published_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    expires_at: null,
    created_by: 'admin-01',
    author_name: 'Dr. Belayneh Hailu',
    author_role: 'School Principal',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    is_acknowledged: false,
    acknowledged_at: null,
    acknowledgement_count: 42,
  },
  {
    id: 'mock-ann-02',
    school_id: 'default-school',
    title: 'Annual STEM Innovation Fair & Cultural Heritage Exhibition',
    content: 'We are thrilled to announce our Annual STEM & Cultural Day on Friday, November 28th. Students across primary and secondary divisions will showcase robotics projects, interactive science demonstrations, and regional culinary arts. Parents, alumni, and community partners are warmly welcome to attend from 9:00 AM to 4:00 PM.',
    category: 'EVENT',
    priority: 'IMPORTANT',
    audience: 'ALL',
    grade_id: null,
    grade_name: 'All School',
    section_id: null,
    section_name: null,
    attachment_url: 'https://smart-sms.edu.et/docs/stem-fair-program.pdf',
    attachment_name: 'STEM_Fair_Program_Guide.pdf',
    is_pinned: true,
    requires_acknowledgement: false,
    status: 'PUBLISHED',
    published_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    expires_at: null,
    created_by: 'admin-02',
    author_name: 'Hanna Mengistu',
    author_role: 'Head of Sciences',
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    is_acknowledged: true,
    acknowledged_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    acknowledgement_count: 89,
  },
  {
    id: 'mock-ann-03',
    school_id: 'default-school',
    title: 'Grade 9 & 10 Parent-Teacher Academic Progress Conference',
    content: 'Dear Parents & Guardians, the mid-term Parent-Teacher Academic Consultation will take place this Saturday in the main auditorium. Class teachers and subject specialists will be available to review academic progress report cards, attendance records, and personal development milestones. Individual 15-minute appointment slots can be confirmed at the academic office.',
    category: 'ACADEMIC',
    priority: 'IMPORTANT',
    audience: 'PARENTS',
    grade_id: null,
    grade_name: 'Grades 9 & 10',
    section_id: null,
    section_name: null,
    attachment_url: 'https://smart-sms.edu.et/docs/pta-booking-form.pdf',
    attachment_name: 'PTA_Consultation_Schedule.pdf',
    is_pinned: false,
    requires_acknowledgement: true,
    status: 'PUBLISHED',
    published_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    expires_at: null,
    created_by: 'admin-01',
    author_name: 'Yared Tadesse',
    author_role: 'Vice Principal (Academics)',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    is_acknowledged: false,
    acknowledged_at: null,
    acknowledgement_count: 28,
  },
  {
    id: 'mock-ann-04',
    school_id: 'default-school',
    title: 'Public Holiday Observance: School Closed Next Monday',
    content: 'Please be advised that the school and administrative offices will be closed on Monday in observance of the upcoming National Holiday. Regular academic schedules, campus cafeteria services, and transport pickup routes will resume at normal hours on Tuesday.',
    category: 'HOLIDAY',
    priority: 'NORMAL',
    audience: 'ALL',
    grade_id: null,
    grade_name: null,
    section_id: null,
    section_name: null,
    attachment_url: null,
    attachment_name: null,
    is_pinned: false,
    requires_acknowledgement: false,
    status: 'PUBLISHED',
    published_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    expires_at: null,
    created_by: 'admin-01',
    author_name: 'Office of the Registrar',
    author_role: 'School Admin',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    is_acknowledged: true,
    acknowledged_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    acknowledgement_count: 145,
  },
  {
    id: 'mock-ann-05',
    school_id: 'default-school',
    title: 'Term 2 Tuition Fee Settlement & Payment Gateway Guidelines',
    content: 'This circular serves as a reminder that the early payment window for Term 2 tuition fees closes on the 25th of this month. Parents may settle dues online through the school mobile banking integration or at authorized bank branches using the student admission number as payment reference.',
    category: 'FEE_FINANCE',
    priority: 'IMPORTANT',
    audience: 'PARENTS',
    grade_id: null,
    grade_name: 'All Parents',
    section_id: null,
    section_name: null,
    attachment_url: 'https://smart-sms.edu.et/docs/fee-structure.pdf',
    attachment_name: 'Term2_Tuition_Schedule.pdf',
    is_pinned: false,
    requires_acknowledgement: false,
    status: 'PUBLISHED',
    published_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    expires_at: null,
    created_by: 'admin-03',
    author_name: 'Binyam Assefa',
    author_role: 'Finance Officer',
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    is_acknowledged: false,
    acknowledged_at: null,
    acknowledgement_count: 53,
  },
  {
    id: 'mock-ann-06',
    school_id: 'default-school',
    title: 'Inter-House Athletics & Sports Championship Tryouts',
    content: 'Student tryouts for the annual Track & Field Inter-House championship will begin this Thursday after classes on the main sports ground. Events include 100m sprint, 400m relay, long jump, and football. All participating students must bring appropriate athletic attire and parent medical clearance.',
    category: 'SPORTS',
    priority: 'NORMAL',
    audience: 'STUDENTS',
    grade_id: null,
    grade_name: 'Grades 7 - 12',
    section_id: null,
    section_name: null,
    attachment_url: null,
    attachment_name: null,
    is_pinned: false,
    requires_acknowledgement: false,
    status: 'PUBLISHED',
    published_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    expires_at: null,
    created_by: 'admin-04',
    author_name: 'Coach Dawit Wolde',
    author_role: 'Athletics Coordinator',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    is_acknowledged: false,
    acknowledged_at: null,
    acknowledgement_count: 77,
  },
];

// In-memory store for client acknowledgement audit logs
const mockAuditStore = {
  'mock-ann-01': [
    { id: 'u1', full_name: 'Almaz Tefera (Parent)', email: 'almaz@gmail.com', phone: '+251 911 234 567', role_name: 'Parent', acknowledged_at: new Date(Date.now() - 3600000 * 1).toISOString() },
    { id: 'u2', full_name: 'Dr. Solomon Bekele (Parent)', email: 'solomon.b@yahoo.com', phone: '+251 922 456 789', role_name: 'Parent', acknowledged_at: new Date(Date.now() - 3600000 * 2).toISOString() },
    { id: 'u3', full_name: 'Marta Asrat (Student - Grade 10A)', email: 'marta.asrat@student.smartsms.edu', phone: '+251 933 789 012', role_name: 'Student', acknowledged_at: new Date(Date.now() - 3600000 * 4).toISOString() },
    { id: 'u4', full_name: 'Bereket Tilahun (Student - Grade 10B)', email: 'bereket.t@student.smartsms.edu', phone: '+251 944 123 456', role_name: 'Student', acknowledged_at: new Date(Date.now() - 3600000 * 6).toISOString() },
    { id: 'u5', full_name: 'Tigist Gebre (Teacher)', email: 'tigist.g@smart-sms.com', phone: '+251 955 345 678', role_name: 'Teacher', acknowledged_at: new Date(Date.now() - 3600000 * 8).toISOString() },
  ],
};

/**
 * Fetch paginated announcements with filtering and scoping.
 * Gracefully falls back to offline mock dataset if backend is unreachable during standalone frontend work.
 * @param {object} params
 * @returns {Promise<{ items: Array, total: number, page: number, limit: number, totalPages: number }>}
 */
export async function listAnnouncements(params = {}) {
  try {
    const query = buildQueryString(params);
    const response = await request(`/api/v1/announcements${query}`);
    if (response?.data?.items) {
      return response.data;
    }
  } catch (error) {
    console.warn('[announcementService] Live backend unavailable, using client dataset for independent frontend dev:', error.message);
  }

  // Client-side filtering fallback
  let filtered = [...mockAnnouncements];

  if (params.search) {
    const s = params.search.toLowerCase();
    filtered = filtered.filter((a) => a.title.toLowerCase().includes(s) || a.content.toLowerCase().includes(s));
  }

  if (params.category) {
    filtered = filtered.filter((a) => a.category === params.category);
  }

  if (params.priority) {
    filtered = filtered.filter((a) => a.priority === params.priority);
  }

  if (params.audience) {
    filtered = filtered.filter((a) => a.audience === params.audience || a.audience === 'ALL');
  }

  if (params.status) {
    filtered = filtered.filter((a) => a.status === params.status);
  }

  if (params.is_pinned === 'true' || params.is_pinned === true) {
    filtered = filtered.filter((a) => a.is_pinned);
  }

  if (params.date_range) {
    const now = Date.now();
    if (params.date_range === 'TODAY') {
      const todayStart = new Date().setHours(0, 0, 0, 0);
      filtered = filtered.filter((a) => new Date(a.published_at).getTime() >= todayStart);
    } else if (params.date_range === 'WEEK') {
      const weekStart = now - 7 * 86400000;
      filtered = filtered.filter((a) => new Date(a.published_at).getTime() >= weekStart);
    } else if (params.date_range === 'MONTH') {
      const monthStart = now - 30 * 86400000;
      filtered = filtered.filter((a) => new Date(a.published_at).getTime() >= monthStart);
    }
  }

  // Sort
  if (params.sort === 'OLDEST') {
    filtered.sort((a, b) => new Date(a.published_at) - new Date(b.published_at));
  } else if (params.sort === 'PRIORITY') {
    const pRank = { URGENT: 3, IMPORTANT: 2, NORMAL: 1 };
    filtered.sort((a, b) => (pRank[b.priority] || 0) - (pRank[a.priority] || 0));
  } else if (params.sort === 'MOST_ACKNOWLEDGED') {
    filtered.sort((a, b) => (b.acknowledgement_count || 0) - (a.acknowledgement_count || 0));
  } else {
    // Default: Pinned first, then newest
    filtered.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.published_at) - new Date(a.published_at);
    });
  }

  const page = parseInt(params.page, 10) || 1;
  const limit = parseInt(params.limit, 10) || 12;
  const total = filtered.length;
  const start = (page - 1) * limit;
  const items = filtered.slice(start, start + limit);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

/**
 * Fetch announcement dashboard KPI statistics.
 * @returns {Promise<{ totalAnnouncements: number, activeAnnouncements: number, urgentAlerts: number, pinnedAnnouncements: number, pendingAcknowledgements: number, urgentUnacknowledgedNotice: object|null }>}
 */
export async function getAnnouncementStats() {
  try {
    const response = await request('/api/v1/announcements/stats');
    if (response?.data) {
      return response.data;
    }
  } catch (error) {
    console.warn('[announcementService] Live stats unavailable, using client calculated stats:', error.message);
  }

  const active = mockAnnouncements.filter((a) => a.status === 'PUBLISHED');
  const urgent = active.filter((a) => a.priority === 'URGENT');
  const pinned = active.filter((a) => a.is_pinned);
  const pendingAcks = active.filter((a) => a.requires_acknowledgement && !a.is_acknowledged);
  const urgentPrompt = pendingAcks.find((a) => a.priority === 'URGENT') || null;

  return {
    totalAnnouncements: mockAnnouncements.length,
    activeAnnouncements: active.length,
    urgentAlerts: urgent.length,
    pinnedAnnouncements: pinned.length,
    pendingAcknowledgements: pendingAcks.length,
    urgentUnacknowledgedNotice: urgentPrompt,
  };
}

/**
 * Fetch details of a single announcement.
 * @param {string} id
 * @returns {Promise<object>}
 */
export async function getAnnouncementById(id) {
  try {
    const response = await request(`/api/v1/announcements/${id}`);
    if (response?.data) return response.data;
  } catch (err) {
    console.warn('[announcementService] getById fallback:', err.message);
  }

  return mockAnnouncements.find((a) => a.id === id) || null;
}

/**
 * Create a new announcement.
 * @param {object} payload
 * @returns {Promise<object>}
 */
export async function createAnnouncement(payload) {
  try {
    const response = await request('/api/v1/announcements', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (response?.data) {
      return response.data;
    }
  } catch (error) {
    console.warn('[announcementService] create fallback to client state:', error.message);
  }

  const newNotice = {
    id: `mock-ann-${Date.now()}`,
    school_id: 'default-school',
    ...payload,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    published_at: payload.published_at || new Date().toISOString(),
    author_name: payload.author_name || 'Academic Administrator',
    author_role: payload.author_role || 'Office of Communications',
    is_acknowledged: false,
    acknowledgement_count: 0,
  };

  mockAnnouncements.unshift(newNotice);
  return newNotice;
}

/**
 * Update an existing announcement.
 * @param {string} id
 * @param {object} payload
 * @returns {Promise<object>}
 */
export async function updateAnnouncement(id, payload) {
  try {
    const response = await request(`/api/v1/announcements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    if (response?.data) {
      return response.data;
    }
  } catch (error) {
    console.warn('[announcementService] update fallback to client state:', error.message);
  }

  const idx = mockAnnouncements.findIndex((a) => a.id === id);
  if (idx !== -1) {
    mockAnnouncements[idx] = {
      ...mockAnnouncements[idx],
      ...payload,
      updated_at: new Date().toISOString(),
    };
    return mockAnnouncements[idx];
  }

  return null;
}

/**
 * Toggle pin status of an announcement.
 * @param {string} id
 * @returns {Promise<object>}
 */
export async function togglePin(id) {
  try {
    const response = await request(`/api/v1/announcements/${id}/pin`, {
      method: 'PATCH',
    });
    if (response?.data) {
      return response.data;
    }
  } catch (error) {
    console.warn('[announcementService] togglePin fallback:', error.message);
  }

  const notice = mockAnnouncements.find((a) => a.id === id);
  if (notice) {
    notice.is_pinned = !notice.is_pinned;
    return { id, is_pinned: notice.is_pinned };
  }
  return null;
}

/**
 * Toggle status of an announcement (e.g. DRAFT, PUBLISHED, ARCHIVED).
 * @param {string} id
 * @param {string} status
 * @returns {Promise<object>}
 */
export async function toggleStatus(id, status) {
  try {
    const response = await request(`/api/v1/announcements/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    if (response?.data) {
      return response.data;
    }
  } catch (error) {
    console.warn('[announcementService] toggleStatus fallback:', error.message);
  }

  const notice = mockAnnouncements.find((a) => a.id === id);
  if (notice) {
    notice.status = status;
    return { id, status };
  }
  return null;
}

/**
 * Acknowledge an announcement for the currently logged-in user.
 * @param {string} id
 * @param {object} currentUser
 * @returns {Promise<object>}
 */
export async function acknowledgeAnnouncement(id, currentUser = null) {
  try {
    const response = await request(`/api/v1/announcements/${id}/acknowledge`, {
      method: 'POST',
    });
    if (response?.data) {
      return response.data;
    }
  } catch (error) {
    console.warn('[announcementService] acknowledge fallback:', error.message);
  }

  const notice = mockAnnouncements.find((a) => a.id === id);
  if (notice) {
    notice.is_acknowledged = true;
    notice.acknowledged_at = new Date().toISOString();
    notice.acknowledgement_count = (notice.acknowledgement_count || 0) + 1;

    // Record into mockAuditStore
    if (!mockAuditStore[id]) {
      mockAuditStore[id] = [];
    }
    const alreadyLogged = mockAuditStore[id].some((u) => u.id === (currentUser?.id || 'curr-user'));
    if (!alreadyLogged) {
      mockAuditStore[id].unshift({
        id: currentUser?.id || 'curr-user',
        full_name: currentUser?.full_name || currentUser?.name || 'You (Current Session)',
        email: currentUser?.email || 'user@smart-sms.edu',
        phone: currentUser?.phone || '+251 911 000 111',
        role_name: currentUser?.role || 'Authorized Recipient',
        acknowledged_at: notice.acknowledged_at,
      });
    }

    return { id, is_acknowledged: true, acknowledged_at: notice.acknowledged_at };
  }
  return null;
}

/**
 * Fetch audit list of users who acknowledged an announcement (Admin/Teachers).
 * @param {string} id
 * @returns {Promise<{ items: Array, total: number, targetCount: number, percentage: number }>}
 */
export async function getAcknowledgements(id) {
  try {
    const response = await request(`/api/v1/announcements/${id}/acknowledgements`);
    if (response?.data) {
      return response.data;
    }
  } catch (error) {
    console.warn('[announcementService] getAcknowledgements fallback:', error.message);
  }

  const notice = mockAnnouncements.find((a) => a.id === id);
  const items = mockAuditStore[id] || [
    { id: 'u1', full_name: 'Almaz Tefera (Parent)', email: 'almaz@gmail.com', phone: '+251 911 234 567', role_name: 'Parent', acknowledged_at: new Date(Date.now() - 3600000 * 2).toISOString() },
    { id: 'u2', full_name: 'Dr. Solomon Bekele (Parent)', email: 'solomon.b@yahoo.com', phone: '+251 922 456 789', role_name: 'Parent', acknowledged_at: new Date(Date.now() - 3600000 * 4).toISOString() },
    { id: 'u3', full_name: 'Marta Asrat (Student - Grade 10A)', email: 'marta.asrat@student.smartsms.edu', phone: '+251 933 789 012', role_name: 'Student', acknowledged_at: new Date(Date.now() - 3600000 * 7).toISOString() },
    { id: 'u4', full_name: 'Bereket Tilahun (Student - Grade 10B)', email: 'bereket.t@student.smartsms.edu', phone: '+251 944 123 456', role_name: 'Student', acknowledged_at: new Date(Date.now() - 3600000 * 10).toISOString() },
  ];

  const count = notice?.acknowledgement_count || items.length;
  const target = 50;

  return {
    items,
    total: count,
    targetCount: target,
    percentage: Math.min(100, Math.round((count / target) * 100)),
  };
}

/**
 * Soft delete an announcement.
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function deleteAnnouncement(id) {
  try {
    const response = await request(`/api/v1/announcements/${id}`, {
      method: 'DELETE',
    });
    return response.success;
  } catch (error) {
    console.warn('[announcementService] delete fallback:', error.message);
    mockAnnouncements = mockAnnouncements.filter((a) => a.id !== id);
    return true;
  }
}

const announcementService = {
  listAnnouncements,
  getAnnouncementStats,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  togglePin,
  toggleStatus,
  acknowledgeAnnouncement,
  getAcknowledgements,
  deleteAnnouncement,
};

export default announcementService;
