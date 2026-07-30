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

const app = express();

app.use(cors()); // Enable CORS for all routes
app.use(helmet());// Enable Helmet for security headers
app.use(express.json());

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

app.use('/api/v1/grades/subjects',gradeSubjectRoutes);
app.use('/api/v1/grades', gradeRoutes);

app.use('/api/v1/sections', sectionRoutes);
app.use('/api/v1/teachers', teacherRoutes);

app.use('/api/v1/academic-years', academicYearRoutes);

app.use('/api/v1/subjects/groups', groupRoutes);
app.use('/api/v1/subjects', subjectRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  const statusCode = err.status || 500;
  const message =
    statusCode === 401
      ? err.message
      : statusCode >= 400 && statusCode < 500
      ? err.message
      : "Internal server error";
  res.status(statusCode).json({
    success: false,
    message,
    data: null,
  });
});

module.exports = app;