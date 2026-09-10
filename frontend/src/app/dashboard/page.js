"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  HiAcademicCap,
  HiArrowPath,
  HiArrowTrendingUp,
  HiBookOpen,
  HiCalendarDays,
  HiChartBarSquare,
  HiCheckCircle,
  HiClipboardDocumentList,
  HiClock,
  HiExclamationTriangle,
  HiIdentification,
  HiOutlineArrowUpRight,
  HiOutlineUserGroup,
  HiPresentationChartLine,
  HiUserGroup,
} from "react-icons/hi2";

import { useAuth } from "@/hooks/useAuth";
import { request } from "@/services/apiClient";
import styles from "./page.module.css";

const emptyData = {
  stats: {},
  attendance: { trend: [] },
  performance: { distribution: [] },
  enrollmentTrend: [],
  sectionOverview: [],
  recentActivity: [],
};

function number(value) {
  return Number(value || 0).toLocaleString();
}

function percent(value) {
  return `${Number(value || 0).toFixed(1).replace(".0", "")}%`;
}

function Metric({ icon: Icon, label, value, detail, tone }) {
  return (
    <article className={`${styles.metric} ${styles[`metric${tone}`]}`}>
      <div className={styles.metricIcon}><Icon aria-hidden="true" /></div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <span>{detail}</span>
      </div>
    </article>
  );
}

