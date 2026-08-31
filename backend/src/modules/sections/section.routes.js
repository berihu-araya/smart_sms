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

const router = express.Router();

router.use(authMiddleware);

router.get('/', listSections);
router.post('/', createSection);
router.get('/:id/references', checkSectionReferences);
router.post('/:id/restore', restoreSection);
router.get('/:id', getSectionById);
router.put('/:id', updateSection);
router.delete('/:id', deleteSection);

module.exports = router;
