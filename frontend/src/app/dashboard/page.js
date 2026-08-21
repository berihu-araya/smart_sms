"use client";
import { useEffect, useState } from "react";

import StatCard from "@/components/dashboard/StatCard";
import RecentActivity from "@/components/dashboard/RecentActivity";
import QuickActions from "@/components/dashboard/QuickActions";
import AcademicOverview from "@/components/dashboard/AcademicOverview";

import { useAuth } from "@/hooks/useAuth";
import { request } from "@/services/apiClient";
import styles from "./page.module.css";


export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchDashboardData() {
      try {
        const payload = await request("/api/dashboard");

        if (isMounted) {
          setData(payload);
          setError(null);
        }

      } catch (err) {

        if (isMounted) {
          setError(err.message || "Something went wrong");
        }

      } finally {

        if (isMounted) {
          setLoading(false);
        }

      }
    }


    fetchDashboardData();


    return () => {
      isMounted = false;
    };

  }, []);



  if (loading) {
    return (
      <div className={styles.loading}>
        Loading dashboard...
      </div>
    );
  }


  if (error) {
    return (
      <div className={styles.loading}>
        Unable to load dashboard data.
      </div>
    );
  }


  if (!data) {
    return null;
  }

  const roleName = user?.role || "School Admin";
  const userGreetingName = user?.firstName
    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
    : user?.name || "User";

  const getRoleIcon = (role) => {
    switch ((role || "").toLowerCase()) {
      case "teacher":
        return "👨‍🏫";
      case "student":
        return "🎓";
      case "parent":
        return "👨‍👩‍👧";
      case "staff":
        return "👔";
      default:
        return "👑";
    }
  };

  return (

    <div className={styles.dashboard}>


      <div className={styles.header}>

        <div>

          <div className={styles.headerTitleRow}>
            <h1>
              Dashboard
            </h1>
            <span className={styles.roleBadge}>
              <span>{getRoleIcon(roleName)}</span>
              <span>{roleName}</span>
            </span>
          </div>

          <p className={styles.headerSubtitle}>
            Welcome back, <strong>{userGreetingName}</strong>! Here&apos;s your {roleName.toLowerCase()} overview for today.
          </p>

        </div>


        <div className={styles.headerInfo}>

          <span className={styles.currentTerm}>
            {data.stats.currentTerm}
          </span>

        </div>

      </div>




      <div className={styles.statsGrid}>


        <StatCard
          title="Total Students"
          value={data.stats.totalStudents}
          icon="👥"
          trend="Live database count"
          color="blue"
        />


        <StatCard
          title="Active Teachers"
          value={data.stats.totalTeachers}
          icon="👨‍🏫"
          trend="Live database count"
          color="green"
        />


        <StatCard
          title="Academic Years"
          value={data.stats.totalSchools}
          icon="🏫"
          trend="Live database count"
          color="purple"
        />


        <StatCard
          title="Assignments"
          value={data.stats.pendingTasks}
          icon="📋"
          trend="Live database count"
          color="orange"
          highlight
        />


      </div>





      <div className={styles.contentGrid}>


        <div className={styles.columnMain}>


          <AcademicOverview
            schools={data.schoolsOverview}
          />


          <RecentActivity
            activities={data.recentActivity}
          />


        </div>




        <div className={styles.columnSide}>

          <QuickActions />

        </div>



      </div>


    </div>

  );
}