function PanelHeader({ eyebrow, title, action }) {
  return (
    <div className={styles.panelHeader}>
      <div>
        <span className={styles.panelEyebrow}>{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}

function AttendancePanel({ attendance }) {
  const total = (attendance.present || 0) + (attendance.absent || 0) + (attendance.late || 0) + (attendance.excused || 0);
  const presentWidth = total ? (attendance.present / total) * 100 : 0;
  const lateWidth = total ? (attendance.late / total) * 100 : 0;
  const absentWidth = total ? (attendance.absent / total) * 100 : 0;

  return (
    <section className={`${styles.panel} ${styles.attendancePanel}`}>
      <PanelHeader
        eyebrow="Student wellbeing"
        title="Attendance pulse"
        action={<Link href="/dashboard/reports/attendance" className={styles.textLink}>Open report <HiOutlineArrowUpRight /></Link>}
      />
      <div className={styles.attendanceBody}>
        <div className={styles.attendanceScore}>
          <div className={styles.scoreRing} style={{ "--attendance": `${attendance.rate || 0}%` }}>
            <div><strong>{percent(attendance.rate)}</strong><span>on time & present</span></div>
          </div>
          <div className={styles.attendanceLegend}>
            <span><i className={styles.dotPresent} />Present <b>{number(attendance.present)}</b></span>
            <span><i className={styles.dotLate} />Late <b>{number(attendance.late)}</b></span>
            <span><i className={styles.dotAbsent} />Absent <b>{number(attendance.absent)}</b></span>
          </div>
        </div>
        <div className={styles.trendChart}>
          <div className={styles.chartCaption}><span>Last 5 weeks</span><b>Presence trend</b></div>
          <div className={styles.chartBars}>
            {(attendance.trend || []).map((point) => (
              <div className={styles.chartBarItem} key={point.label}>
                <div className={styles.chartBarTrack}><span style={{ height: `${Math.max(Number(point.rate || 0), 4)}%` }} /></div>
                <small>{point.label}</small>
              </div>
            ))}
            {!attendance.trend?.length && <p className={styles.emptyChart}>Attendance history will appear here once records are captured.</p>}
          </div>
        </div>
      </div>
      <div className={styles.stackedBar} aria-label="Attendance status distribution">
        <span className={styles.stackPresent} style={{ width: `${presentWidth}%` }} />
        <span className={styles.stackLate} style={{ width: `${lateWidth}%` }} />
        <span className={styles.stackAbsent} style={{ width: `${absentWidth}%` }} />
      </div>
    </section>
  );
}

function PerformancePanel({ performance }) {
  const distribution = performance.distribution || [];
  const maxCount = Math.max(...distribution.map((item) => Number(item.count || 0)), 1);

  return (
    <section className={styles.panel}>
      <PanelHeader
        eyebrow="Academic outcomes"
        title="Performance mix"
        action={<Link href="/dashboard/reports/academic" className={styles.iconLink} aria-label="Open academic report" title="Open academic report"><HiOutlineArrowUpRight /></Link>}
      />
      <div className={styles.performanceSummary}>
        <div><strong>{percent(performance.averageScore)}</strong><span>average score</span></div>
        <div className={styles.passRate}><HiCheckCircle /><strong>{percent(performance.passRate)}</strong><span>passing</span></div>
      </div>
      <div className={styles.distribution}>
        {distribution.map((item, index) => (
          <div className={styles.distributionRow} key={item.label}>
            <div><span>{item.label}</span><b>{number(item.count)}</b></div>
            <div className={styles.distributionTrack}><span className={styles[`distributionColor${index}`]} style={{ width: `${(Number(item.count || 0) / maxCount) * 100}%` }} /></div>
          </div>
        ))}
        {!distribution.length && <p className={styles.emptyState}>Publish marks to see the academic distribution.</p>}
      </div>
    </section>
  );
}

function EnrollmentPanel({ trend }) {
  const maxCount = Math.max(...(trend || []).map((item) => Number(item.count || 0)), 1);
  return (
    <section className={styles.panel}>
      <PanelHeader
        eyebrow="Admissions"
        title="Enrollment momentum"
        action={<Link href="/dashboard/students" className={styles.textLink}>Student register <HiOutlineArrowUpRight /></Link>}
      />
      <div className={styles.enrollmentChart}>
        {(trend || []).map((item) => (
          <div className={styles.enrollmentBarItem} key={item.label}>
            <strong>{number(item.count)}</strong>
            <div className={styles.enrollmentBarTrack}><span style={{ height: `${Math.max((Number(item.count || 0) / maxCount) * 100, 5)}%` }} /></div>
            <small>{item.label}</small>
          </div>
        ))}
        {!trend?.length && <p className={styles.emptyChart}>New admissions will form a six-month trend here.</p>}
      </div>
    </section>
  );
}

function SectionPanel({ sections }) {
  return (
    <section className={styles.panel}>
      <PanelHeader
        eyebrow="School structure"
        title="Busiest sections"
        action={<Link href="/dashboard/sections" className={styles.textLink}>Manage sections <HiOutlineArrowUpRight /></Link>}
      />
      <div className={styles.sectionList}>
        {(sections || []).map((section, index) => (
          <div className={styles.sectionRow} key={section.id || section.name}>
            <span className={styles.sectionRank}>0{index + 1}</span>
            <div className={styles.sectionName}><b>{section.name}</b><span>{number(section.students)} enrolled</span></div>
            <div className={styles.sectionMeter}><span style={{ width: `${Math.min(Number(section.students || 0) * 2, 100)}%` }} /></div>
          </div>
        ))}
        {!sections?.length && <p className={styles.emptyState}>Create sections to see enrollment concentration.</p>}
      </div>
    </section>
  );
}

function ActivityPanel({ activities }) {
  return (
    <section className={styles.panel}>
      <PanelHeader eyebrow="Live feed" title="Recent activity" action={<HiClock className={styles.panelIcon} />} />
      <div className={styles.activityList}>
        {(activities || []).slice(0, 5).map((activity) => (
          <div className={styles.activityRow} key={activity.id}>
            <span className={styles.activityIcon}><HiArrowTrendingUp /></span>
            <div><b>{activity.title}</b><p>{activity.description}</p></div>
            <time>{new Date(activity.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</time>
          </div>
        ))}
        {!activities?.length && <p className={styles.emptyState}>New records and assessments will appear in this feed.</p>}
      </div>
    </section>
  );
}

function StudentDashboardView({ data, refreshing, onRefresh, currentTime }) {
  const student = data?.student || {};
  const stats = data?.stats || {};
  const attendance = data?.attendance || {};
  const subjects = data?.subjects || [];
  const todaySchedule = data?.todaySchedule || [];
  const assignments = data?.assignments || [];
  const upcomingExams = data?.upcomingExams || [];
  const recentMarks = data?.recentMarks || [];

  const currentHour = currentTime.getHours();
  const greeting = currentHour < 12 ? "Good morning" : currentHour < 17 ? "Good afternoon" : "Good evening";
  const dateLabel = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(currentTime);

  return (
    <div className={styles.dashboard}>
      <header className={styles.hero}>
        <div>
          <span className={styles.kicker}><span className={styles.liveDot} />Student Portal / {dateLabel}</span>
          <h1>{greeting}, {student.firstName || student.name || "Student"}.</h1>
          <p>Here is your personalized academic overview, today&apos;s classes, upcoming homework, and exam schedules.</p>
          <div className={styles.studentMetaTags}>
            <span className={styles.studentBadge}><HiBookOpen /> Grade: <b>{student.gradeName || "—"}</b></span>
            <span className={styles.studentBadge}><HiAcademicCap /> Section: <b>{student.sectionName || "—"}</b> {student.roomNumber ? `(${student.roomNumber})` : ""}</span>
            {student.admissionNumber && <span className={`${styles.studentBadge} ${styles.studentBadgeGold}`}><HiIdentification /> ID: <b>{student.admissionNumber}</b></span>}
            {student.rollNumber && <span className={`${styles.studentBadge} ${styles.studentBadgeBlue}`}>Roll #{student.rollNumber}</span>}
          </div>
        </div>
        <div className={styles.heroActions}>
          <span className={styles.termBadge}><HiCalendarDays />{student.schoolName || "Academic Year"}</span>
          <button className={styles.refreshButton} onClick={onRefresh} disabled={refreshing} title="Refresh dashboard">
            <HiArrowPath className={refreshing ? styles.spinning : ""} /> <span>{refreshing ? "Refreshing" : "Refresh"}</span>
          </button>
        </div>
      </header>

      {!student.gradeName && !student.sectionName && (
        <section className={styles.unassignedNotice} aria-label="Student pending class section assignment">
          <HiIdentification className={styles.unassignedNoticeIcon} />
          <div>
            <h3>Student Account Active</h3>
            <p>Welcome! Your student account is active. Your class grade, section, timetable, homework, and exam schedules will appear here automatically once your school administrator assigns you to a class section.</p>
          </div>
        </section>
      )}

      <section className={styles.metricsGrid} aria-label="Student key academic indicators">
        <Metric icon={HiBookOpen} label="Enrolled Subjects" value={number(stats.enrolledSubjectsCount)} detail="active curriculum" tone="Blue" />
        <Metric icon={HiCheckCircle} label="Attendance" value={percent(stats.attendanceRate)} detail="last 30 days" tone="Teal" />
        <Metric icon={HiChartBarSquare} label="Average Score" value={percent(stats.averageScore)} detail="overall mark" tone="Amber" />
        <Metric icon={HiClipboardDocumentList} label="Pending Homework" value={number(stats.pendingAssignmentsCount)} detail={`${stats.submittedAssignmentsCount || 0} submitted`} tone="Rose" />
      </section>

      <section className={styles.quickStats} aria-label="Quick student status summary">
        <span><HiAcademicCap /><b>{number(stats.enrolledSubjectsCount)}</b> enrolled subjects</span>
        <span><HiClock /><b>{number(stats.todayClassesCount)}</b> classes today</span>
        <span><HiPresentationChartLine /><b>{number(stats.upcomingExamsCount)}</b> upcoming assessments</span>
        <span><HiCheckCircle /><b>{number(attendance.present)}</b> days present</span>
      </section>

      <main className={styles.dashboardGrid}>
        {/* Today's Schedule */}
        <section className={styles.panel}>
          <PanelHeader
            eyebrow="Daily Routine"
            title="Today's Class Schedule"
            action={<Link href="/dashboard/timetable/class" className={styles.textLink}>Full timetable <HiOutlineArrowUpRight /></Link>}
          />
          <div className={styles.scheduleList}>
            {todaySchedule.map((item) => (
              <div className={styles.scheduleItem} key={item.id || item.period_number}>
                <div className={styles.scheduleTime}>
                  <strong>{item.start_time || "—"}</strong>
                  <small>{item.end_time || ""}</small>
                </div>
                <div className={styles.itemMain}>
                  <h4>{item.subject_name || item.period_name}</h4>
                  <p>
                    {item.subject_code && <span className={styles.subjectPill}>{item.subject_code}</span>}
                    {item.teacher_first_name && <span>👨‍🏫 {item.teacher_first_name} {item.teacher_last_name || ""}</span>}
                    {item.room_number && <span>🏫 Room {item.room_number}</span>}
                  </p>
                </div>
              </div>
            ))}
            {!todaySchedule.length && (
              <p className={styles.emptyState}>No scheduled classes today. Enjoy your day or review upcoming assignments!</p>
            )}
          </div>
        </section>

        {/* Attendance Pulse */}
        <AttendancePanel attendance={attendance} />

        {/* Upcoming Assignments */}
        <section className={styles.panel}>
          <PanelHeader
            eyebrow="Homework & Tasks"
            title="Assignments & Deadlines"
            action={<Link href="/dashboard/assignments" className={styles.textLink}>All assignments <HiOutlineArrowUpRight /></Link>}
          />
          <div className={styles.assignmentList}>
            {assignments.map((assignment) => {
              const isSubmitted = assignment.submission_status === "SUBMITTED" || assignment.submission_status === "GRADED";
              const isGraded = assignment.submission_status === "GRADED";
              return (
                <div className={styles.assignmentItem} key={assignment.id}>
                  <div className={styles.itemMain}>
                    <h4>{assignment.title}</h4>
                    <p>
                      <span className={styles.subjectPill}>{assignment.subject_name || assignment.subject_code}</span>
                      <span>📅 Due: {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : "No deadline"}</span>
                      <span>Max: {assignment.max_marks || 100} pts</span>
                    </p>
                  </div>
                  <div>
                    {isGraded ? (
                      <span className={`${styles.statusTag} ${styles.statusGraded}`}>Graded: {assignment.obtained_marks} pts</span>
                    ) : isSubmitted ? (
                      <span className={`${styles.statusTag} ${styles.statusSubmitted}`}><HiCheckCircle /> Submitted</span>
                    ) : (
                      <span className={`${styles.statusTag} ${styles.statusPending}`}><HiClock /> Pending</span>
                    )}
                  </div>
                </div>
              );
            })}
            {!assignments.length && (
              <p className={styles.emptyState}>No assignments assigned right now. You are all caught up!</p>
            )}
          </div>
        </section>

        {/* Upcoming Exams */}
        <section className={styles.panel}>
          <PanelHeader
            eyebrow="Examinations"
            title="Upcoming Assessments"
            action={<Link href="/dashboard/exams" className={styles.textLink}>Exam schedule <HiOutlineArrowUpRight /></Link>}
          />
          <div className={styles.examList}>
            {upcomingExams.map((exam) => (
              <div className={styles.examItem} key={exam.id}>
                <div className={styles.itemMain}>
                  <h4>{exam.title}</h4>
                  <p>
                    <span className={styles.subjectPill}>{exam.subject_name || exam.subject_code}</span>
                    <span>📝 {exam.exam_type || "EXAM"}</span>
                    <span>⚖️ Weight: {exam.weight_percentage || 0}%</span>
                    <span>🎯 {exam.max_marks} pts</span>
                  </p>
                </div>
                <div className={styles.scheduleTime}>
                  <strong>{exam.exam_date ? new Date(exam.exam_date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "TBD"}</strong>
                  <small>{exam.term_or_semester || "Term"}</small>
                </div>
              </div>
            ))}
            {!upcomingExams.length && (
              <p className={styles.emptyState}>No published examinations scheduled at this time.</p>
            )}
          </div>
        </section>

        {/* Recent Marks / Scores */}
        <section className={styles.panel}>
          <PanelHeader
            eyebrow="Academic Records"
            title="Recent Assessment Marks"
            action={<Link href="/dashboard/results/report-card" className={styles.textLink}>Official report card <HiOutlineArrowUpRight /></Link>}
          />
          <div className={styles.markList}>
            {recentMarks.map((mark) => (
              <div className={styles.markItem} key={mark.id}>
                <div className={styles.itemMain}>
                  <h4>{mark.exam_title || mark.subject_name}</h4>
                  <p>
                    <span className={styles.subjectPill}>{mark.subject_name || mark.subject_code}</span>
                    <span>{mark.exam_type || "Assessment"}</span>
                  </p>
                </div>
                <div className={styles.gradeScoreBadge}>
                  <strong>{mark.score !== null ? `${mark.score} / ${mark.max_marks || 100}` : "—"}</strong>
                  {mark.grade_letter && <small>Grade: {mark.grade_letter}</small>}
                </div>
              </div>
            ))}
            {!recentMarks.length && (
              <p className={styles.emptyState}>No published marks yet. Check back once assessments are graded.</p>
            )}
          </div>
        </section>

        {/* Quick Student Navigation Actions */}
        <section className={`${styles.panel} ${styles.actionPanel}`}>
          <PanelHeader eyebrow="Student Access" title="Quick Links" action={<HiBookOpen className={styles.panelIcon} />} />
          <div className={styles.actionList}>
            <Link href="/dashboard/timetable/class"><HiCalendarDays /><span>My Class Timetable</span><HiOutlineArrowUpRight /></Link>
            <Link href="/dashboard/subjects"><HiBookOpen /><span>My Enrolled Subjects</span><HiOutlineArrowUpRight /></Link>
            <Link href="/dashboard/assignments"><HiClipboardDocumentList /><span>Homework & Submissions</span><HiOutlineArrowUpRight /></Link>
            <Link href="/dashboard/exams"><HiPresentationChartLine /><span>Exam Schedules</span><HiOutlineArrowUpRight /></Link>
            <Link href="/dashboard/results/report-card"><HiChartBarSquare /><span>My Report Card</span><HiOutlineArrowUpRight /></Link>
            <Link href="/dashboard/attendance"><HiCheckCircle /><span>Attendance History</span><HiOutlineArrowUpRight /></Link>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(() => new Date());

  async function fetchDashboardData(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    try {
      const payload = await request("/api/dashboard");
      setData(payload);
      setError(null);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    request("/api/dashboard")
      .then((payload) => {
        if (isMounted) {
          setData(payload);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "Something went wrong");
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const clock = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 60 * 1000);

    return () => window.clearInterval(clock);
  }, []);

  if (loading) return <div className={styles.loading}><HiPresentationChartLine /><span>Preparing your overview...</span></div>;
  if (error) {
    return (
      <div className={styles.loading}>
        <HiExclamationTriangle />
        <span>{error || "Unable to load dashboard data."}</span>
        <button onClick={() => fetchDashboardData(true)}>Try again</button>
      </div>
    );
  }

  const dashboard = data || emptyData;
  if (dashboard.isStudent || (user?.role || "").toLowerCase() === "student") {
    return (
      <StudentDashboardView
        data={dashboard}
        refreshing={refreshing}
        onRefresh={() => fetchDashboardData(true)}
        currentTime={currentTime}
      />
    );
  }

  const stats = dashboard.stats || {};
  const firstName = user?.firstName || user?.name?.split(" ")[0] || "there";
  const currentHour = currentTime.getHours();
  const greeting = currentHour < 12 ? "Good morning" : currentHour < 17 ? "Good afternoon" : "Good evening";
  const dateLabel = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(currentTime);

  return (
    <div className={styles.dashboard}>
      <header className={styles.hero}>
        <div>
          <span className={styles.kicker}><span className={styles.liveDot} />School operations / {dateLabel}</span>
          <h1>{greeting}, {firstName}.</h1>
          <p>Here is the clearest view of what is happening across your school today.</p>
        </div>
        <div className={styles.heroActions}>
          <span className={styles.termBadge}><HiCalendarDays />{stats.currentTerm || "Current term"}</span>
          <button className={styles.refreshButton} onClick={() => fetchDashboardData(true)} disabled={refreshing} title="Refresh dashboard">
            <HiArrowPath className={refreshing ? styles.spinning : ""} /> <span>{refreshing ? "Refreshing" : "Refresh"}</span>
          </button>
        </div>
      </header>

      <section className={styles.metricsGrid} aria-label="School key performance indicators">
        <Metric icon={HiUserGroup} label="Students" value={number(stats.totalStudents)} detail="active records" tone="Blue" />
        <Metric icon={HiAcademicCap} label="Teachers" value={number(stats.totalTeachers)} detail="staff directory" tone="Teal" />
        <Metric icon={HiCheckCircle} label="Attendance" value={percent(stats.attendanceRate)} detail="last 30 days" tone="Amber" />
        <Metric icon={HiChartBarSquare} label="Average score" value={percent(stats.averageScore)} detail={`${percent(stats.passRate)} passing`} tone="Rose" />
      </section>

      <section className={styles.quickStats} aria-label="Additional school metrics">
        <span><HiBookOpen /><b>{number(stats.totalSections)}</b> sections</span>
        <span><HiClipboardDocumentList /><b>{number(stats.pendingTasks)}</b> teacher assignments</span>
        <span><HiPresentationChartLine /><b>{number(stats.publishedExams)}</b> published assessments</span>
        <span><HiOutlineUserGroup /><b>{number(stats.totalAcademicYears)}</b> academic cycles</span>
      </section>

      <main className={styles.dashboardGrid}>
        <AttendancePanel attendance={dashboard.attendance || emptyData.attendance} />
        <PerformancePanel performance={dashboard.performance || emptyData.performance} />
        <EnrollmentPanel trend={dashboard.enrollmentTrend} />
        <SectionPanel sections={dashboard.sectionOverview} />
        <ActivityPanel activities={dashboard.recentActivity} />
        <section className={`${styles.panel} ${styles.actionPanel}`}>
          <PanelHeader eyebrow="Move work forward" title="Quick actions" action={<HiClipboardDocumentList className={styles.panelIcon} />} />
          <div className={styles.actionList}>
            <Link href="/dashboard/students/new"><HiUserGroup /><span>Add a student</span><HiOutlineArrowUpRight /></Link>
            <Link href="/dashboard/teachers/new"><HiAcademicCap /><span>Add a teacher</span><HiOutlineArrowUpRight /></Link>
            <Link href="/dashboard/attendance"><HiCheckCircle /><span>Record attendance</span><HiOutlineArrowUpRight /></Link>
            <Link href="/dashboard/grades"><HiBookOpen /><span>Review grades</span><HiOutlineArrowUpRight /></Link>
          </div>
        </section>
      </main>
    </div>
  );
}

