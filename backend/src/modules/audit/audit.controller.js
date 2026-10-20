class AuditController {
  constructor(auditService) {
    this.auditService = auditService;
  }

  async listAuditLogs(req, res, next) {
    try {
      const {
        page = 1,
        limit = 50,
        search,
        userId,
        action,
        resourceType,
        startDate,
        endDate,
      } = req.query;

      const schoolId = req.user?.school_id;

      const result = await this.auditService.query({
        schoolId,
        userId,
        action,
        resourceType,
        search,
        startDate,
        endDate,
        page,
        limit,
      });

      res.json({
        success: true,
        data: result.items,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }

  async getAuditLog(req, res, next) {
    try {
      const { id } = req.params;
      const log = await this.auditService.findById(id);
      if (!log) {
        return res.status(404).json({ success: false, message: 'Audit record not found' });
      }
      res.json({
        success: true,
        data: log,
      });
    } catch (err) {
      next(err);
    }
  }

  async exportAuditLogs(req, res, next) {
    try {
      const { search, userId, action, resourceType, startDate, endDate } = req.query;
      const schoolId = req.user?.school_id;

      const result = await this.auditService.query({
        schoolId,
        userId,
        action,
        resourceType,
        search,
        startDate,
        endDate,
        page: 1,
        limit: 5000,
      });

      // Format as CSV
      const rows = result.items || [];
      const headers = ['Timestamp', 'Action', 'Resource Type', 'Resource ID', 'User Name', 'User Email', 'Role', 'IP Address', 'Status'];
      const csvLines = [headers.join(',')];

      rows.forEach((r) => {
        const line = [
          `"${new Date(r.created_at).toISOString()}"`,
          `"${r.action || ''}"`,
          `"${r.resource_type || ''}"`,
          `"${r.resource_id || ''}"`,
          `"${(r.user_name || '').replace(/"/g, '""')}"`,
          `"${r.user_email || ''}"`,
          `"${r.user_role || ''}"`,
          `"${r.ip_address || ''}"`,
          `"${r.status || 'SUCCESS'}"`,
        ];
        csvLines.push(line.join(','));
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="smart_sms_audit_logs_${Date.now()}.csv"`);
      return res.status(200).send(csvLines.join('\n'));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AuditController;
