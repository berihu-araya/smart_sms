class DepartmentController {
  constructor(departmentService) {
    this.departmentService = departmentService;
  }

  getUserContext(req) {
    return {
      userId: req.user?.id,
      schoolId: req.user?.school_id,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('user-agent'),
    };
  }

  async listDepartments(req, res, next) {
    try {
      const { search, type, status } = req.query;
      const schoolId = req.user?.school_id;
      const items = await this.departmentService.listDepartments({ search, type, status, schoolId });
      res.json({
        success: true,
        data: items,
      });
    } catch (err) {
      next(err);
    }
  }

  async getDepartment(req, res, next) {
    try {
      const { id } = req.params;
      const item = await this.departmentService.getDepartment(id);
      res.json({
        success: true,
        data: item,
      });
    } catch (err) {
      next(err);
    }
  }

  async createDepartment(req, res, next) {
    try {
      const payload = {
        ...req.body,
        schoolId: req.user?.school_id,
      };
      const userContext = this.getUserContext(req);
      const created = await this.departmentService.createDepartment(payload, userContext);
      res.status(201).json({
        success: true,
        message: 'Department created successfully',
        data: created,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateDepartment(req, res, next) {
    try {
      const { id } = req.params;
      const userContext = this.getUserContext(req);
      const updated = await this.departmentService.updateDepartment(id, req.body, userContext);
      res.json({
        success: true,
        message: 'Department updated successfully',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteDepartment(req, res, next) {
    try {
      const { id } = req.params;
      const userContext = this.getUserContext(req);
      await this.departmentService.deleteDepartment(id, userContext);
      res.json({
        success: true,
        message: 'Department deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  async getHodCandidates(req, res, next) {
    try {
      const schoolId = req.user?.school_id;
      const candidates = await this.departmentService.getHodCandidates(schoolId);
      res.json({
        success: true,
        data: candidates,
      });
    } catch (err) {
      next(err);
    }
  }

  async assignTeacher(req, res, next) {
    try {
      const { teacherId, departmentId } = req.body;
      if (!teacherId) {
        return res.status(400).json({ success: false, message: 'teacherId is required' });
      }
      const result = await this.departmentService.assignTeacher(teacherId, departmentId || null);
      res.json({
        success: true,
        message: 'Teacher department assignment updated',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = DepartmentController;
