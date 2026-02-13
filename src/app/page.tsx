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
  ChevronRight,
  Terminal,
} from "lucide-react";

export default function LandingPage() {
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
        <nav className="flex items-center justify-between max-w-5xl mx-auto px-6 h-14">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 flex items-center justify-center text-[10px] font-bold"
              style={{
                fontFamily: "var(--font-mono)",
                backgroundColor: "#CAFF04",
                color: "#0A0A0A",
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

          <Link
            href="/login"
            className="flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-all duration-150 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none bg-primary text-primary-foreground border-primary shadow-[3px_3px_0px] shadow-primary"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            Sign In
            <ArrowRight className="w-3 h-3" />
          </Link>
        </nav>

        {/* ─── Hero ─── */}
        <section className="max-w-5xl mx-auto px-6 pt-24 pb-20">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] blur-[200px] pointer-events-none"
            style={{ backgroundColor: "#CAFF04", opacity: 0.04 }}
          />

          <div
            className="inline-flex items-center gap-2 mb-6 px-2.5 py-1 border-2"
            style={{
              borderColor: "rgba(202,255,4,0.3)",
              backgroundColor: "rgba(202,255,4,0.05)",
            }}
          >
            <Terminal className="w-3 h-3" style={{ color: "#CAFF04" }} />
            <span
              className="text-[9px] font-bold uppercase tracking-[0.15em]"
              style={{ fontFamily: "var(--font-mono)", color: "#CAFF04" }}
            >
              Product Intelligence Platform
            </span>
          </div>

          <h1
            className="text-4xl sm:text-6xl font-bold tracking-[-0.04em] leading-[1.05] mb-5"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Monitor every
            <br />
            <span style={{ color: "var(--accent)" }}>Shopify product.</span>
          </h1>

          <p
            className="text-sm max-w-md leading-relaxed mb-8"
            style={{ color: "var(--muted-foreground)" }}
          >
            Scrape, track, and generate AI content for your Shopify stores.
            Know when prices change, stock runs out, or new products drop.
          </p>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-wider border-2 transition-all duration-150 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none bg-primary text-primary-foreground border-primary shadow-[4px_4px_0px] shadow-primary"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Get Started
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-1.5 px-4 py-3 text-xs font-bold uppercase tracking-wider border-2 transition-all duration-150"
              style={{
                fontFamily: "var(--font-mono)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
                opacity: 0.7,
              }}
            >
              Learn More
              <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </section>

        {/* ─── Stats ─── */}
        <section className="max-w-5xl mx-auto px-6 pb-20">
          <div
            className="grid grid-cols-2 sm:grid-cols-4 border-2"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--card)",
            }}
          >
            {[
              { value: "50K+", label: "Products Tracked", icon: Layers },
              { value: "24/7", label: "Monitoring", icon: Clock },
              { value: "< 1s", label: "Scrape Speed", icon: Zap },
              { value: "99.9%", label: "Uptime", icon: Shield },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className="px-5 py-5 text-center"
                style={{
                  borderRight: i < 3 ? "2px solid var(--border)" : "none",
                }}
              >
                <stat.icon
                  className="w-4 h-4 mx-auto mb-2"
                  style={{ color: "#CAFF04" }}
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
          <div className="mb-10">
            <p
              className="text-[10px] font-bold uppercase tracking-[0.15em] mb-3"
              style={{
                fontFamily: "var(--font-mono)",
                color: "#CAFF04",
              }}
            >
              Core Features
            </p>
            <h2
              className="text-2xl sm:text-3xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Everything you need to dominate
              <br />
              your competitive landscape.
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                icon: Scan,
                title: "Scrape",
                desc: "Pull every product from any Shopify store. Prices, variants, stock status, images — all structured and queryable.",
              },
              {
                icon: Activity,
                title: "Monitor",
                desc: "Track changes in real-time. Get alerts when prices shift, products go out of stock, or new items drop.",
              },
              {
                icon: Sparkles,
                title: "AI Content",
                desc: "Generate optimized product descriptions, SEO copy, and marketing content powered by AI.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="p-5 border-2 transition-colors duration-150 hover:border-[rgba(202,255,4,0.3)]"
                style={{
                  backgroundColor: "var(--card)",
                  borderColor: "var(--border)",
                }}
              >
                <div
                  className="w-9 h-9 flex items-center justify-center mb-4 border-2"
                  style={{
                    borderColor: "rgba(202,255,4,0.2)",
                    backgroundColor: "rgba(202,255,4,0.05)",
                  }}
                >
                  <f.icon className="w-4 h-4" style={{ color: "#CAFF04" }} />
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
          <div className="mb-10">
            <p
              className="text-[10px] font-bold uppercase tracking-[0.15em] mb-3"
              style={{
                fontFamily: "var(--font-mono)",
                color: "#CAFF04",
              }}
            >
              How It Works
            </p>
            <h2
              className="text-2xl sm:text-3xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Three steps. Full visibility.
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                step: "01",
                icon: Scan,
                title: "Add a Store",
                desc: "Enter any Shopify store URL. We crawl every product page and extract structured data automatically.",
              },
              {
                step: "02",
                icon: Bell,
                title: "Set Alerts",
                desc: "Configure price thresholds, stock changes, and new product notifications. Get notified instantly.",
              },
              {
                step: "03",
                icon: BarChart3,
                title: "Analyze & Act",
                desc: "View dashboards, compare competitor pricing, and generate AI content to stay ahead.",
              },
            ].map((s) => (
              <div
                key={s.step}
                className="p-5 border-2 relative"
                style={{
                  backgroundColor: "var(--card)",
                  borderColor: "var(--border)",
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
        <section className="max-w-5xl mx-auto px-6 pb-24">
          <div
            className="p-8 sm:p-12 border-2 text-center relative overflow-hidden"
            style={{
              backgroundColor: "var(--card)",
              borderColor: "rgba(202,255,4,0.3)",
            }}
          >
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] blur-[150px] pointer-events-none"
              style={{ backgroundColor: "#CAFF04", opacity: 0.06 }}
            />
            <div className="relative z-10">
              <Zap
                className="w-6 h-6 mx-auto mb-4"
                style={{ color: "#CAFF04" }}
              />
              <h2
                className="text-2xl sm:text-3xl font-bold tracking-tight mb-3"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Ready to start monitoring?
              </h2>
              <p
                className="text-sm mb-6 max-w-md mx-auto"
                style={{ color: "var(--muted-foreground)" }}
              >
                Set up your first store scrape in under a minute.
                No credit card required.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-wider border-2 transition-all duration-150 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none bg-primary text-primary-foreground border-primary shadow-[4px_4px_0px] shadow-primary"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                Get Started Free
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* ─── Footer ─── */}
        <footer
          className="border-t py-8"
          style={{ borderColor: "var(--border)" }}
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
              &copy; 2023-2024 Selecdoo. All rights reserved.
            </p>
            <p
              className="text-[10px] tracking-wider"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--muted-foreground)",
                opacity: 0.35,
              }}
            >
              Made with{" "}
              <span style={{ color: "#FF453A", opacity: 1 }}>&hearts;</span>
              {" "}by the Selecdoo Team
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
