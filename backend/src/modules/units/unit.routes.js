const express = require('express');
const {
  listUnits,
  getUnitById,
  createUnit,
  updateUnit,
  deleteUnit,
  assignClassToUnit,
  getUnitClasses,
  removeClassFromUnit,
} = require('./unit.controller');

const router = express.Router();

router.get('/', listUnits);
router.post('/', createUnit);
router.get('/:id', getUnitById);
router.put('/:id', updateUnit);
router.delete('/:id', deleteUnit);
router.post('/assign-class', assignClassToUnit);
router.get('/:id/classes', getUnitClasses);
router.delete('/:id/classes/:assignmentId', removeClassFromUnit);

module.exports = router;
