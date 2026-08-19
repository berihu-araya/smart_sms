const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class AuthenticationError extends Error {
  constructor(message = 'Invalid email or password') {
    super(message);
    this.name = 'AuthenticationError';
    this.status = 401;
  }
}

class AuthorizationError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'AuthorizationError';
    this.status = 401;
  }
}

class AuthService {
  constructor(repository, { jwtSecret, jwtExpiresIn, passwordResetTokenHours = 1 }) {
    this.repository = repository;
    this.jwtSecret = jwtSecret;
    this.jwtExpiresIn = jwtExpiresIn;
    this.passwordResetTokenHours = Number(passwordResetTokenHours);
  }

  async login({ email, password }) {
    const user = await this.repository.findActiveUserByEmail(email);
    const passwordMatches = user
      ? await bcrypt.compare(password, user.password_hash)
      : false;

    if (!passwordMatches || user.status !== 'ACTIVE') {
      throw new AuthenticationError();
    }

    const token = jwt.sign(
      { sub: user.id, role: user.role_name, email: user.email },
      this.jwtSecret,
      { expiresIn: this.jwtExpiresIn }
    );

    await this.repository.updateLastLogin(user.id);

    return {
      token,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        phone: user.phone,
        role: user.role_name,
        profileImage: user.profile_image,
      },
    };
  }

  async sendPasswordReset({ email }) {
    const user = await this.repository.findActiveUserByEmail(email);

    if (!user) {
      return { resetToken: null };
    }

    const token = crypto.randomUUID();
    await this.repository.savePasswordResetToken(user.id, token, this.passwordResetTokenHours);

    return {
      resetToken: token,
    };
  }

  async resetPassword({ token, password }) {
    const resetToken = await this.repository.findValidPasswordResetToken(token);

    if (!resetToken || resetToken.used_at) {
      throw new AuthorizationError('Invalid or expired reset token');
    }

    if (new Date(resetToken.expires_at) < new Date()) {
      throw new AuthorizationError('Reset token has expired');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await this.repository.updatePasswordHash(resetToken.user_id, passwordHash);
    await this.repository.markPasswordResetTokenUsed(token);
  }

  async changePassword({ userId, currentPassword, newPassword }) {
    const user = await this.repository.findUserById(userId);

    if (!user || user.status !== 'ACTIVE') {
      throw new AuthorizationError();
    }

    const passwordMatches = await bcrypt.compare(currentPassword, user.password_hash);

    if (!passwordMatches) {
      throw new AuthorizationError('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.repository.updatePasswordHash(userId, passwordHash);
  }

  async updateProfileImage(userId, profileImage) {
    const user = await this.repository.findUserById(userId);

    if (!user || user.status !== 'ACTIVE') {
      throw new AuthorizationError();
    }

    await this.repository.updateProfileImage(userId, profileImage);

    return { profileImage };
  }

  async getProfile(userId) {
    const user = await this.repository.findUserById(userId);

    if (!user || user.status !== 'ACTIVE') {
      throw new AuthorizationError();
    }

    return {
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        phone: user.phone,
        role: user.role_name,
        profileImage: user.profile_image,
      },
    };
  }
}

module.exports = {
  AuthService,
  AuthenticationError,
  AuthorizationError,
};
