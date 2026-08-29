class RoleService {
  constructor(repository) {
    this.repository = repository;
  }

  async listRoles() {
    return await this.repository.findAll();
  }

  async getRoleById(id) {
    const role = await this.repository.findById(id);
    if (!role) {
      const error = new Error('Role not found');
      error.status = 404;
      throw error;
    }
    return role;
  }
}

module.exports = RoleService;
