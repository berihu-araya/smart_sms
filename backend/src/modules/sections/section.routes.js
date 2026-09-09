const express = require('express');
const {
  listSections,
  getSectionById,
  checkSectionReferences,
  createSection,
  updateSection,
  deleteSection,
  restoreSection,
} = require('./section.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeRoles = require('../../middlewares/role.middleware');
const { attachStudentScope, requireStudentScopeMatch } = require('../../middlewares/student.scope');

const router = express.Router();

router.use(authMiddleware);
router.use(attachStudentScope);

router.get('/', authorizeRoles('School Admin', 'Admin', 'Staff', 'Teacher', 'Student', 'Parent'), listSections);
router.post('/', authorizeRoles('School Admin', 'Admin', 'Staff'), createSection);
router.get('/:id/references', authorizeRoles('School Admin', 'Admin', 'Staff', 'Teacher'), checkSectionReferences);
router.post('/:id/restore', authorizeRoles('School Admin', 'Admin', 'Staff'), restoreSection);
router.get('/:id', authorizeRoles('School Admin', 'Admin', 'Staff', 'Teacher', 'Student', 'Parent'), requireStudentScopeMatch('section_id'), getSectionById);
router.put('/:id', authorizeRoles('School Admin', 'Admin', 'Staff'), updateSection);
router.delete('/:id', authorizeRoles('School Admin', 'Admin'), deleteSection);

module.exports = router;
