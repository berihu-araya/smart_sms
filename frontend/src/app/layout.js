import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/context/AuthContext";

export const metadata = {
  title: "YOYO Academy | Smart SMS - Next-Gen School Management & Automated SMS",
  description:
    "Unified school management ecosystem connecting administrators, teachers, parents, and students with real-time gradebooks, automated SMS alerts, and financial billing.",
  keywords: [
    "School Management System",
    "Smart SMS",
    "SIS",
    "Attendance Tracking",
    "Report Card Generator",
    "YOYO Academy",
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Header />
          {children}
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}

