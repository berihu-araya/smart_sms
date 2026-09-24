import HomeLandingClient from "./HomeLandingClient";

export const metadata = {
  title: "YOYO Academy | Smart SMS - Intelligent School Management & Automated SMS",
  description:
    "Comprehensive cloud platform for schools: automated SMS parent notifications, student information system (SIS), real-time gradebooks, fee billing, and class schedules.",
  openGraph: {
    title: "YOYO Academy | Smart SMS - Intelligent School Management",
    description:
      "Modern school management system with automated parent SMS, real-time gradebooks, and instant fee tracking.",
  },
};

export default function Home() {
  return <HomeLandingClient />;
}
