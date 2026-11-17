import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  Check,
  ChevronRight,
  Flame,
  Gift,
  Menu,
  Pickaxe,
  Plus,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  Zap,
} from "lucide-react";
import "./LandingPage.css";
import cubeCoinLogo from "../../assets/cube-coin-logo.png";

const features = [
  {
    icon: Pickaxe,
    number: "01",
    title: "Mine CUBE every day",
    copy: "Start a 24-hour session in one tap. Your plan sets your rate, from 1,250 up to 8,166 CUBE per hour, and you can follow it live.",
    size: "large",
  },
  {
    icon: Gift,
    number: "02",
    title: "Daily task rewards",
    copy: "Share CubeCoin on WhatsApp, upload your proof, and earn 60,000 CUBE (≈ ₦3,000) once it's approved. Keep your streak going.",
  },
  {
    icon: Users,
    number: "03",
    title: "Grow with referrals",
    copy: "Invite friends with your referral code and earn a +10% bonus when they subscribe. Track every referral from your dashboard.",
  },
];

const steps = [
  ["Create your account", "Sign up, complete your profile, and get your personal referral code."],
  ["Pick a plan and mine", "Choose Basic, Starter, Bronze, Silver, Gold or Diamond, then start your 24-hour mining session."],
  ["Claim and cash out", "Claim your CUBE to your wallet, see its Naira value, and request a bank withdrawal on withdrawal days."],
];

const ticker = ["MINING", "DAILY TASKS", "STREAKS", "REFERRALS", "NAIRA VALUE", "BANK CASHOUT"];

const faqs = [
  [
    "What is Cube Coin?",
    "Cube Coin is a mining and rewards platform for Nigerian users. You run mining sessions based on your plan, complete daily tasks, build streaks, earn from referrals, and cash out to your bank account from one dashboard.",
  ],
  [
    "How much is CUBE worth in Naira?",
    "The current wallet rate is 100 CUBE = ₦5 (1 CUBE = ₦0.05). Your dashboard and wallet show the Naira value of your balance, your claimable mining reward and your daily task reward.",
  ],
  [
    "How do I get started?",
    "Create your account, complete your profile, choose a mining plan, and start your first 24-hour session. You can also begin the daily task and share your referral code right away.",
  ],
  [
    "How does the daily task work?",
    "Post CubeCoin to your WhatsApp Status, share it to 5 groups and 5 friends, then upload one screenshot as proof. Once it's reviewed and approved, 60,000 CUBE (≈ ₦3,000) is credited to your wallet.",
  ],
  [
    "How do withdrawals work?",
    "Request a cashout to your Nigerian bank account on withdrawal days. Each plan has a weekly withdrawal limit, and withdrawal requests are reviewed before payout.",
  ],
  [
    "Are rewards guaranteed?",
    "Rewards earned from your mining activity and completed tasks are based on the actual work done and your active plan. While valid earned rewards are tied to your activity, rules, rates and platform terms can change over time, so always take part at a level you're comfortable with.",
  ],
];

