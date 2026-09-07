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

  if (loading) return <div className={styles.loading}><HiPresentationChartLine /><span>Preparing your school overview...</span></div>;
  if (error) return <div className={styles.loading}><HiExclamationTriangle /><span>Unable to load dashboard data.</span><button onClick={() => fetchDashboardData(true)}>Try again</button></div>;

  const dashboard = data || emptyData;
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
