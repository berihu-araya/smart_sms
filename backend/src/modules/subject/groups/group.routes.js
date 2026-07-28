const express = require('express');

const {
  listGroups,
  getGroupById,
  createGroup,
  updateGroup,
  deleteGroup,
  assignSubject,
  listGroupSubjects,
  removeSubject,
} = require('./group.controller');

const authMiddleware = require('../../../middlewares/auth.middleware');


const router = express.Router();


router.use(authMiddleware);


// Groups CRUD

router.get('/', listGroups);

router.post('/', createGroup);

router.get('/:id', getGroupById);

router.put('/:id', updateGroup);

router.delete('/:id', deleteGroup);


// Group subjects

router.post('/:id/subjects', assignSubject);

router.get('/:id/subjects', listGroupSubjects);

router.delete('/:id/subjects/:subjectId', removeSubject);



module.exports = router;