class SubjectGroupNotFoundError extends Error {
  constructor(message = 'Subject group not found') {
    super(message);
    this.name = 'SubjectGroupNotFoundError';
    this.status = 404;
  }
}


class SubjectGroupConflictError extends Error {
  constructor(message = 'Subject group conflict') {
    super(message);
    this.name = 'SubjectGroupConflictError';
    this.status = 409;
  }
}


class SubjectNotFoundError extends Error {
  constructor(message = 'Subject not found') {
    super(message);
    this.name = 'SubjectNotFoundError';
    this.status = 404;
  }
}



class GroupService {

  constructor(repository) {
    this.repository = repository;
  }



  async listGroups({
    search = '',
    limit = 20,
    offset = 0,
  } = {}) {


    const groups =
      await this.repository.findAll({
        search,
        limit,
        offset,
      });


    return {
      page: Math.floor(offset / limit) + 1,
      limit,
      items: groups,
    };
  }





  async getGroupById(id) {

    const group =
      await this.repository.findById(id);


    if (!group) {
      throw new SubjectGroupNotFoundError();
    }


    return group;
  }





  async createGroup(payload) {

    const group =
      await this.repository.create(payload);


    if (!group) {

      throw new SubjectGroupConflictError(
        'Unable to create subject group'
      );

    }


    return group;
  }





  async updateGroup(id, payload) {


    const existing =
      await this.repository.findById(id);


    if (!existing) {

      throw new SubjectGroupNotFoundError();

    }



    const updated =
      await this.repository.update(
        id,
        payload
      );


    return updated;
  }





  async deleteGroup(id) {


    const existing =
      await this.repository.findById(id);


    if (!existing) {

      throw new SubjectGroupNotFoundError();

    }



    const deleted =
      await this.repository.softDelete(id);


    return deleted;
  }





  async assignSubject(
    groupId,
    subjectId
  ) {


    // Check group exists

    const group =
      await this.repository.findById(
        groupId
      );


    if (!group) {

      throw new SubjectGroupNotFoundError();

    }



    // Check subject exists

    const subject =
      await this.repository.subjectExists(
        subjectId
      );


    if (!subject) {

      throw new SubjectNotFoundError();

    }




    // Prevent duplicate assignment

    const existingAssignment =
      await this.repository.findSubjectAssignment(
        groupId,
        subjectId
      );



    if (existingAssignment) {

      throw new SubjectGroupConflictError(
        'Subject already assigned to this group'
      );

    }





    return await this.repository.assignSubject(
      groupId,
      subjectId
    );

  }






  async removeSubject(
    groupId,
    subjectId
  ) {


    const group =
      await this.repository.findById(
        groupId
      );


    if (!group) {

      throw new SubjectGroupNotFoundError();

    }



    const removed =
      await this.repository.removeSubject(
        groupId,
        subjectId
      );



    if (!removed) {

      throw new SubjectGroupConflictError(
        'Subject is not assigned to this group'
      );

    }



    return removed;

  }







  async listGroupSubjects(groupId) {


    const group =
      await this.repository.findById(
        groupId
      );


    if (!group) {

      throw new SubjectGroupNotFoundError();

    }



    return await this.repository.findSubjects(
      groupId
    );

  }


}



module.exports = {
  GroupService,
  SubjectGroupNotFoundError,
  SubjectGroupConflictError,
  SubjectNotFoundError,
};