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

const menuData = [
  {
    title: "Dashboard",
    icon: HiHome,
    link: "/dashboard",
  },

  {
    title: "User Management",
    icon: HiUsers,
    children: [
      {
        title: "Students",
        icon: FaUserGraduate,
        link: "/dashboard/students",
      },
      {
        title: "Teachers",
        icon: FaChalkboardTeacher,
        children: [
          {
            title: "All Teachers",
            icon: FaChalkboardTeacher,
            link: "/dashboard/teachers",
          },
          {
            title: "Teacher Subjects",
            icon: FaBook,
            link: "/dashboard/teachers/subjects",
          },
        ],
      },
      {
        title: "Parents",
        icon: FaUsers,
        link: "/dashboard/parents",
      },
      {
        title: "Staff",
        icon: FaUserTie,
        link: "/dashboard/staff",
      },
    ],
  },

  {
    title: "Academics",
    icon: HiAcademicCap,
    children: [
      {
        title: "Grades",
        icon: FaLayerGroup,
        link: "/dashboard/grades",
      },
      {
        title: "Sections",
        icon: FaSchool,
        link: "/dashboard/sections",
      },
      {
        title: "Subjects",
        icon: FaBook,
        link: "/dashboard/subjects",
      },
      {
        title: "Timetable",
        icon: FaCalendarAlt,
        link: "/dashboard/timetable",
      },
      {
        title: "Attendance",
        icon: FaClipboardCheck,
        link: "/dashboard/attendance",
      },
      {
        title: "Assignments",
        icon: FaTasks,
        link: "/dashboard/assignments",
      },
      {
        title: "Exams",
        icon: FaFileAlt,
        link: "/dashboard/exams",
      },
      {
        title: "Results",
        icon: FaChartLine,
        link: "/dashboard/results",
      },
    ],
  },

  {
    title: "Finance",
    icon: HiCurrencyDollar,
    children: [
      {
        title: "Fees",
        icon: FaMoneyBillWave,
        link: "/dashboard/fees",
      },
      {
        title: "Payroll",
        icon: FaWallet,
        link: "/dashboard/payroll",
      },
      {
        title: "Expenses",
        icon: FaReceipt,
        link: "/dashboard/expenses",
      },
      {
        title: "Income",
        icon: FaPiggyBank,
        link: "/dashboard/income",
      },
    ],
  },

  {
    title: "Campus Services",
    icon: HiBuildingLibrary,
    children: [
      {
        title: "Library",
        icon: FaBookReader,
        link: "/dashboard/library",
      },
      {
        title: "Hostel",
        icon: FaBed,
        link: "/dashboard/hostel",
      },
      {
        title: "Transport",
        icon: FaBus,
        link: "/dashboard/transport",
      },
    ],
  },

  {
    title: "Communication",
    icon: HiChatBubbleLeftRight,
    children: [
      {
        title: "Announcements",
        icon: FaBullhorn,
        link: "/dashboard/announcements",
      },
      {
        title: "Notifications",
        icon: FaBell,
        link: "/dashboard/notifications",
      },
      {
        title: "Messages",
        icon: FaEnvelope,
        link: "/dashboard/messages",
      },
      {
        title: "Events",
        icon: FaCalendarDay,
        link: "/dashboard/events",
      },
    ],
  },

  {
    title: "Reports",
    icon: HiChartBar,
    children: [
      {
        title: "Academic Reports",
        icon: FaChartPie,
        link: "/dashboard/reports/academic",
      },
      {
        title: "Financial Reports",
        icon: FaFileInvoiceDollar,
        link: "/dashboard/reports/financial",
      },
      {
        title: "Attendance Reports",
        icon: FaClipboardList,
        link: "/dashboard/reports/attendance",
      },
      {
        title: "Analytics",
        icon: FaChartArea,
        link: "/dashboard/reports/analytics",
      },
    ],
  },

  {
    title: "System Settings",
    icon: HiCog6Tooth,
    children: [
      {
        title: "Academic Years",
        icon: FaCalendar,
        link: "/dashboard/settings/academic-years",
      },
      {
        title: "Departments",
        icon: FaBuilding,
        link: "/dashboard/settings/departments",
      },
      {
        title: "User Roles",
        icon: FaUserShield,
        link: "/dashboard/settings/roles",
      },
      {
        title: "Permissions",
        icon: FaKey,
        link: "/dashboard/settings/permissions",
      },
      {
        title: "Audit Logs",
        icon: FaHistory,
        link: "/dashboard/settings/audit",
      },
      {
        title: "Backups",
        icon: FaDatabase,
        link: "/dashboard/settings/backups",
      },
      {
        title: "General Settings",
        icon: FaSlidersH,
        link: "/dashboard/settings",
      },
    ],
  },
];

export default menuData;