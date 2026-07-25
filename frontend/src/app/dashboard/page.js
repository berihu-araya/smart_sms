"use client";

import { useEffect, useState } from "react";

import StatCard from "@/components/dashboard/StatCard";
import RecentActivity from "@/components/dashboard/RecentActivity";
import QuickActions from "@/components/dashboard/QuickActions";
import AcademicOverview from "@/components/dashboard/AcademicOverview";

import { request } from "@/services/apiClient";
import styles from "./page.module.css";


export default function Dashboard() {
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



  return (

    <div className={styles.dashboard}>


      <div className={styles.header}>

        <div>

          <h1>
            Dashboard
          </h1>

          <p className={styles.headerSubtitle}>
            Welcome back! Here&apos;s what&apos;s happening today.
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
          trend="+12% from last month"
          color="blue"
        />


        <StatCard
          title="Active Teachers"
          value={data.stats.totalTeachers}
          icon="👨‍🏫"
          trend="+5 new this term"
          color="green"
        />


        <StatCard
          title="Schools"
          value={data.stats.totalSchools}
          icon="🏫"
          trend="All active"
          color="purple"
        />


        <StatCard
          title="Pending Tasks"
          value={data.stats.pendingTasks}
          icon="📋"
          trend="Requires attention"
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
