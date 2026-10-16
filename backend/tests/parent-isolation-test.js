const { db } = require('../src/config/database');

async function testParentIsolation() {
  console.log('Testing parent notification isolation...');
  const parentUserId = 'b7166a6a-2b4a-4aa4-950f-9dd4c082680e'; // Welu G/het

  const sql = `
    SELECT 
      n.id, 
      n.title, 
      n.type,
      n.audience,
      n.metadata->>'studentId' as notif_student_id,
      s.first_name as child_name
    FROM notifications n
    LEFT JOIN students s ON s.id::text = (n.metadata->>'studentId')
    WHERE n.deleted_at IS NULL
      AND (
        (
          n.recipient_user_id = $1
          OR (n.recipient_user_id IS NULL AND n.audience IN ('ALL', 'PARENTS'))
        )
        AND (
          n.metadata->>'studentId' IS NULL
          OR EXISTS (
            SELECT 1 FROM parents p
            JOIN students s2 ON s2.parent_id = p.id AND s2.deleted_at IS NULL
            WHERE p.user_id = $1 AND p.deleted_at IS NULL
              AND s2.id::text = (n.metadata->>'studentId')
          )
        )
      )
    ORDER BY n.created_at DESC
  `;

  const result = await db.query(sql, [parentUserId]);
  console.log(`Parent saw ${result.rows.length} notifications:`);
  console.table(result.rows);

  const childRes = await db.query(
    `SELECT s.id FROM students s JOIN parents p ON p.id = s.parent_id WHERE p.user_id = $1`,
    [parentUserId]
  );
  const allowedStudentIds = new Set(childRes.rows.map((r) => r.id));

  const leakedNotification = result.rows.find(
    (r) => r.notif_student_id && !allowedStudentIds.has(r.notif_student_id)
  );

  if (leakedNotification) {
    console.error('❌ FAILURE: Parent can see other students notifications!', leakedNotification);
    process.exit(1);
  } else {
    console.log('✅ SUCCESS: Parent ONLY sees their own children notifications and general broadcasts!');
    process.exit(0);
  }
}

testParentIsolation().catch((err) => {
  console.error(err);
  process.exit(1);
});
