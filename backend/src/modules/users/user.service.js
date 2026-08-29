const bcrypt = require('bcrypt');

class UserService {
  constructor(repository, authRepository) {
    this.repository = repository;
    this.authRepository = authRepository;
  }

  async listUsers({ search = '', roleId = null, limit = 50, offset = 0 } = {}) {
    return await this.repository.findAll({ search, roleId, limit, offset });
  }

  async getUserById(id) {
    const user = await this.repository.findById(id);
    if (!user) {
      const error = new Error('User not found');
      error.status = 404;
      throw error;
    }
    return user;
  }

  async createUser(payload) {
    const existing = await this.authRepository.findActiveUserByEmail(payload.email);
    if (existing) {
      const error = new Error('A user with this email address already exists');
      error.status = 409;
      throw error;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(payload.password, salt);

    const user = await this.authRepository.createUser({
      roleId: payload.roleId,
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      phone: payload.phone,
      passwordHash,
      status: payload.status,
    });

    return user;
  }

  async updateUser(id, payload) {
    await this.getUserById(id);
    return await this.repository.update(id, payload);
  }

  async toggleUserStatus(id, status) {
    await this.getUserById(id);
    return await this.repository.updateStatus(id, status);
  }

  async resetPassword(id, newPassword) {
    await this.getUserById(id);
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    return await this.repository.resetPassword(id, passwordHash);
  }

  async deleteUser(id) {
    await this.getUserById(id);
    return await this.repository.softDelete(id);
  }
}

module.exports = UserService;