function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const rootRef = useRef(null);

  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const items = root.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) return undefined;

    root.classList.add("landing-js");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -6% 0px" }
    );
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  return (
    <main className="landing" ref={rootRef}>
      <header className={`landing-header${scrolled ? " is-scrolled" : ""}`}>
        <div className="landing-nav-wrap">
          <Link className="landing-brand" to="/" aria-label="Cube Coin home" onClick={closeMenu}>
            <img src={cubeCoinLogo} alt="" />
            <span>cube<span>coin</span></span>
          </Link>

          <button
            className="landing-menu-toggle"
            type="button"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <nav className={`landing-nav${menuOpen ? " is-open" : ""}`} aria-label="Main navigation">
            <a href="#features" onClick={closeMenu}>Features</a>
            <a href="#how-it-works" onClick={closeMenu}>How it works</a>
            <a href="#faq" onClick={closeMenu}>FAQ</a>
            <Link className="landing-nav-login" to="/login?tab=login" onClick={closeMenu}>Log in</Link>
            <Link className="landing-nav-cta" to="/login?tab=signup" onClick={closeMenu}>
              Get started <ArrowRight size={16} />
            </Link>
          </nav>
        </div>
      </header>

      <section className="landing-hero" id="about">
        <div className="landing-hero-grid" aria-hidden="true" />
        <div className="landing-hero-aurora" aria-hidden="true" />
        <div className="landing-hero-inner">
          <div className="landing-hero-copy">
            <div className="landing-pill">
              <span className="landing-pill-dot" /> Mine · Earn · Cash out
            </div>
            <h1>
              Mine CUBE.
              <br />
              <span>Cash out in Naira.</span>
            </h1>
            <p className="landing-hero-description">
              Run daily mining sessions, complete the WhatsApp share task for
              60,000 CUBE, keep your streak alive and invite your friends.
              100 CUBE = ₦5, withdrawn straight to your Nigerian bank account.
            </p>
            <div className="landing-hero-actions">
              <Link className="landing-button landing-button-primary" to="/login?tab=signup">
                Create your account <ArrowRight size={18} />
              </Link>
              <a className="landing-text-link" href="#how-it-works">
                See how it works <ArrowDown size={16} />
              </a>
            </div>
            <div className="landing-trust-line">
              <span className="landing-trust-icon"><ShieldCheck size={17} /></span>
              Every withdrawal is reviewed before payout
            </div>
          </div>

          <div className="landing-hero-visual" aria-label="Cube Coin dashboard preview">
            <div className="landing-visual-glow" />
            <div className="landing-device">
              <div className="landing-device-bar">
                <img src={cubeCoinLogo} alt="Cube Coin" />
                <span>Dashboard</span>
                <em>Preview</em>
              </div>

              <div className="landing-device-body">
                <div className="landing-mine">
                  <div className="landing-ring" style={{ "--p": "68%" }}>
                    <div className="landing-ring-core">
                      <Pickaxe size={22} strokeWidth={1.8} />
                    </div>
                  </div>
                  <div className="landing-mine-info">
                    <small>MINING SESSION</small>
                    <strong>Active</strong>
                    <span><i /> Earning CUBE</span>
                  </div>
                </div>

                <div className="landing-streak">
                  <div className="landing-streak-head">
                    <span><Flame size={15} /> Daily streak</span>
                    <small>Don't break the chain</small>
                  </div>
                  <div className="landing-streak-days">
                    {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                      <span key={d + i} className={i < 5 ? "is-done" : i === 5 ? "is-today" : ""}>
                        {i < 5 ? <Check size={13} strokeWidth={3} /> : d}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="landing-task-row">
                  <span className="landing-task-icon"><Zap size={15} /></span>
                  <span><strong>Daily task</strong><small>+60,000 CUBE · ≈ ₦3,000</small></span>
                  <ChevronRight size={16} />
                </div>
              </div>
            </div>

            <div className="landing-float-card landing-float-top">
              <span className="landing-float-icon"><Sparkles size={17} /></span>
              <span><strong>100 CUBE = ₦5</strong><small>See your Naira value</small></span>
            </div>
            <div className="landing-float-card landing-float-bottom">
              <span className="landing-float-icon"><Users size={17} /></span>
              <span><strong>Referrals</strong><small>+10% bonus on subscribers</small></span>
            </div>
          </div>
        </div>
      </section>

      <div className="landing-ticker" aria-hidden="true">
        <div className="landing-ticker-track">
          {[...ticker, ...ticker, ...ticker, ...ticker].map((word, i) => (
            <span key={word + i}>{word}<b /></span>
          ))}
        </div>
      </div>

      <section className="landing-features landing-section" id="features">
        <div className="landing-section-heading reveal">
          <div>
            <div className="landing-eyebrow"><span /> THE CUBE COIN EXPERIENCE</div>
            <h2>Small actions.<br /><span>Real momentum.</span></h2>
          </div>
          <p>Mine, complete tasks and refer friends, then watch your CUBE balance and its Naira value grow in one place.</p>
        </div>

        <div className="landing-feature-grid">
          {features.map(({ icon: Icon, number, title, copy, size }, i) => (
            <article
              className={`landing-feature-card reveal${size === "large" ? " is-large" : ""}`}
              style={{ "--d": `${i * 90}ms` }}
              key={number}
            >
              <div className="landing-feature-top">
                <span>{number}</span>
                <span className="landing-feature-icon"><Icon size={21} strokeWidth={1.7} /></span>
              </div>
              <h3>{title}</h3>
              <p>{copy}</p>
              {size === "large" && (
                <div className="landing-feature-bars" aria-hidden="true">
                  {[38, 56, 44, 72, 60, 88, 76].map((h, idx) => (
                    <i key={idx} style={{ "--h": `${h}%`, "--i": idx }} />
                  ))}
                </div>
              )}
              <a href="#how-it-works" aria-label={`Learn how ${title.toLowerCase()} works`}>
                Explore <ArrowRight size={15} />
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-how landing-section" id="how-it-works">
        <div className="landing-how-intro reveal">
          <div className="landing-eyebrow"><span /> GET STARTED IN THREE STEPS</div>
          <h2>From sign-up<br />to <span>bank alert.</span></h2>
          <p>A clear path from your first mining session to your first withdrawal, with your Naira value visible the whole way.</p>
          <Link className="landing-button landing-button-outline" to="/login?tab=signup">
            Get started <ArrowRight size={17} />
          </Link>
        </div>
        <div className="landing-steps">
          {steps.map(([title, copy], index) => (
            <article
              className="landing-step reveal"
              style={{ "--d": `${index * 110}ms` }}
              key={title}
            >
              <div className="landing-step-index">0{index + 1}</div>
              <div><h3>{title}</h3><p>{copy}</p></div>
              {index < steps.length - 1 && <div className="landing-step-line" aria-hidden="true" />}
            </article>
          ))}
        </div>
      </section>

      <section className="landing-faq landing-section" id="faq">
        <div className="landing-faq-head reveal">
          <div className="landing-eyebrow"><span /> GOOD TO KNOW</div>
          <h2>Quick <span>answers.</span></h2>
        </div>
        <div className="landing-faq-list">
          {faqs.map(([q, a], i) => (
            <details className="landing-faq-item reveal" style={{ "--d": `${i * 80}ms` }} key={q}>
              <summary>
                {q}
                <Plus size={18} />
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="landing-cta-band reveal">
        <div className="landing-cta-mark"><img src={cubeCoinLogo} alt="" /></div>
        <div>
          <div className="landing-eyebrow"><span /> YOUR CUBE COIN JOURNEY</div>
          <h2>Ready to start mining?</h2>
          <p>Create your account, pick a plan and run your first session today.</p>
        </div>
        <Link className="landing-button landing-button-primary" to="/login?tab=signup">
          Join Cube Coin <ArrowRight size={18} />
        </Link>
      </section>

      <footer className="landing-footer">
        <Link className="landing-brand landing-footer-brand" to="/" aria-label="Cube Coin home">
          <img src={cubeCoinLogo} alt="" />
          <span>cube<span>coin</span></span>
        </Link>
        <p>Rewards depend on your plan and activity. Digital rewards and token values are not guaranteed.</p>
        <span className="landing-copyright">© {new Date().getFullYear()} Cube Coin</span>
      </footer>
    </main>
  );
}

export default LandingPage;