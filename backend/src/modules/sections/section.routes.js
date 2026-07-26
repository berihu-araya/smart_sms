const express = require('express');
const {
  listSections,
  getSectionById,
  createSection,
  updateSection,
  deleteSection,
} = require('./section.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

const router = express.Router();

router.use(authMiddleware);
router.get('/', listSections);
router.post('/', createSection);
router.get('/:id', getSectionById);
router.put('/:id', updateSection);
router.delete('/:id', deleteSection);

module.exports = router;

