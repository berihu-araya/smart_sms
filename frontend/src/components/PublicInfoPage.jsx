import Link from "next/link";

const pageContent = {
  about: {
    eyebrow: "About Smart SMS",
    title: "A calmer way to run a school.",
    description: "Smart SMS brings student records, academic planning, attendance, communication, and reporting into one clear workspace.",
    points: ["One source of truth for school operations", "Role-based spaces for staff, teachers, parents, and students", "Practical insights for better day-to-day decisions"],
  },
  features: {
    eyebrow: "The platform",
    title: "The tools your school uses every day.",
    description: "Keep the important work connected, from admissions and timetables to marks, attendance, and family communication.",
    points: ["Student and guardian records", "Subjects, grades, marks, and report cards", "Timetables, attendance, notifications, and reports"],
  },
  contact: {
    eyebrow: "Contact",
    title: "Let us help your school move forward.",
    description: "Reach the Smart SMS team for product questions, onboarding support, or help with your school workspace.",
    points: ["Email: support@smartsms.example", "Response time: one business day", "Support for setup, access, and school workflows"],
  },
};

export default function PublicInfoPage({ page }) {
  const content = pageContent[page];

  return (
    <main style={{ minHeight: "calc(100vh - 76px)", background: "#f7f8f4", padding: "clamp(48px, 9vw, 112px) 24px" }}>
      <section style={{ maxWidth: 1080, margin: "0 auto", display: "grid", gridTemplateColumns: "minmax(0, 1.15fr) minmax(280px, 0.85fr)", gap: "clamp(32px, 7vw, 88px)", alignItems: "center" }}>
        <div>
          <p style={{ color: "#ad5c3d", fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 18px" }}>{content.eyebrow}</p>
          <h1 style={{ color: "#173f3b", fontSize: "clamp(40px, 6vw, 76px)", lineHeight: 0.98, letterSpacing: "-0.04em", maxWidth: 720, margin: "0 0 26px" }}>{content.title}</h1>
          <p style={{ color: "#53615f", fontSize: 19, lineHeight: 1.65, maxWidth: 650, margin: "0 0 34px" }}>{content.description}</p>
          <Link href="/login" style={{ display: "inline-flex", alignItems: "center", padding: "13px 20px", background: "#173f3b", color: "#fff", textDecoration: "none", borderRadius: 8, fontWeight: 700 }}>Open the platform</Link>
        </div>
        <div style={{ background: "#173f3b", color: "#f7f8f4", padding: "34px 30px", borderRadius: 12, boxShadow: "18px 18px 0 #d7e1d8" }}>
          <p style={{ margin: "0 0 22px", color: "#e6b36b", fontWeight: 700 }}>Built for the whole school</p>
          <ul style={{ display: "grid", gap: 20, padding: 0, margin: 0, listStyle: "none" }}>
            {content.points.map((point) => <li key={point} style={{ borderTop: "1px solid rgba(247,248,244,0.22)", paddingTop: 17, lineHeight: 1.5 }}>{point}</li>)}
          </ul>
        </div>
      </section>
    </main>
  );
}