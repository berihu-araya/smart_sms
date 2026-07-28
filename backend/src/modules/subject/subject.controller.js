const SubjectRepository = require('./subject.repository');
const {
  SubjectService,
} = require('./subject.service');

const {
  validateCreateSubjectInput,
  validateUpdateSubjectInput,
  validateSubjectId,
} = require('./subject.validation');

const { db } = require('../../config/database');


const subjectService =
  new SubjectService(
    new SubjectRepository(db)
  );





async function listSubjects(req, res, next) {

  try {

    const data =
      await subjectService.listSubjects({

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
        'Subjects loaded successfully.',

      data,

    });



  } catch (error) {

    return next(error);

  }

}








async function getSubjectById(req, res, next) {


  const {
    id,
    errors,
  } =
    validateSubjectId(
      req.params.id
    );



  if (
    Object.keys(errors).length > 0
  ) {

    return res.status(400).json({

      success: false,

      message:
        'Validation failed',

      data: errors,

    });

  }





  try {


    const data =
      await subjectService.getSubjectById(
        id
      );



    return res.status(200).json({

      success: true,

      message:
        'Subject loaded successfully.',

      data,

    });



  } catch(error) {

    return next(error);

  }

}









async function createSubject(req, res, next) {


  const input =
    validateCreateSubjectInput(
      req.body
    );



  if (
    Object.keys(input.errors).length > 0
  ) {


    return res.status(400).json({

      success: false,

      message:
        'Validation failed',

      data:
        input.errors,

    });


  }






  try {


    const data =
      await subjectService.createSubject(
        input
      );



    return res.status(201).json({

      success: true,

      message:
        'Subject created successfully.',

      data,

    });




  } catch(error) {

    return next(error);

  }

}









async function updateSubject(req, res, next) {


  const {
    id,
    errors: idErrors,
  } =
    validateSubjectId(
      req.params.id
    );



  if (
    Object.keys(idErrors).length > 0
  ) {

    return res.status(400).json({

      success:false,

      message:
        'Validation failed',

      data:idErrors,

    });

  }







  const input =
    validateUpdateSubjectInput(
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
      await subjectService.updateSubject(
        id,
        input
      );



    return res.status(200).json({

      success:true,

      message:
        'Subject updated successfully.',

      data,

    });



  } catch(error) {


    return next(error);


  }

}









async function deleteSubject(req, res, next) {


  const {
    id,
    errors,
  } =
    validateSubjectId(
      req.params.id
    );



  if (
    Object.keys(errors).length > 0
  ) {


    return res.status(400).json({

      success:false,

      message:
        'Validation failed',

      data:errors,

    });


  }







  try {


    const data =
      await subjectService.deleteSubject(
        id
      );



    return res.status(200).json({

      success:true,

      message:
        'Subject deleted successfully.',

      data,

    });



  } catch(error) {


    return next(error);


  }

}







module.exports = {

  listSubjects,

  getSubjectById,

  createSubject,

  updateSubject,

  deleteSubject,

};