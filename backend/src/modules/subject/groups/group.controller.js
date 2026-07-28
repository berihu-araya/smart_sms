const GroupRepository = require('./group.repository');
const { GroupService } = require('./group.service');

const {
  validateCreateGroupInput,
  validateUpdateGroupInput,
  validateGroupId,
  validateAssignSubjectInput,
} = require('./group.validation');

const { db } = require('../../../config/database');


const groupService =
  new GroupService(
    new GroupRepository(db)
  );



// GET /subjects/groups

async function listGroups(req, res, next) {

  try {

    const data =
      await groupService.listGroups({

        search:
          req.query.search || '',

        limit:
          Number(req.query.limit || 20),

        offset:
          Number(req.query.offset || 0),

      });



    return res.status(200).json({

      success: true,

      message:
        'Subject groups loaded successfully.',

      data,

    });


  } catch(error) {

    return next(error);

  }

}




// GET /subjects/groups/:id

async function getGroupById(req, res, next) {


  const {
    id,
    errors,
  } = validateGroupId(
    req.params.id
  );



  if (Object.keys(errors).length > 0) {

    return res.status(400).json({

      success: false,

      message:
        'Validation failed',

      data: errors,

    });

  }



  try {


    const data =
      await groupService.getGroupById(id);



    return res.status(200).json({

      success: true,

      message:
        'Subject group loaded successfully.',

      data,

    });



  } catch(error) {

    return next(error);

  }

}






// POST /subjects/groups

async function createGroup(req, res, next) {


  const input =
    validateCreateGroupInput(
      req.body
    );



  if (
    Object.keys(input.errors).length > 0
  ) {


    return res.status(400).json({

      success:false,

      message:
        'Validation failed',

      data:
        input.errors,

    });

  }



  try {


    const data =
      await groupService.createGroup(
        input
      );



    return res.status(201).json({

      success:true,

      message:
        'Subject group created successfully.',

      data,

    });



  } catch(error) {

    return next(error);

  }

}







// PUT /subjects/groups/:id

async function updateGroup(req,res,next){


  const {
    id,
    errors,
  } =
    validateGroupId(
      req.params.id
    );



  if(Object.keys(errors).length > 0){

    return res.status(400).json({

      success:false,

      message:
        'Validation failed',

      data:errors,

    });

  }



  const input =
    validateUpdateGroupInput(
      req.body
    );



  if(Object.keys(input.errors).length > 0){


    return res.status(400).json({

      success:false,

      message:
        'Validation failed',

      data:
        input.errors,

    });

  }





  try {


    const data =
      await groupService.updateGroup(
        id,
        input
      );



    return res.status(200).json({

      success:true,

      message:
        'Subject group updated successfully.',

      data,

    });



  } catch(error){

    return next(error);

  }

}







// DELETE /subjects/groups/:id

async function deleteGroup(req,res,next){


  const {
    id,
    errors,
  } =
    validateGroupId(
      req.params.id
    );



  if(Object.keys(errors).length > 0){


    return res.status(400).json({

      success:false,

      message:
        'Validation failed',

      data:errors,

    });

  }




  try {


    const data =
      await groupService.deleteGroup(
        id
      );



    return res.status(200).json({

      success:true,

      message:
        'Subject group deleted successfully.',

      data,

    });



  } catch(error){

    return next(error);

  }

}







// POST /subjects/groups/:id/subjects

async function assignSubject(req,res,next){


  const {
    id,
    errors,
  } =
    validateGroupId(
      req.params.id
    );



  if(Object.keys(errors).length > 0){

    return res.status(400).json({

      success:false,

      message:
        'Validation failed',

      data:errors,

    });

  }





  const input =
    validateAssignSubjectInput(
      req.body
    );



  if(Object.keys(input.errors).length > 0){

    return res.status(400).json({

      success:false,

      message:
        'Validation failed',

      data:
        input.errors,

    });

  }





  try {


    const data =
      await groupService.assignSubject(
        id,
        input.subject_id
      );



    return res.status(201).json({

      success:true,

      message:
        'Subject assigned successfully.',

      data,

    });



  }catch(error){

    return next(error);

  }

}







// GET /subjects/groups/:id/subjects

async function listGroupSubjects(req,res,next){


  const {
    id,
    errors,
  } =
    validateGroupId(
      req.params.id
    );



  if(Object.keys(errors).length > 0){

    return res.status(400).json({

      success:false,

      message:
        'Validation failed',

      data:errors,

    });

  }



  try {


    const data =
      await groupService.listGroupSubjects(
        id
      );



    return res.status(200).json({

      success:true,

      message:
        'Group subjects loaded successfully.',

      data,

    });



  }catch(error){

    return next(error);

  }

}








// DELETE /subjects/groups/:id/subjects/:subjectId

async function removeSubject(req,res,next){


  const {
    id,
    errors,
  } =
    validateGroupId(
      req.params.id
    );



  if(Object.keys(errors).length > 0){

    return res.status(400).json({

      success:false,

      message:
        'Validation failed',

      data:errors,

    });

  }



  const subjectId =
    req.params.subjectId;



  try {


    const data =
      await groupService.removeSubject(
        id,
        subjectId
      );



    return res.status(200).json({

      success:true,

      message:
        'Subject removed from group successfully.',

      data,

    });



  }catch(error){

    return next(error);

  }

}




module.exports = {

  listGroups,

  getGroupById,

  createGroup,

  updateGroup,

  deleteGroup,

  assignSubject,

  listGroupSubjects,

  removeSubject,

};