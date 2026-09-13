const express = require('express');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeRoles = require('../../middlewares/role.middleware');
const { attachParentScope, requireParentOwnProfile } = require('../../middlewares/parent.scope');
const {
  listParents,
  getParentById,
  getMyProfile,
  getMyChildren,
  createParent,
  updateParent,
  deleteParent,
  getParentStudents,
} = require('./parent.controller');

const router = express.Router();

router.use(authMiddleware);
router.use(attachParentScope);

router.get('/', authorizeRoles('School Admin', 'Admin', 'Staff', 'Teacher'), listParents);
router.get('/me', authorizeRoles('Parent'), getMyProfile);
router.get('/my-children', authorizeRoles('Parent'), getMyChildren);
router.get('/:id', authorizeRoles('School Admin', 'Admin', 'Staff', 'Teacher', 'Parent'), requireParentOwnProfile('id'), getParentById);
router.get('/:id/students', authorizeRoles('School Admin', 'Admin', 'Staff', 'Teacher', 'Parent'), requireParentOwnProfile('id'), getParentStudents);
router.post('/', authorizeRoles('School Admin', 'Admin', 'Staff'), createParent);
router.put('/:id', authorizeRoles('School Admin', 'Admin', 'Staff', 'Parent'), requireParentOwnProfile('id'), updateParent);
router.delete('/:id', authorizeRoles('School Admin', 'Admin'), deleteParent);

module.exports = router;
