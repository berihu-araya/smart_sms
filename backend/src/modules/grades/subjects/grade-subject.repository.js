class GradeSubjectRepository {

  constructor(database) {
    this.database = database;
  }



  async findAll({
    grade_id,
    academic_year_id,
    search = '',
    limit = 20,
    offset = 0,
  } = {}) {


    const searchPattern =
      `%${search.trim()}%`;



    const values = [
      searchPattern,
      limit,
      offset,
    ];


    let conditions = [
      `
      gs.deleted_at IS NULL
      `
    ];



    if (grade_id) {

      values.push(grade_id);

      conditions.push(
        `gs.grade_id = $${values.length}`
      );

    }



    if (academic_year_id) {

      values.push(academic_year_id);

      conditions.push(
        `gs.academic_year_id = $${values.length}`
      );

    }



    const result =
      await this.database.query(
        `
        SELECT

          gs.id,

          gs.grade_id,

          g.name AS grade_name,


          gs.subject_id,

          s.subject_name,

          s.subject_code,


          gs.academic_year_id,

          ay.name AS academic_year_name,


          gs.is_compulsory,

          gs.weekly_periods,

          gs.total_marks,

          gs.pass_marks,

          gs.display_order,

          gs.status,


          gs.created_at,

          gs.updated_at


        FROM grade_subjects gs


        INNER JOIN grades g

        ON g.id = gs.grade_id



        INNER JOIN subjects s

        ON s.id = gs.subject_id



        INNER JOIN academic_years ay

        ON ay.id = gs.academic_year_id



        WHERE

        ${conditions.join(' AND ')}


        AND (

          LOWER(s.subject_name)
          LIKE LOWER($1)

        )


        ORDER BY

        gs.display_order ASC,

        s.subject_name ASC


        LIMIT $2

        OFFSET $3

        `,
        values
      );



    return result.rows;

  }







  async findById(id) {


    const result =
      await this.database.query(
        `
        SELECT

          gs.*,


          g.name AS grade_name,

          s.subject_name,

          ay.name AS academic_year_name



        FROM grade_subjects gs


        INNER JOIN grades g

        ON g.id = gs.grade_id



        INNER JOIN subjects s

        ON s.id = gs.subject_id



        INNER JOIN academic_years ay

        ON ay.id = gs.academic_year_id



        WHERE

        gs.id = $1


        AND gs.deleted_at IS NULL


        LIMIT 1

        `,
        [id]
      );



    return result.rows[0] || null;

  }








  async create(payload) {


    const result =
      await this.database.query(
        `
        INSERT INTO grade_subjects

        (

          grade_id,

          subject_id,

          academic_year_id,


          is_compulsory,

          weekly_periods,

          total_marks,

          pass_marks,

          display_order

        )


        VALUES

        (

          $1,

          $2,

          $3,


          $4,

          $5,

          $6,

          $7,

          $8

        )


        RETURNING *

        `,
        [

          payload.grade_id,

          payload.subject_id,

          payload.academic_year_id,


          payload.is_compulsory,

          payload.weekly_periods,

          payload.total_marks,

          payload.pass_marks,

          payload.display_order,

        ]
      );



    return result.rows[0];

  }








  async update(id, payload) {


    const fields = [];

    const values = [];

    let index = 1;




    Object.entries(payload)
      .forEach(([key,value]) => {


        if(value !== undefined){


          fields.push(
            `${key} = $${index}`
          );


          values.push(value);


          index++;

        }

      });





    if(fields.length === 0){

      return this.findById(id);

    }






    fields.push(
      `updated_at = CURRENT_TIMESTAMP`
    );



    values.push(id);




    const result =
      await this.database.query(
        `
        UPDATE grade_subjects


        SET

        ${fields.join(', ')}



        WHERE

        id = $${index}


        AND deleted_at IS NULL



        RETURNING *

        `,
        values
      );



    return result.rows[0] || null;

  }









  async softDelete(id){


    const result =
      await this.database.query(
        `
        UPDATE grade_subjects


        SET

        deleted_at =
        CURRENT_TIMESTAMP,


        updated_at =
        CURRENT_TIMESTAMP



        WHERE

        id = $1


        AND deleted_at IS NULL



        RETURNING *

        `,
        [id]
      );



    return result.rows[0] || null;

  }









  async findAssignment(
    grade_id,
    subject_id,
    academic_year_id
  ){


    const result =
      await this.database.query(
        `
        SELECT id

        FROM grade_subjects


        WHERE

        grade_id = $1


        AND subject_id = $2


        AND academic_year_id = $3


        AND deleted_at IS NULL


        LIMIT 1

        `,
        [
          grade_id,
          subject_id,
          academic_year_id,
        ]
      );



    return result.rows[0] || null;

  }









  async gradeExists(id){


    const result =
      await this.database.query(
        `
        SELECT id

        FROM grades


        WHERE id = $1


        AND deleted_at IS NULL


        LIMIT 1

        `,
        [id]
      );



    return result.rows[0] || null;

  }









  async subjectExists(id){


    const result =
      await this.database.query(
        `
        SELECT id

        FROM subjects


        WHERE id = $1


        AND deleted_at IS NULL


        LIMIT 1

        `,
        [id]
      );



    return result.rows[0] || null;

  }








  async academicYearExists(id){


    const result =
      await this.database.query(
        `
        SELECT id

        FROM academic_years


        WHERE id = $1


        AND deleted_at IS NULL


        LIMIT 1

        `,
        [id]
      );



    return result.rows[0] || null;

  }



}



module.exports = GradeSubjectRepository;