import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  Check,
  ChevronRight,
  Gift,
  Menu,
  Pickaxe,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import "./LandingPage.css";
import cubeCoinLogo from "../../assets/STOCK AI.png";

const features = [
  {
    icon: Pickaxe,
    number: "01",
    title: "Mining, made simple",
    copy: "Start and keep track of your mining sessions from one clear dashboard.",
  },
  {
    icon: Gift,
    number: "02",
    title: "More ways to earn",
    copy: "Take on daily tasks, build a streak, and explore rewards at your pace.",
  },
  {
    icon: Users,
    number: "03",
    title: "Grow together",
    copy: "Invite friends, follow your referrals, and see your activity in one place.",
  },
];

const steps = [
  ["Create your account", "Sign up in a few steps and set up your Stockblock profile."],
  ["Explore the platform", "Choose from mining sessions, tasks, streaks, and referrals."],
  ["Track your progress", "Check your activity and available rewards from your dashboard."],
];

function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <main className="landing">
      <header className="landing-header">
        <div className="landing-nav-wrap">
          <Link className="landing-brand" to="/" aria-label="Cube Coin home" onClick={closeMenu}>
            <img src={cubeCoinLogo} alt="" />
            <span>Stockblock<span>AI</span></span>
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
            <a href="#about" onClick={closeMenu}>About</a>
            <Link className="landing-nav-login" to="/login?tab=login" onClick={closeMenu}>Log in</Link>
            <Link className="landing-nav-cta" to="/login?tab=signup" onClick={closeMenu}>
              Get started <ArrowRight size={16} />
            </Link>
          </nav>
        </div>
      </header>

      <section className="landing-hero" id="about">
        <div className="landing-hero-grid" aria-hidden="true" />
        <div className="landing-hero-inner">
          <div className="landing-hero-copy">
            <div className="landing-eyebrow"><span /> YOUR NEXT MOVE STARTS HERE</div>
            <h1>Make your time<br />count with <span>Stockblock AI.</span></h1>
            <p className="landing-hero-description">
              Discover a smarter approach to AI-powered investing.
              Explore emerging opportunities, track your investment progress, and leverage
              artificial intelligence to make more informed decisions, all from one intuitive platform.
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
              Your progress, all in one place
            </div>
          </div>

          <div className="landing-hero-visual" aria-label="Cube Coin brand artwork">
            <div className="landing-visual-glow" />
            <div className="landing-visual-orbit landing-visual-orbit-one" />
            <div className="landing-visual-orbit landing-visual-orbit-two" />
            <div className="landing-art-card">
              <img src={cubeCoinLogo} alt="Cube Coin" />
            </div>
            <div className="landing-float-card landing-float-top">
              <span className="landing-float-icon"><Sparkles size={17} /></span>
              <span><strong>Your next goal</strong><small>One step at a time</small></span>
              <ChevronRight size={17} />
            </div>
            <div className="landing-float-card landing-float-bottom">
              <span className="landing-check-icon"><Check size={17} /></span>
              <span><strong>Progress that adds up</strong><small>Keep showing up</small></span>
            </div>
            <div className="landing-visual-caption">MINE SMART <i /> EARN CONSISTENT <i /> STAY IN CONTROL</div>
          </div>
        </div>
        <div className="landing-hero-bottom">
          <span>BUILT FOR YOUR EVERYDAY MOMENTUM</span>
          <div><span>MINING</span><b /> <span>DAILY TASKS</span><b /> <span>REWARDS</span><b /> <span>REFERRALS</span></div>
        </div>
      </section>

      <section className="landing-features landing-section" id="features">
        <div className="landing-section-heading">
          <div>
            <div className="landing-eyebrow"><span /> THE AI EXPERIENCE</div>
            <h2>Small actions.<br /><span>Real momentum.</span></h2>
          </div>
          <p>Everything you need to stay active, discover new ways to participate, and follow your progress.</p>
        </div>
        <div className="landing-feature-grid">
          {features.map(({ icon: Icon, number, title, copy }) => (
            <article className="landing-feature-card" key={number}>
              <div className="landing-feature-top"><span>{number}</span><Icon size={21} strokeWidth={1.7} /></div>
              <h3>{title}</h3>
              <p>{copy}</p>
              <a href="#how-it-works" aria-label={`Learn how ${title.toLowerCase()} works`}>
                Explore <ArrowRight size={15} />
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-how landing-section" id="how-it-works">
        <div className="landing-how-intro">
          <div className="landing-eyebrow"><span /> GET STARTED IN THREE STEPS</div>
          <h2>Simple from<br />the <span>first click.</span></h2>
          <p>No complicated setup. Just a straightforward place to explore Stockblock AI and follow your activity.</p>
          <Link className="landing-button landing-button-outline" to="/login?tab=signup">
            Get started <ArrowRight size={17} />
          </Link>
        </div>
        <div className="landing-steps">
          {steps.map(([title, copy], index) => (
            <article className="landing-step" key={title}>
              <div className="landing-step-index">0{index + 1}</div>
              <div><h3>{title}</h3><p>{copy}</p></div>
              {index < steps.length - 1 && <div className="landing-step-line" aria-hidden="true" />}
            </article>
          ))}
        </div>
      </section>

      <section className="landing-cta-band">
        <div className="landing-cta-mark"><img src={cubeCoinLogo} alt="" /></div>
        <div>
          <div className="landing-eyebrow"><span /> YOUR AI INVESTMENT JOURNEY</div>
          <h2>Ready to make a move?</h2>
          <p>Start exploring the AI experience today.</p>
        </div>
        <Link className="landing-button landing-button-primary" to="/login?tab=signup">
          Join Stockblock AI <ArrowRight size={18} />
        </Link>
      </section>

      <footer className="landing-footer">
        <Link className="landing-brand landing-footer-brand" to="/" aria-label="Cube Coin home">
          <img src={cubeCoinLogo} alt="" />
          <span>Stockblock<span>AI</span></span>
        </Link>
        <p>Invest in AI at your own pace. AI investment returns are not guaranteed, and market values may fluctuate.</p>
        <span className="landing-copyright">© {new Date().getFullYear()} Stockblock AI</span>
      </footer>
    </main>
  );
}

export default LandingPage;
