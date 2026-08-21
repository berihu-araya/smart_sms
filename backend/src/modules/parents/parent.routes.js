const express = require('express');
const authMiddleware = require('../../middlewares/auth.middleware');
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

router.get('/', listParents);
router.get('/:id', getParentById);
router.get('/:id/students', getParentStudents);
router.post('/', createParent);
router.put('/:id', updateParent);
router.delete('/:id', deleteParent);

module.exports = router;
