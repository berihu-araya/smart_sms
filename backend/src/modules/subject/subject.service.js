class SubjectNotFoundError extends Error {
  constructor(message = 'Subject not found') {
    super(message);

    this.name = 'SubjectNotFoundError';
    this.status = 404;
  }
}


class SubjectConflictError extends Error {
  constructor(message = 'Subject already exists') {
    super(message);

    this.name = 'SubjectConflictError';
    this.status = 409;
  }
}


class SubjectService {
  constructor(repository) {
    this.repository = repository;
  }


  async listSubjects({
    search = '',
    limit = 20,
    offset = 0,
  } = {}) {

    const result =
      await this.repository.findAll({
        search,
        limit,
        offset,
      });


    return {
      page: Math.floor(offset / limit) + 1,

      limit,

      total: result.total,

      totalPages:
        Math.ceil(result.total / limit),

      items: result.items,
    };
  }



  async getSubjectById(id) {

    const subject =
      await this.repository.findById(id);


    if (!subject) {
      throw new SubjectNotFoundError();
    }


    return subject;
  }





  async createSubject(payload) {


    const existingCode =
      await this.repository.findByCode(
        payload.subject_code
      );


    if (existingCode) {

      throw new SubjectConflictError(
        'Subject code already exists'
      );

    }



    const existingName =
      await this.repository.findByName(
        payload.subject_name
      );


    if (existingName) {

      throw new SubjectConflictError(
        'Subject name already exists'
      );

    }



    const subject =
      await this.repository.create(payload);



    if (!subject) {

      throw new SubjectConflictError(
        'Unable to create subject'
      );

    }


    return subject;
  }





  async updateSubject(id, payload) {


    const existing =
      await this.repository.findById(id);



    if (!existing) {

      throw new SubjectNotFoundError();

    }





    if (payload.subject_code) {


      const subjectWithCode =
        await this.repository.findByCode(
          payload.subject_code
        );


      if (
        subjectWithCode &&
        subjectWithCode.id !== id
      ) {

        throw new SubjectConflictError(
          'Subject code already exists'
        );

      }

    }





    if (payload.subject_name) {


      const subjectWithName =
        await this.repository.findByName(
          payload.subject_name
        );


      if (
        subjectWithName &&
        subjectWithName.id !== id
      ) {

        throw new SubjectConflictError(
          'Subject name already exists'
        );

      }

    }





    const updatedSubject =
      await this.repository.update(
        id,
        payload
      );


    return updatedSubject;
  }







  async deleteSubject(id) {


    const existing =
      await this.repository.findById(id);



    if (!existing) {

      throw new SubjectNotFoundError();

    }





    const deletedSubject =
      await this.repository.softDelete(id);



    return deletedSubject;
  }

}



module.exports = {
  SubjectService,
  SubjectNotFoundError,
  SubjectConflictError,
};