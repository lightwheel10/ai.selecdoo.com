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
import { ProductDemoVideo, type VideoTexts } from "./_components/product-demo-video";

export default async function LandingPage() {
  const t = await getTranslations("Landing");

  const stats = [
    { value: "50K+", label: t("statProducts"), icon: Layers },
    { value: "24/7", label: t("statMonitoring"), icon: Clock },
    { value: "< 1s", label: t("statSpeed"), icon: Zap },
    { value: "99.9%", label: t("statUptime"), icon: Shield },
  ];

  const features = [
    { icon: Scan, title: t("featureScrapeTitle"), desc: t("featureScrapeDesc") },
    { icon: Activity, title: t("featureMonitorTitle"), desc: t("featureMonitorDesc") },
    { icon: Sparkles, title: t("featureAITitle"), desc: t("featureAIDesc") },
  ];

  const steps = [
    { step: "01", icon: Scan, title: t("step1Title"), desc: t("step1Desc") },
    { step: "02", icon: Bell, title: t("step2Title"), desc: t("step2Desc") },
    { step: "03", icon: BarChart3, title: t("step3Title"), desc: t("step3Desc") },
  ];

  return (
    <div className="landing-page min-h-screen bg-background text-foreground">
      {/* ─── 20px Blueprint Grid (signature texture per DESIGN.md §2) ─── */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(128,128,128,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(128,128,128,0.06) 1px, transparent 1px)
          `,
          backgroundSize: "20px 20px",
        }}
      />

      {/* ─── Status Bar (DESIGN.md §5: 24px strip, scrolling monospace) ─── */}
      <div
        className="h-7 overflow-hidden relative z-20 flex items-center bg-primary"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: "var(--primary-foreground)",
        }}
      >
        <div
          className="flex gap-12 whitespace-nowrap"
          style={{
            paddingLeft: "100%",
            animation: "scroll-status 30s linear infinite",
          }}
        >
          {[
            "[ SYS ] Stores monitored: 63",
            "[ SCAN ] Products indexed: 50,412",
            "[ AI ] Content generated: 12,847",
            "[ MON ] Price drops detected: 3,291",
            "[ LIVE ] Uptime: 99.97%",
            "[ SYS ] Stores monitored: 63",
            "[ SCAN ] Products indexed: 50,412",
            "[ AI ] Content generated: 12,847",
            "[ MON ] Price drops detected: 3,291",
            "[ LIVE ] Uptime: 99.97%",
          ].map((text, i) => (
            <span key={i}>{text}</span>
          ))}
        </div>
      </div>

      <div className="relative z-10">
        {/* ═══ NAV ═══ */}
        <nav className="flex items-center justify-between max-w-5xl mx-auto px-6 sm:px-8 h-16">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 flex items-center justify-center text-[9px] font-bold bg-primary text-primary-foreground"
              style={{
                fontFamily: "var(--font-mono)",
                border: "2px solid var(--border-strong)",
              }}
            >
              MF
            </div>
            <span
              className="text-[15px] font-black tracking-tight"
              style={{ fontFamily: "var(--font-display-landing)" }}
            >
              MarketForce One
            </span>
          </div>

          <div className="flex items-center gap-4">
            <LocaleToggle />
            <ThemeIconToggle />
            {/* Primary button: DESIGN.md §5 — primary bg, 2px black border, 4px hard shadow */}
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-2 text-[10px] font-bold uppercase tracking-[0.15em] bg-primary text-primary-foreground transition-all duration-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              style={{
                fontFamily: "var(--font-mono)",
                border: "2px solid var(--border-strong)",
                boxShadow: "var(--hard-shadow)",
              }}
            >
              {t("signIn")}
              <ArrowRight className="w-3 h-3" strokeWidth={3} />
            </Link>
          </div>
        </nav>

        {/* ═══ HERO — Left-aligned editorial (DESIGN.md §6: no centered layouts) ═══ */}
        <section className="max-w-5xl mx-auto px-6 sm:px-8 pt-20 sm:pt-28 pb-20 sm:pb-28">
          {/* Action chip — DESIGN.md §5: black-on-yellow */}
          <div
            className="inline-flex items-center gap-2 mb-8 px-3 py-1"
            style={{
              border: "2px solid var(--primary-border)",
              backgroundColor: "var(--primary-muted)",
            }}
          >
            <Terminal className="w-3 h-3" style={{ color: "var(--primary-text)" }} />
            <span
              className="text-[9px] font-bold uppercase tracking-[0.2em]"
              style={{ fontFamily: "var(--font-mono)", color: "var(--primary-text)" }}
            >
              {t("badge")}
            </span>
          </div>

          {/* Display headline — Epilogue, -4% tracking, extreme scale */}
          <h1
            className="text-5xl sm:text-7xl lg:text-[88px] font-black leading-[0.95] mb-7 max-w-[800px]"
            style={{
              fontFamily: "var(--font-display-landing)",
              letterSpacing: "-0.04em",
            }}
          >
            {t("heroLine1")}
            <br />
            <span className="inline-block mt-2 px-4 py-1 bg-primary text-primary-foreground">
              {t("heroHighlight")}
            </span>
          </h1>

          {/* Body — Inter */}
          <p
            className="text-base max-w-md leading-relaxed mb-10 text-muted-foreground"
            style={{ fontFamily: "var(--font-body-landing)" }}
          >
            {t("heroDescription")}
          </p>

          {/* Primary CTA */}
          <Link
            href="/login"
            className="inline-flex items-center gap-2.5 px-7 py-3.5 text-[11px] font-bold uppercase tracking-[0.15em] bg-primary text-primary-foreground transition-all duration-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            style={{
              fontFamily: "var(--font-mono)",
              border: "2px solid var(--border-strong)",
              boxShadow: "var(--hard-shadow)",
            }}
          >
            {t("getStarted")}
            <ArrowRight className="w-3.5 h-3.5" strokeWidth={3} />
          </Link>

          {/* Stats row — compact, inside hero */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-4 mt-16 pt-8"
            style={{ borderTop: "2px solid var(--border)" }}
          >
            {stats.map((stat, i) => (
              <div key={i} className="flex items-center gap-3">
                <stat.icon
                  className="w-4 h-4 shrink-0"
                  strokeWidth={2.5}
                  style={{ color: "var(--primary-text)" }}
                />
                <div>
                  <p
                    className="text-lg font-extrabold leading-none"
                    style={{
                      fontFamily: "var(--font-display-landing)",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {stat.value}
                  </p>
                  <p
                    className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground mt-0.5"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {stat.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ VIDEO — Color block shift to dark (DESIGN.md §2: "No-Line Rule") ═══ */}
        <section
          className="py-20"
          style={{
            backgroundColor: "var(--section-alt-bg)",
            color: "var(--section-alt-fg)",
          }}
        >
          <div className="max-w-5xl mx-auto px-6 sm:px-8">
            <p
              className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--primary)",
              }}
            >
              {t("videoLabel")}
            </p>
            <h2
              className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-8"
              style={{
                fontFamily: "var(--font-display-landing)",
                letterSpacing: "-0.03em",
              }}
            >
              {t("videoTitle")}
            </h2>
            {/* Video wrapper with gold shadow for sticker effect */}
            <div
              style={{
                border: "2px solid var(--section-alt-border)",
                boxShadow: "var(--section-alt-shadow)",
              }}
            >
              <ProductDemoVideo
                texts={{
                  sceneScrape: t("videoSceneScrape"),
                  sceneCatalog: t("videoSceneCatalog"),
                  sceneMonitor: t("videoSceneMonitor"),
                  sceneAI: t("videoSceneAI"),
                } satisfies VideoTexts}
              />
            </div>
          </div>
        </section>

        {/* ═══ FEATURES — Back to main bg ═══ */}
        <section className="py-20 bg-background">
          <div className="max-w-5xl mx-auto px-6 sm:px-8">
            <div className="mb-12">
              <p
                className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--primary-text)",
                }}
              >
                {t("featuresLabel")}
              </p>
              <h2
                className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-[1.1] max-w-xl"
                style={{
                  fontFamily: "var(--font-display-landing)",
                  letterSpacing: "-0.03em",
                }}
              >
                {t("featuresTitle1")}
                <br />
                {t("featuresTitle2")}
              </h2>
            </div>

            {/* Cards: DESIGN.md §5 — 2px black border, hard shadow, 0px radius */}
            <div className="grid sm:grid-cols-3 gap-4">
              {features.map((f, i) => (
                <div
                  key={i}
                  className="p-6 bg-card transition-all duration-100 hover:-translate-y-0.5 hover:shadow-none"
                  style={{
                    border: "2px solid var(--border-strong)",
                    boxShadow: "var(--hard-shadow)",
                  }}
                >
                  <div
                    className="w-10 h-10 flex items-center justify-center mb-5"
                    style={{
                      border: "2px solid var(--primary-border)",
                      backgroundColor: "var(--primary-muted)",
                    }}
                  >
                    <f.icon className="w-4 h-4" strokeWidth={2.5} style={{ color: "var(--primary-text)" }} />
                  </div>
                  <p
                    className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {f.title}
                  </p>
                  <p
                    className="text-[13px] leading-relaxed text-muted-foreground"
                    style={{ fontFamily: "var(--font-body-landing)" }}
                  >
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ HOW IT WORKS — Color block shift to dark again ═══ */}
        <section
          className="py-20"
          style={{
            backgroundColor: "var(--section-alt-bg)",
            color: "var(--section-alt-fg)",
          }}
        >
          <div className="max-w-5xl mx-auto px-6 sm:px-8">
            <div className="mb-12">
              <p
                className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--primary)",
                }}
              >
                {t("howItWorksLabel")}
              </p>
              <h2
                className="text-3xl sm:text-4xl lg:text-5xl font-extrabold"
                style={{
                  fontFamily: "var(--font-display-landing)",
                  letterSpacing: "-0.03em",
                }}
              >
                {t("howItWorksTitle")}
              </h2>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              {steps.map((s, i) => (
                <div
                  key={s.step}
                  className="p-6 relative transition-all duration-100 hover:-translate-y-0.5 hover:shadow-none"
                  style={{
                    backgroundColor: "var(--section-alt-card)",
                    border: "2px solid var(--section-alt-border)",
                    boxShadow: i === 1 ? `4px 4px 0px var(--primary)` : "var(--section-alt-shadow)",
                  }}
                >
                  {/* [ 01 ] Hard Bracketing — DESIGN.md §6 */}
                  <p
                    className="text-[36px] font-bold absolute top-4 right-5 select-none"
                    style={{
                      fontFamily: "var(--font-mono)",
                      opacity: 0.12,
                      letterSpacing: "0.05em",
                    }}
                  >
                    [ {s.step} ]
                  </p>
                  <div
                    className="w-10 h-10 flex items-center justify-center mb-5"
                    style={{
                      border: "2px solid var(--section-alt-border)",
                      backgroundColor: "var(--section-alt-bg)",
                    }}
                  >
                    <s.icon className="w-4 h-4" strokeWidth={2.5} />
                  </div>
                  <p
                    className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {s.title}
                  </p>
                  <p
                    className="text-[13px] leading-relaxed"
                    style={{
                      color: "var(--section-alt-muted)",
                      fontFamily: "var(--font-body-landing)",
                    }}
                  >
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ CTA — 45-degree gold gradient (DESIGN.md §2: metallic sheen) ═══ */}
        <section
          className="py-20"
          style={{
            background: "linear-gradient(45deg, var(--primary), #FFF0A0)",
            color: "var(--primary-foreground)",
          }}
        >
          <div className="max-w-xl mx-auto px-6 sm:px-8">
            <Zap className="w-7 h-7 mb-5" strokeWidth={2.5} />
            <h2
              className="text-3xl sm:text-4xl font-extrabold leading-[1.1] mb-4"
              style={{
                fontFamily: "var(--font-display-landing)",
                letterSpacing: "-0.03em",
              }}
            >
              {t("ctaTitle")}
            </h2>
            <p
              className="text-[15px] leading-relaxed mb-8 opacity-65"
              style={{ fontFamily: "var(--font-body-landing)" }}
            >
              {t("ctaDescription")}
            </p>
            {/* Secondary button: DESIGN.md §5 — black bg, white text */}
            <Link
              href="/login"
              className="inline-flex items-center gap-2.5 px-7 py-3.5 text-[11px] font-bold uppercase tracking-[0.15em] transition-all duration-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              style={{
                fontFamily: "var(--font-mono)",
                backgroundColor: "#000000",
                color: "#F9F9F9",
                border: "2px solid #000000",
                boxShadow: "4px 4px 0px rgba(0,0,0,0.2)",
              }}
            >
              {t("ctaButton")}
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={3} />
            </Link>
          </div>
        </section>

        {/* ═══ FOOTER ═══ */}
        <footer
          className="py-8 bg-background"
          style={{ borderTop: "2px solid var(--border)" }}
        >
          <div className="max-w-5xl mx-auto px-6 sm:px-8 flex flex-col items-center gap-2 text-center">
            <p
              className="text-[10px] font-bold tracking-wider text-muted-foreground opacity-50"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {t("footerRights")}
            </p>
            <p
              className="text-[10px] tracking-wider text-muted-foreground opacity-35"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {t.rich("footerMadeWith", {
                heart: (chunks) => <span style={{ color: "#FF453A", opacity: 1 }}>{chunks}</span>,
                link: (chunks) => (
                  <a
                    href="https://www.spectrumailabs.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:opacity-100"
                    style={{ opacity: 1 }}
                  >
                    {chunks}
                  </a>
                ),
              })}
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
