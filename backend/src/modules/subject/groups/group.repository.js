class GroupRepository {
  constructor(database) {
    this.database = database;
  }


  async findAll({ search = '', limit = 20, offset = 0 } = {}) {

    const searchPattern = `%${search.trim()}%`;

    const result = await this.database.query(
      `
      SELECT
        sg.id,
        sg.group_name,
        sg.description,
        sg.display_order,
        sg.status,
        sg.created_at,
        sg.updated_at,

        (
          SELECT COUNT(*)::int
          FROM subject_group_members sgm
          WHERE sgm.subject_group_id = sg.id
        ) AS subject_count

      FROM subject_groups sg

      WHERE sg.deleted_at IS NULL

      AND (
        LOWER(sg.group_name)
        LIKE LOWER($1)
      )

      ORDER BY sg.display_order ASC,
               sg.group_name ASC

      LIMIT $2 OFFSET $3
      `,
      [
        searchPattern,
        limit,
        offset,
      ]
    );


    return result.rows;
  }



  async findById(id) {

    const result = await this.database.query(
      `
      SELECT
        sg.id,
        sg.group_name,
        sg.description,
        sg.display_order,
        sg.status,
        sg.created_at,
        sg.updated_at,

        (
          SELECT COUNT(*)::int
          FROM subject_group_members sgm
          WHERE sgm.subject_group_id = sg.id
        ) AS subject_count

      FROM subject_groups sg

      WHERE sg.id = $1

      AND sg.deleted_at IS NULL

      LIMIT 1
      `,
      [id]
    );


    return result.rows[0] || null;
  }



  async create(payload) {

    const result = await this.database.query(
      `
      INSERT INTO subject_groups
      (
        group_name,
        description
      )

      VALUES
      (
        $1,
        $2
      )

      RETURNING *
      `,
      [
        payload.group_name,
        payload.description,
      ]
    );


    return result.rows[0];
  }



  async update(id, payload) {

    const fields = [];
    const values = [];

    let index = 1;


    Object.entries(payload)
      .forEach(([key, value]) => {

        if (value !== undefined) {

          fields.push(
            `${key} = $${index}`
          );

          values.push(value);

          index++;
        }

      });


    if (fields.length === 0) {
      return this.findById(id);
    }


    fields.push(
      `updated_at = CURRENT_TIMESTAMP`
    );


    values.push(id);


    const result = await this.database.query(
      `
      UPDATE subject_groups

      SET ${fields.join(', ')}

      WHERE id = $${index}

      AND deleted_at IS NULL

      RETURNING *
      `,
      values
    );


    return result.rows[0] || null;
  }




  async softDelete(id) {

    const result = await this.database.query(
      `
      UPDATE subject_groups

      SET
        deleted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP

      WHERE id = $1

      AND deleted_at IS NULL

      RETURNING *
      `,
      [id]
    );


    return result.rows[0] || null;
  }





  async findSubjectAssignment(
    groupId,
    subjectId
  ) {

    const result =
      await this.database.query(
        `
        SELECT *

        FROM subject_group_members

        WHERE subject_group_id = $1

        AND subject_id = $2

        LIMIT 1
        `,
        [
          groupId,
          subjectId,
        ]
      );


    return result.rows[0] || null;
  }





  async assignSubject(
    groupId,
    subjectId
  ) {

    const result =
      await this.database.query(
        `
        INSERT INTO subject_group_members
        (
          subject_group_id,
          subject_id
        )

        VALUES
        (
          $1,
          $2
        )

        RETURNING *
        `,
        [
          groupId,
          subjectId,
        ]
      );


    return result.rows[0];
  }





  async removeSubject(
    groupId,
    subjectId
  ) {

    const result =
      await this.database.query(
        `
        DELETE FROM subject_group_members

        WHERE subject_group_id = $1

        AND subject_id = $2

        RETURNING *
        `,
        [
          groupId,
          subjectId,
        ]
      );


    return result.rows[0] || null;
  }





  async findSubjects(groupId) {

    const result =
      await this.database.query(
        `
        SELECT
          s.id,
          s.subject_code,
          s.subject_name,
          s.description,
          s.status

        FROM subjects s

        INNER JOIN subject_group_members sgm

        ON sgm.subject_id = s.id

        WHERE sgm.subject_group_id = $1

        AND s.deleted_at IS NULL

        ORDER BY s.subject_name ASC
        `,
        [groupId]
      );


    return result.rows;
  }





  async subjectExists(subjectId) {

    const result =
      await this.database.query(
        `
        SELECT id

        FROM subjects

        WHERE id = $1

        AND deleted_at IS NULL

        LIMIT 1
        `,
        [subjectId]
      );


    return result.rows[0] || null;
  }


}


module.exports = GroupRepository;