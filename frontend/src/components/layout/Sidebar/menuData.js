import {
  HiHome,
  HiUsers,
  HiAcademicCap,
  HiCurrencyDollar,
  HiBuildingLibrary,
  HiChatBubbleLeftRight,
  HiChartBar,
  HiCog6Tooth,
} from "react-icons/hi2";

import {
  FaUserGraduate,
  FaChalkboardTeacher,
  FaUsers,
  FaUserTie,
  FaLayerGroup,
  FaSchool,
  FaBook,
  FaCalendarAlt,
  FaClipboardCheck,
  FaTasks,
  FaFileAlt,
  FaChartLine,
  FaMoneyBillWave,
  FaWallet,
  FaReceipt,
  FaPiggyBank,
  FaBookReader,
  FaBed,
  FaBus,
  FaBullhorn,
  FaBell,
  FaEnvelope,
  FaCalendarDay,
  FaChartPie,
  FaFileInvoiceDollar,
  FaClipboardList,
  FaChartArea,
  FaCalendar,
  FaBuilding,
  FaUserShield,
  FaKey,
  FaHistory,
  FaDatabase,
  FaSlidersH,
} from "react-icons/fa";

const ALL_ROLES = ["School Admin", "Admin", "Teacher", "Student", "Parent", "Staff"];
const ADMIN_ONLY = ["School Admin", "Admin"];
const ADMIN_AND_STAFF = ["School Admin", "Admin", "Staff"];
const ACADEMIC_STAFF = ["School Admin", "Admin", "Teacher", "Staff"];

