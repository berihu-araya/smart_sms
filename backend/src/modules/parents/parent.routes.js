const express = require('express');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeRoles = require('../../middlewares/role.middleware');
const {
  listParents,
  getParentById,
  createParent,
  updateParent,
  deleteParent,
  getParentStudents,
} = require('./parent.controller');

const router = express.Router();

router.use(authMiddleware);

router.get('/', authorizeRoles('School Admin', 'Admin', 'Staff', 'Teacher'), listParents);
router.get('/:id', authorizeRoles('School Admin', 'Admin', 'Staff', 'Teacher', 'Parent'), getParentById);
router.get('/:id/students', authorizeRoles('School Admin', 'Admin', 'Staff', 'Teacher', 'Parent'), getParentStudents);
router.post('/', authorizeRoles('School Admin', 'Admin', 'Staff'), createParent);
router.put('/:id', authorizeRoles('School Admin', 'Admin', 'Staff', 'Parent'), updateParent);
router.delete('/:id', authorizeRoles('School Admin', 'Admin'), deleteParent);

module.exports = router;
