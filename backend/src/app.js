const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const dashboardRoutes = require('./routes/dashboard.routes');
const authRoutes = require('./modules/auth/auth.routes');
const studentRoutes = require('./modules/students/student.routes');
const gradeRoutes = require('./modules/grades/grade.routes');
const sectionRoutes = require('./modules/sections/section.routes');
const teacherRoutes = require('./modules/teachers/teacher.routes');
const subjectRoutes = require('./modules/subject/subject.routes');
const groupRoutes = require('./modules/subject/groups/group.routes');

const gradeSubjectRoutes = require('./modules/grades/subjects/grade-subject.routes');
const academicYearRoutes = require('./modules/academic-years/academic-year.routes');

const teacherSubjectRoutes = require('./modules/teachers/subjects/teacher-subject.routes');
const classTeacherRoutes = require('./modules/teachers/class-teacher/class-teacher.routes');
const parentRoutes = require('./modules/parents/parent.routes');

const attendanceRoutes = require('./modules/attendance/attendance.routes');
const examRoutes = require('./modules/exams/exam.routes');
const markRoutes = require('./modules/marks/mark.routes');
const resultRoutes = require('./modules/results/result.routes');
const userRoutes = require('./modules/users/user.routes');
const roleRoutes = require('./modules/roles/role.routes');
const settingRoutes = require('./modules/settings/setting.routes');
const timetableRoutes = require('./modules/timetable/timetable.routes');
const roomRoutes = require('./modules/timetable/rooms/room.routes');
const periodRoutes = require('./modules/timetable/periods/period.routes');
const availabilityRoutes = require('./modules/timetable/availability/availability.routes');
const substitutionRoutes = require('./modules/timetable/substitutions/substitution.routes');

const { db } = require('./config/database');
const AuthorizationService = require('./services/authorization.service');

const app = express();

const authorizationService = new AuthorizationService(db);
app.set('authorizationService', authorizationService);

app.use(cors()); // Enable CORS for all routes
app.use(helmet());// Enable Helmet for security headers
app.use(express.json({ limit: '8mb' }));

app.get("/", (req, res) => {
  res.json({
    message: "School Management API Running",
    version: "1.0.0",
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use('/api', dashboardRoutes);
app.use('/api/v1/auth', authRoutes);

app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/parents', parentRoutes);

app.use('/api/v1/grades/subjects', gradeSubjectRoutes);
app.use('/api/v1/grades', gradeRoutes);

app.use('/api/v1/sections', sectionRoutes);
app.use('/api/v1/teachers/class-teachers', classTeacherRoutes);
app.use('/api/v1/teachers/subjects', teacherSubjectRoutes);
app.use('/api/v1/teachers', teacherRoutes);

app.use('/api/v1/academic-years', academicYearRoutes);

app.use('/api/v1/subjects/groups', groupRoutes);
app.use('/api/v1/subjects', subjectRoutes);

app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/exams', examRoutes);
app.use('/api/v1/marks', markRoutes);
app.use('/api/v1/results', resultRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/roles', roleRoutes);
app.use('/api/v1/settings', settingRoutes);

app.use('/api/v1/timetable/rooms', roomRoutes);
app.use('/api/v1/rooms', roomRoutes);
app.use('/api/v1/timetable/periods', periodRoutes);
app.use('/api/v1/timetable/availability', availabilityRoutes);
app.use('/api/v1/timetable/substitutions', substitutionRoutes);
app.use('/api/v1/timetable', timetableRoutes);



app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message,
    data: err,
  });
});

module.exports = app;