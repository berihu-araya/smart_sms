function validateUuid(value) {

  return (
    typeof value === 'string' &&
    value.trim().length > 0
  );

}



function validateCreateGradeSubjectInput(input = {}) {

  const grade_id =
    input.grade_id?.trim();

  const subject_id =
    input.subject_id?.trim();

  const academic_year_id =
    input.academic_year_id?.trim();


  const errors = {};



  if (!validateUuid(grade_id)) {
    errors.grade_id =
      'Grade id is required';
  }



  if (!validateUuid(subject_id)) {
    errors.subject_id =
      'Subject id is required';
  }



  if (!validateUuid(academic_year_id)) {
    errors.academic_year_id =
      'Academic year id is required';
  }




  if (
    input.weekly_periods !== undefined &&
    input.weekly_periods < 0
  ) {

    errors.weekly_periods =
      'Weekly periods cannot be negative';

  }



  if (
    input.total_marks !== undefined &&
    input.total_marks < 0
  ) {

    errors.total_marks =
      'Total marks cannot be negative';

  }



  if (
    input.pass_marks !== undefined &&
    input.pass_marks < 0
  ) {

    errors.pass_marks =
      'Pass marks cannot be negative';

  }



  if (
    input.pass_marks !== undefined &&
    input.total_marks !== undefined &&
    input.pass_marks > input.total_marks
  ) {

    errors.pass_marks =
      'Pass marks cannot exceed total marks';

  }



  return {

    grade_id,

    subject_id,

    academic_year_id,


    is_compulsory:
      input.is_compulsory ?? true,


    weekly_periods:
      input.weekly_periods ?? null,


    total_marks:
      input.total_marks ?? null,


    pass_marks:
      input.pass_marks ?? null,


    display_order:
      input.display_order ?? 0,


    errors,

  };

}





function validateUpdateGradeSubjectInput(input = {}) {


  const errors = {};


  const payload = {};



  if(input.is_compulsory !== undefined){

    payload.is_compulsory =
      input.is_compulsory;

  }



  if(input.weekly_periods !== undefined){

    if(input.weekly_periods < 0){

      errors.weekly_periods =
        'Weekly periods cannot be negative';

    }

    payload.weekly_periods =
      input.weekly_periods;

  }




  if(input.total_marks !== undefined){

    if(input.total_marks < 0){

      errors.total_marks =
        'Total marks cannot be negative';

    }

    payload.total_marks =
      input.total_marks;

  }




  if(input.pass_marks !== undefined){

    if(input.pass_marks < 0){

      errors.pass_marks =
        'Pass marks cannot be negative';

    }


    payload.pass_marks =
      input.pass_marks;

  }



  if(
    payload.pass_marks !== undefined &&
    payload.total_marks !== undefined &&
    payload.pass_marks > payload.total_marks
  ){

    errors.pass_marks =
      'Pass marks cannot exceed total marks';

  }



  if(input.display_order !== undefined){

    payload.display_order =
      input.display_order;

  }



  return {
    payload,
    errors,
  };

}



function validateGradeSubjectId(id){

  const errors = {};


  if(
    !id ||
    typeof id !== 'string' ||
    !id.trim()
  ){

    errors.id =
      'Grade subject id is required';

  }


  return {
    id:id?.trim(),
    errors,
  };

}



module.exports = {

  validateCreateGradeSubjectInput,

  validateUpdateGradeSubjectInput,

  validateGradeSubjectId,

};

