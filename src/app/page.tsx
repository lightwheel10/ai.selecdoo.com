import Link from "next/link";
import {
  ArrowRight,
  Scan,
  Activity,
  Sparkles,
  Bell,
  BarChart3,
  Layers,
  Zap,
  Shield,
  Clock,
  Terminal,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ThemeIconToggle } from "@/components/domain/theme-icon-toggle";
import { LocaleToggle } from "@/components/domain/locale-toggle";

export default async function LandingPage() {
  const t = await getTranslations("Landing");

  const stats = [
    { value: "50K+", label: t("statProducts"), icon: Layers },
    { value: "24/7", label: t("statMonitoring"), icon: Clock },
    { value: "< 1s", label: t("statSpeed"), icon: Zap },
    { value: "99.9%", label: t("statUptime"), icon: Shield },
  ];

  const features = [
    {
      icon: Scan,
      title: t("featureScrapeTitle"),
      desc: t("featureScrapeDesc"),
    },
    {
      icon: Activity,
      title: t("featureMonitorTitle"),
      desc: t("featureMonitorDesc"),
    },
    {
      icon: Sparkles,
      title: t("featureAITitle"),
      desc: t("featureAIDesc"),
    },
  ];

  const steps = [
    {
      step: "01",
      icon: Scan,
      title: t("step1Title"),
      desc: t("step1Desc"),
    },
    {
      step: "02",
      icon: Bell,
      title: t("step2Title"),
      desc: t("step2Desc"),
    },
    {
      step: "03",
      icon: BarChart3,
      title: t("step3Title"),
      desc: t("step3Desc"),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Grid texture */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(202,255,4,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(202,255,4,0.02) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10">
        {/* ─── Nav ─── */}
        <nav
          className="flex items-center justify-between max-w-5xl mx-auto px-6 h-14 animate-fade-in"
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 flex items-center justify-center text-[10px] font-bold"
              style={{
                fontFamily: "var(--font-mono)",
                backgroundColor: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              S
            </div>
            <span
              className="text-sm font-bold tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Selecdoo
            </span>
          </div>

          <div className="flex items-center gap-4">
            <LocaleToggle />
            <ThemeIconToggle />
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-all duration-150 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none bg-primary text-primary-foreground border-primary shadow-[3px_3px_0px] shadow-primary"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {t("signIn")}
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </nav>

        {/* ─── Hero ─── */}
        <section className="max-w-5xl mx-auto px-6 pt-24 pb-20">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] blur-[200px] pointer-events-none"
            style={{ backgroundColor: "var(--primary)", opacity: 0.04 }}
          />

          <div
            className="inline-flex items-center gap-2 mb-6 px-2.5 py-1 border-2 animate-fade-in-up"
            style={{
              borderColor: "var(--primary-muted)",
              backgroundColor: "var(--primary-muted)",
            }}
          >
            <Terminal className="w-3 h-3" style={{ color: "var(--primary-text)" }} />
            <span
              className="text-[9px] font-bold uppercase tracking-[0.15em]"
              style={{ fontFamily: "var(--font-mono)", color: "var(--primary-text)" }}
            >
              {t("badge")}
            </span>
          </div>

          <h1
            className="text-4xl sm:text-6xl font-bold tracking-[-0.04em] leading-[1.05] mb-5 animate-fade-in-up"
            style={{ fontFamily: "var(--font-display)", animationDelay: "0.1s" }}
          >
            {t("heroLine1")}
            <br />
            <span
              className="px-3 py-1 inline-block"
              style={{
                backgroundColor: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >{t("heroHighlight")}</span>
          </h1>

          <p
            className="text-sm max-w-md leading-relaxed mb-8 animate-fade-in-up"
            style={{ color: "var(--muted-foreground)", animationDelay: "0.2s" }}
          >
            {t("heroDescription")}
          </p>

          <div
            className="animate-fade-in-up"
            style={{ animationDelay: "0.3s" }}
          >
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-wider border-2 transition-all duration-150 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none bg-primary text-primary-foreground border-primary shadow-[4px_4px_0px] shadow-primary"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {t("getStarted")}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>

        {/* ─── Stats ─── */}
        <section
          className="max-w-5xl mx-auto px-6 pb-20 animate-fade-in-up"
          style={{ animationDelay: "0.4s" }}
        >
          <div
            className="grid grid-cols-2 sm:grid-cols-4 border-2"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--card)",
            }}
          >
            {stats.map((stat, i) => (
              <div
                key={i}
                className="px-5 py-5 text-center"
                style={{
                  borderRight: i < 3 ? "2px solid var(--border)" : "none",
                }}
              >
                <stat.icon
                  className="w-4 h-4 mx-auto mb-2"
                  style={{ color: "var(--primary-text)" }}
                />
                <p
                  className="text-xl sm:text-2xl font-bold mb-1"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {stat.value}
                </p>
                <p
                  className="text-[9px] font-bold uppercase tracking-[0.15em]"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--muted-foreground)",
                  }}
                >
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Features ─── */}
        <section id="features" className="max-w-5xl mx-auto px-6 pb-24">
          <div
            className="mb-10 animate-fade-in-up"
            style={{ animationDelay: "0.1s" }}
          >
            <p
              className="text-[10px] font-bold uppercase tracking-[0.15em] mb-3"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--primary-text)",
              }}
            >
              {t("featuresLabel")}
            </p>
            <h2
              className="text-2xl sm:text-3xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {t("featuresTitle1")}
              <br />
              {t("featuresTitle2")}
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <div
                key={i}
                className="p-5 border-2 transition-all duration-200 hover:border-[var(--primary-border)] hover:-translate-y-0.5 animate-fade-in-up"
                style={{
                  backgroundColor: "var(--card)",
                  borderColor: "var(--border)",
                  animationDelay: `${0.2 + i * 0.1}s`,
                }}
              >
                <div
                  className="w-9 h-9 flex items-center justify-center mb-4 border-2"
                  style={{
                    borderColor: "var(--primary-muted)",
                    backgroundColor: "var(--primary-muted)",
                  }}
                >
                  <f.icon className="w-4 h-4" style={{ color: "var(--primary-text)" }} />
                </div>
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--foreground)",
                  }}
                >
                  {f.title}
                </p>
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── How It Works ─── */}
        <section className="max-w-5xl mx-auto px-6 pb-24">
          <div
            className="mb-10 animate-fade-in-up"
            style={{ animationDelay: "0.1s" }}
          >
            <p
              className="text-[10px] font-bold uppercase tracking-[0.15em] mb-3"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--primary-text)",
              }}
            >
              {t("howItWorksLabel")}
            </p>
            <h2
              className="text-2xl sm:text-3xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {t("howItWorksTitle")}
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {steps.map((s, i) => (
              <div
                key={s.step}
                className="p-5 border-2 relative animate-fade-in-up"
                style={{
                  backgroundColor: "var(--card)",
                  borderColor: "var(--border)",
                  animationDelay: `${0.2 + i * 0.1}s`,
                }}
              >
                <p
                  className="text-[32px] font-bold absolute top-4 right-5"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--foreground)",
                    opacity: 0.06,
                  }}
                >
                  {s.step}
                </p>
                <div
                  className="w-9 h-9 flex items-center justify-center mb-4 border-2"
                  style={{
                    borderColor: "var(--border)",
                    backgroundColor: "var(--secondary)",
                  }}
                >
                  <s.icon
                    className="w-4 h-4"
                    style={{ color: "var(--foreground)" }}
                  />
                </div>
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--foreground)",
                  }}
                >
                  {s.title}
                </p>
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── CTA ─── */}
        <section
          className="max-w-5xl mx-auto px-6 pb-24 animate-fade-in-up"
          style={{ animationDelay: "0.2s" }}
        >
          <div
            className="p-8 sm:p-12 border-2 text-center relative overflow-hidden"
            style={{
              backgroundColor: "var(--card)",
              borderColor: "var(--primary-border)",
            }}
          >
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] blur-[150px] pointer-events-none"
              style={{ backgroundColor: "var(--primary)", opacity: 0.06 }}
            />
            <div className="relative z-10">
              <Zap
                className="w-6 h-6 mx-auto mb-4"
                style={{ color: "var(--primary-text)" }}
              />
              <h2
                className="text-2xl sm:text-3xl font-bold tracking-tight mb-3"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {t("ctaTitle")}
              </h2>
              <p
                className="text-sm mb-6 max-w-md mx-auto"
                style={{ color: "var(--muted-foreground)" }}
              >
                {t("ctaDescription")}
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-wider border-2 transition-all duration-150 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none bg-primary text-primary-foreground border-primary shadow-[4px_4px_0px] shadow-primary"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {t("ctaButton")}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* ─── Footer ─── */}
        <footer
          className="border-t py-8 animate-fade-in"
          style={{ borderColor: "var(--border)", animationDelay: "0.3s" }}
        >
          <div className="max-w-5xl mx-auto px-6 flex flex-col items-center gap-2 text-center">
            <p
              className="text-[10px] font-bold tracking-wider"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--muted-foreground)",
                opacity: 0.5,
              }}
            >
              {t("footerRights")}
            </p>
            <p
              className="text-[10px] tracking-wider"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--muted-foreground)",
                opacity: 0.35,
              }}
            >
              {t.rich("footerMadeWith", {
                heart: (chunks) => <span style={{ color: "#FF453A", opacity: 1 }}>{chunks}</span>,
              })}
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
