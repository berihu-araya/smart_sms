/**
 * Staff Module Constants & Configuration
 */

export const STAFF_ROLES = [
  'Staff',
  'School Admin',
  'Admin',
  'Accountant',
  'Librarian',
  'Receptionist',
  'Driver',
  'Security',
  'Maintenance',
];

export const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active Only' },
  { value: 'INACTIVE', label: 'Inactive Only' },
];

export const SORT_OPTIONS = [
  { value: 'NAME_ASC', label: 'Name (A → Z)' },
  { value: 'NAME_DESC', label: 'Name (Z → A)' },
  { value: 'ROLE_ASC', label: 'Role (A → Z)' },
  { value: 'STATUS', label: 'Status (Active First)' },
];

export const INITIAL_STAFF_FORM_STATE = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  roleId: '',
  password: '',
  status: 'ACTIVE',
};

export const PASSWORD_STRENGTH_CONFIG = {
  MIN_LENGTH: 6,
  RECOMMENDED_LENGTH: 10,
};