const menuData = [
  {
    title: "Dashboard",
    icon: HiHome,
    link: "/dashboard",
    roles: ALL_ROLES,
  },

  {
    title: "User Management",
    icon: HiUsers,
    roles: ["School Admin", "Admin", "Teacher", "Staff", "Parent"],
    children: [
      {
        title: "Students",
        icon: FaUserGraduate,
        link: "/dashboard/students",
        roles: ["School Admin", "Admin", "Teacher", "Staff", "Parent"],
      },
      {
        title: "Teachers",
        icon: FaChalkboardTeacher,
        roles: ["School Admin", "Admin", "Teacher", "Staff"],
        children: [
          {
            title: "All Teachers",
            icon: FaChalkboardTeacher,
            link: "/dashboard/teachers",
            roles: ["School Admin", "Admin", "Staff"],
          },
          {
            title: "Teacher Subjects",
            icon: FaBook,
            link: "/dashboard/teachers/subjects",
            roles: ["School Admin", "Admin", "Teacher", "Staff"],
          },
        ],
      },
      {
        title: "Parents",
        icon: FaUsers,
        link: "/dashboard/parents",
        roles: ["School Admin", "Admin", "Teacher", "Staff"],
      },
      {
        title: "Staff",
        icon: FaUserTie,
        link: "/dashboard/staff",
        roles: ["School Admin", "Admin", "Staff"],
      },
      {
        title: "Create User",
        icon: FaUserShield,
        link: "/signup",
        roles: ["School Admin", "Admin"],
      },
    ],
  },

  {
    title: "Academics",
    icon: HiAcademicCap,
    roles: ALL_ROLES,
    children: [
      {
        title: "Grades",
        icon: FaLayerGroup,
        link: "/dashboard/grades",
        roles: ["School Admin", "Admin", "Staff"],
      },
      {
        title: "Sections",
        icon: FaSchool,
        link: "/dashboard/sections",
        roles: ["School Admin", "Admin", "Teacher", "Staff"],
      },
      {
        title: "Subjects",
        icon: FaBook,
        link: "/dashboard/subjects",
        roles: ["School Admin", "Admin", "Teacher", "Staff"],
      },
      {
        title: "Timetable",
        icon: FaCalendarAlt,
        link: "/dashboard/timetable",
        roles: ALL_ROLES,
      },
      {
        title: "Attendance",
        icon: FaClipboardCheck,
        link: "/dashboard/attendance",
        roles: ["School Admin", "Admin", "Teacher", "Student", "Parent", "Staff"],
      },
      {
        title: "Assignments",
        icon: FaTasks,
        link: "/dashboard/assignments",
        roles: ["School Admin", "Admin", "Teacher", "Student"],
      },
      {
        title: "Exams",
        icon: FaFileAlt,
        link: "/dashboard/exams",
        roles: ["School Admin", "Admin", "Teacher", "Student"],
      },
      {
        title: "Results",
        icon: FaChartLine,
        link: "/dashboard/results",
        roles: ["School Admin", "Admin", "Teacher", "Student", "Parent"],
      },
    ],
  },

  {
    title: "Finance",
    icon: HiCurrencyDollar,
    roles: ["School Admin", "Admin", "Parent", "Staff"],
    children: [
      {
        title: "Fees",
        icon: FaMoneyBillWave,
        link: "/dashboard/fees",
        roles: ["School Admin", "Admin", "Parent", "Staff"],
      },
      {
        title: "Payroll",
        icon: FaWallet,
        link: "/dashboard/payroll",
        roles: ADMIN_ONLY,
      },
      {
        title: "Expenses",
        icon: FaReceipt,
        link: "/dashboard/expenses",
        roles: ADMIN_AND_STAFF,
      },
      {
        title: "Income",
        icon: FaPiggyBank,
        link: "/dashboard/income",
        roles: ADMIN_AND_STAFF,
      },
    ],
  },

  {
    title: "Campus Services",
    icon: HiBuildingLibrary,
    roles: ["School Admin", "Admin", "Student", "Staff"],
    children: [
      {
        title: "Library",
        icon: FaBookReader,
        link: "/dashboard/library",
        roles: ["School Admin", "Admin", "Student", "Teacher", "Staff"],
      },
      {
        title: "Hostel",
        icon: FaBed,
        link: "/dashboard/hostel",
        roles: ADMIN_AND_STAFF,
      },
      {
        title: "Transport",
        icon: FaBus,
        link: "/dashboard/transport",
        roles: ADMIN_AND_STAFF,
      },
    ],
  },

  {
    title: "Communication",
    icon: HiChatBubbleLeftRight,
    roles: ALL_ROLES,
    children: [
      {
        title: "Announcements",
        icon: FaBullhorn,
        link: "/dashboard/announcements",
        roles: ALL_ROLES,
      },
      {
        title: "Notifications",
        icon: FaBell,
        link: "/dashboard/notifications",
        roles: ALL_ROLES,
      },
      {
        title: "Messages",
        icon: FaEnvelope,
        link: "/dashboard/messages",
        roles: ["School Admin", "Admin", "Teacher", "Parent", "Staff"],
      },
      {
        title: "Events",
        icon: FaCalendarDay,
        link: "/dashboard/events",
        roles: ALL_ROLES,
      },
    ],
  },

  {
    title: "Reports",
    icon: HiChartBar,
    roles: ALL_ROLES,
    children: [
      {
        title: "Academic Reports",
        icon: FaChartPie,
        link: "/dashboard/reports/academic",
        roles: ["School Admin", "Admin", "Teacher", "Student", "Parent"],
      },
      {
        title: "Financial Reports",
        icon: FaFileInvoiceDollar,
        link: "/dashboard/reports/financial",
        roles: ADMIN_AND_STAFF,
      },
      {
        title: "Attendance Reports",
        icon: FaClipboardList,
        link: "/dashboard/reports/attendance",
        roles: ["School Admin", "Admin", "Teacher", "Parent", "Staff"],
      },
      {
        title: "Analytics",
        icon: FaChartArea,
        link: "/dashboard/reports/analytics",
        roles: ADMIN_ONLY,
      },
    ],
  },

  {
    title: "System Settings",
    icon: HiCog6Tooth,
    roles: ADMIN_AND_STAFF,
    children: [
      {
        title: "Academic Years",
        icon: FaCalendar,
        link: "/dashboard/settings/academic-years",
        roles: ADMIN_ONLY,
      },
      {
        title: "Departments",
        icon: FaBuilding,
        link: "/dashboard/settings/departments",
        roles: ADMIN_ONLY,
      },
      {
        title: "User Roles",
        icon: FaUserShield,
        link: "/dashboard/settings/roles",
        roles: ADMIN_ONLY,
      },
      {
        title: "Permissions",
        icon: FaKey,
        link: "/dashboard/settings/permissions",
        roles: ADMIN_ONLY,
      },
      {
        title: "Audit Logs",
        icon: FaHistory,
        link: "/dashboard/settings/audit",
        roles: ADMIN_ONLY,
      },
      {
        title: "Backups",
        icon: FaDatabase,
        link: "/dashboard/settings/backups",
        roles: ADMIN_ONLY,
      },
      {
        title: "General Settings",
        icon: FaSlidersH,
        link: "/dashboard/settings",
        roles: ADMIN_AND_STAFF,
      },
    ],
  },
];

export default menuData;