class GradeSubjectNotFoundError extends Error {

  constructor(
    message = 'Grade subject not found'
  ){

    super(message);

    this.name =
      'GradeSubjectNotFoundError';

    this.status = 404;

  }

}





class GradeSubjectConflictError extends Error {

  constructor(
    message = 'Grade subject already exists'
  ){

    super(message);

    this.name =
      'GradeSubjectConflictError';

    this.status = 409;

  }

}







class GradeSubjectValidationError extends Error {

  constructor(
    message = 'Invalid grade subject data'
  ){

    super(message);

    this.name =
      'GradeSubjectValidationError';

    this.status = 400;

  }

}









class GradeSubjectService {


  constructor(repository){

    this.repository = repository;

  }









  async listGradeSubjects({
    grade_id,
    academic_year_id,
    search = '',
    limit = 20,
    offset = 0,

  } = {}){


    const items =
      await this.repository.findAll({

        grade_id,

        academic_year_id,

        search,

        limit,

        offset,

      });



    return {

      page:
        Math.floor(offset / limit) + 1,


      limit,


      items,

    };


  }









  async getGradeSubjectById(id){


    const item =
      await this.repository.findById(id);



    if(!item){

      throw new GradeSubjectNotFoundError();

    }



    return item;


  }









  async createGradeSubject(payload){



    const grade =
      await this.repository.gradeExists(
        payload.grade_id
      );



    if(!grade){

      throw new GradeSubjectValidationError(
        'Grade does not exist'
      );

    }







    const subject =
      await this.repository.subjectExists(
        payload.subject_id
      );



    if(!subject){


      throw new GradeSubjectValidationError(
        'Subject does not exist'
      );


    }








    const academicYear =
      await this.repository.academicYearExists(
        payload.academic_year_id
      );



    if(!academicYear){


      throw new GradeSubjectValidationError(
        'Academic year does not exist'
      );


    }










    const existing =
      await this.repository.findAssignment(
        payload.grade_id,
        payload.subject_id,
        payload.academic_year_id
      );



    if(existing){


      throw new GradeSubjectConflictError(
        'Subject already assigned to this grade for this academic year'
      );


    }









    return await this.repository.create(payload);



  }









  async updateGradeSubject(
    id,
    payload
  ){



    const existing =
      await this.repository.findById(id);



    if(!existing){


      throw new GradeSubjectNotFoundError();


    }






    return await this.repository.update(
      id,
      payload
    );



  }









  async deleteGradeSubject(id){



    const existing =
      await this.repository.findById(id);



    if(!existing){


      throw new GradeSubjectNotFoundError();


    }






    return await this.repository.softDelete(id);



  }





}







module.exports = {


  GradeSubjectService,


  GradeSubjectNotFoundError,


  GradeSubjectConflictError,


  GradeSubjectValidationError,


};