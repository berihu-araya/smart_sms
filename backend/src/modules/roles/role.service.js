class RoleService {
  constructor(roleRepository, auditService = null) {
    this.roleRepository = roleRepository;
    this.auditService = auditService;
  }

  async listRoles() {
    return this.roleRepository.findAll();
  }

  async getRole(id) {
    const role = await this.roleRepository.findById(id);
    if (!role) {
      const error = new Error('Role not found');
      error.status = 404;
      throw error;
    }
    return role;
  }

  async createRole(payload, userContext = null) {
    if (!payload.name || !payload.name.trim()) {
      const error = new Error('Role name is required');
      error.status = 400;
      throw error;
    }
    const created = await this.roleRepository.create(payload);

    if (this.auditService && userContext) {
      await this.auditService.log({
        schoolId: userContext.schoolId,
        userId: userContext.userId,
        action: 'ROLE_CREATED',
        resourceType: 'ROLE',
        resourceId: created.id,
        newValues: created,
        ipAddress: userContext.ip,
        userAgent: userContext.userAgent,
      }).catch(() => null);
    }

    return created;
  }

  async deleteRole(id, userContext = null) {
    const deleted = await this.roleRepository.delete(id);

    if (this.auditService && userContext) {
      await this.auditService.log({
        schoolId: userContext.schoolId,
        userId: userContext.userId,
        action: 'ROLE_DELETED',
        resourceType: 'ROLE',
        resourceId: id,
        ipAddress: userContext.ip,
        userAgent: userContext.userAgent,
      }).catch(() => null);
    }

    return deleted;
  }

  async getRolePermissions(roleId) {
    const role = await this.roleRepository.findById(roleId);
    if (!role) {
      const error = new Error('Role not found');
      error.status = 404;
      throw error;
    }
    const permissions = await this.roleRepository.getRolePermissions(roleId);
    return {
      role,
      permissions,
    };
  }

  async updateRolePermissions(roleId, permissionsList, userContext = null) {
    const role = await this.roleRepository.findById(roleId);
    if (!role) {
      const error = new Error('Role not found');
      error.status = 404;
      throw error;
    }

    const updated = await this.roleRepository.updateRolePermissions(roleId, permissionsList);

    if (this.auditService && userContext) {
      await this.auditService.log({
        schoolId: userContext.schoolId,
        userId: userContext.userId,
        action: 'ROLE_PERMISSIONS_UPDATED',
        resourceType: 'ROLE_PERMISSIONS',
        resourceId: roleId,
        newValues: { roleName: role.name, permissionsCount: updated.length },
        ipAddress: userContext.ip,
        userAgent: userContext.userAgent,
      }).catch(() => null);
    }

    return updated;
  }
}

module.exports = RoleService;
