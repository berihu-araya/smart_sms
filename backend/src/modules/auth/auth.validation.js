function validateLoginInput(input = {}) {
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const password = typeof input.password === 'string' ? input.password : '';
  const errors = {};

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'A valid email is required';
  }

  if (!password) {
    errors.password = 'Password is required';
  }

  return { email, password, errors };
}

function validateForgotPasswordInput(input = {}) {
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const errors = {};

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'A valid email is required';
  }

  return { email, errors };
}

function validateResetPasswordInput(input = {}) {
  const token = typeof input.token === 'string' ? input.token.trim() : '';
  const password = typeof input.password === 'string' ? input.password : '';
  const confirmPassword = typeof input.confirmPassword === 'string' ? input.confirmPassword : '';
  const errors = {};

  if (!token) {
    errors.token = 'Reset token is required';
  }

  if (!password) {
    errors.password = 'New password is required';
  }

  if (password.length > 0 && password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }

  if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords must match';
  }

  return { token, password, errors };
}

function validateChangePasswordInput(input = {}) {
  const currentPassword = typeof input.currentPassword === 'string' ? input.currentPassword : '';
  const newPassword = typeof input.newPassword === 'string' ? input.newPassword : '';
  const confirmPassword = typeof input.confirmPassword === 'string' ? input.confirmPassword : '';
  const errors = {};

  if (!currentPassword) {
    errors.currentPassword = 'Current password is required';
  }

  if (!newPassword) {
    errors.newPassword = 'New password is required';
  }

  if (newPassword.length > 0 && newPassword.length < 8) {
    errors.newPassword = 'New password must be at least 8 characters';
  }

  if (newPassword !== confirmPassword) {
    errors.confirmPassword = 'Passwords must match';
  }

  return { currentPassword, newPassword, errors };
}

function validateRegisterInput(input = {}) {
  let firstName = typeof input.firstName === 'string' ? input.firstName.trim() : '';
  let lastName = typeof input.lastName === 'string' ? input.lastName.trim() : '';
  const fullName = typeof input.fullName === 'string' ? input.fullName.trim() : '';
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const phone = typeof input.phone === 'string' ? input.phone.trim() : '';
  const role = typeof input.role === 'string' ? input.role.trim() : '';
  const password = typeof input.password === 'string' ? input.password : '';
  const confirmPassword = typeof input.confirmPassword === 'string' ? input.confirmPassword : '';
  const errors = {};

  if (fullName) {
    const parts = fullName.split(/\s+/).filter(Boolean);
    if (parts.length === 0 || fullName.length < 2) {
      errors.fullName = 'Full name must be at least 2 characters';
    } else {
      firstName = parts[0];
      lastName = parts.slice(1).join(' ') || parts[0];
    }
  } else {
    if (!firstName) {
      errors.firstName = 'First name (or full name) is required';
    } else if (firstName.length < 2) {
      errors.firstName = 'First name must be at least 2 characters';
    }

    if (!lastName) {
      errors.lastName = 'Last name is required';
    } else if (lastName.length < 2) {
      errors.lastName = 'Last name must be at least 2 characters';
    }
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'A valid email address is required';
  }

  if (phone && !/^[+0-9\s\-()]{7,25}$/.test(phone)) {
    errors.phone = 'Please enter a valid phone number';
  }

  if (!role) {
    errors.role = 'Please select a user role';
  }

  if (!password) {
    errors.password = 'Password is required';
  } else if (password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }

  if (password && confirmPassword !== undefined && password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  return {
    fullName: fullName || `${firstName} ${lastName}`.trim(),
    firstName,
    lastName,
    email,
    phone,
    role,
    password,
    confirmPassword,
    errors,
  };
}

module.exports = {
  validateLoginInput,
  validateRegisterInput,
  validateForgotPasswordInput,
  validateResetPasswordInput,
  validateChangePasswordInput,
};

