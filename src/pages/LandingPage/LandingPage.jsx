import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  Bot,
  Check,
  Cpu,
  Database,
  Menu,
  Network,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import "./LandingPage.css";

const plans = [
  {
    name: "Basic",
    price: "$100",
    number: "01",
    icon: Cpu,
    title: "Rent out your GPU for AI computing",
    description:
      "Connect eligible GPU hardware to a decentralized computing network. AI users can run workloads on available resources, and providers may earn when jobs are completed.",
    earning: "Payments for completed computing jobs and tool usage.",
    detail:
      "Account for electricity, hardware wear, maintenance, and platform costs. Workload demand and earnings can vary.",
  },
  {
    name: "Essential",
    price: "$300",
    number: "02",
    icon: Network,
    title: "Participate in Bittensor AI subnets",
    description:
      "Subnet miners provide AI services such as model inference, data processing, answers, or predictions. Subnets evaluate the work and may distribute rewards in TAO.",
    earning: "Potential TAO rewards for useful, well-scored subnet contributions.",
    detail:
      "Subnet rules, hardware, technical skills, and tokens required for registration vary. Stockblock AI can help coordinate setup and operations; rewards are not guaranteed.",
  },
  {
    name: "Standard",
    price: "$500",
    number: "03",
    icon: Network,
    title: "Contribute computing power to AI networks",
    description:
      "Eligible GPU providers can serve inference or training workloads across decentralized AI networks.",
    earning: "Rewards or payments for processing eligible workloads.",
    detail:
      "Workloads depend on network demand, hardware eligibility, and each network's payment rules. Stockblock AI helps manage workload delivery.",
  },
  {
    name: "Premium",
    price: "$1,000",
    number: "04",
    icon: Database,
    title: "Complete AI data and specialized tasks",
    description:
      "Support projects that need data processing, model evaluation, testing, or other specialized technical contributions.",
    earning: "Project-specific direct payments or token-based rewards.",
    detail:
      "Eligibility and compensation are set by each project. This route may need less GPU capacity, but can require tools, integrations, and specialized work.",
  },
  {
    name: "Enterprise",
    price: "$10,000",
    number: "05",
    icon: Bot,
    title: "Build AI agents for recurring revenue",
    description:
      "Develop AI-powered systems for useful business work, such as customer support, lead generation, report preparation, or content creation.",
    earning: "Possible income from subscriptions, usage fees, or service contracts.",
    detail:
      "Joint or group plan. Revenue depends on customer demand, delivery, operating costs, and contract terms; it is not assured.",
  },
];

const steps = [
  {
    number: "01",
    title: "Choose a way to contribute",
    copy: "Compare plan requirements, resources, and risks before deciding which AI opportunity fits you.",
  },
  {
    number: "02",
    title: "Set up with Stockblock AI",
    copy: "Get support connecting eligible hardware, services, data tools, or an AI agent to its project or network.",
  },
  {
    number: "03",
    title: "Deliver useful work",
    copy: "Networks and customers determine eligibility, workload demand, scoring, and compensation.",
  },
];

function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <main className="landing">
      <header className="landing-header">
        <div className="landing-nav-wrap">
          <Link className="landing-brand" to="/" aria-label="Stockblock AI home" onClick={closeMenu}>
            <span className="landing-brand-mark" aria-hidden="true">S</span>
            <span>STOCKBLOCK <span>AI</span></span>
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
            <a href="#plans" onClick={closeMenu}>Plans</a>
            <a href="#how-it-works" onClick={closeMenu}>How it works</a>
            <a href="#risk-note" onClick={closeMenu}>Risks</a>
            <Link className="landing-nav-login" to="/login?tab=login" onClick={closeMenu}>Log in</Link>
            <Link className="landing-nav-cta" to="/login?tab=signup" onClick={closeMenu}>
              Get started <ArrowRight size={16} />
            </Link>
          </nav>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-grid" aria-hidden="true" />
        <div className="landing-hero-inner">
          <div className="landing-hero-copy">
            <div className="landing-eyebrow"><span /> AI WORK, MADE ACCESSIBLE</div>
            <h1>Turn AI work into <span>opportunity.</span></h1>
            <p className="landing-hero-description">
              Stockblock AI connects computing power, AI services, and specialized work
              with decentralized networks and real business needs.
            </p>
            <div className="landing-hero-actions">
              <a className="landing-button landing-button-primary" href="#plans">
                Explore available plans <ArrowRight size={18} />
              </a>
              <a className="landing-text-link" href="#how-it-works">
                How it works <ArrowDown size={16} />
              </a>
            </div>
            <div className="landing-trust-line">
              <span className="landing-trust-icon"><ShieldAlert size={17} /></span>
              Understand the costs and risks before you invest
            </div>
          </div>

          <div className="landing-hero-visual" aria-label="Stockblock AI workflow illustration">
            <div className="landing-visual-glow" />
            <div className="landing-visual-orbit landing-visual-orbit-one" />
            <div className="landing-visual-orbit landing-visual-orbit-two" />
            <div className="landing-workflow-card">
              <div className="landing-workflow-heading">
                <span className="landing-workflow-icon"><Sparkles size={19} /></span>
                <span><strong>AI contribution network</strong><small>Work routed to useful outcomes</small></span>
              </div>
              <div className="landing-workflow-row">
                <span className="landing-workflow-node"><Cpu size={17} /></span>
                <span><strong>Computing power</strong><small>GPU workloads</small></span>
                <ArrowRight size={16} />
              </div>
              <div className="landing-workflow-row">
                <span className="landing-workflow-node"><Database size={17} /></span>
                <span><strong>Data &amp; AI services</strong><small>Specialized tasks</small></span>
                <ArrowRight size={16} />
              </div>
              <div className="landing-workflow-row">
                <span className="landing-workflow-node"><Bot size={17} /></span>
                <span><strong>AI agents</strong><small>Business applications</small></span>
                <Check size={16} />
              </div>
              <div className="landing-workflow-foot"><span /> Outcomes depend on demand and eligibility</div>
            </div>
            <div className="landing-float-card landing-float-top">
              <span className="landing-float-icon"><Network size={17} /></span>
              <span><strong>Decentralized AI</strong><small>Multiple ways to contribute</small></span>
            </div>
            <div className="landing-float-card landing-float-bottom">
              <span className="landing-check-icon"><Check size={17} /></span>
              <span><strong>Clear plan options</strong><small>Choose what fits your setup</small></span>
            </div>
          </div>
        </div>
        <div className="landing-hero-bottom">
          <span>WAYS TO PARTICIPATE</span>
          <div><span>GPU COMPUTE</span><b /><span>AI NETWORKS</span><b /><span>DATA TASKS</span><b /><span>AI AGENTS</span></div>
        </div>
      </section>

      <section className="landing-plans landing-section" id="plans">
        <div className="landing-section-heading">
          <div>
            <div className="landing-eyebrow"><span /> AVAILABLE PLANS FOR INVESTORS</div>
            <h2>Find your AI<br /><span>workstream.</span></h2>
          </div>
          <p>Each plan supports a different kind of AI contribution. Review the requirements and potential costs—not just the entry amount.</p>
        </div>
        <div className="landing-plan-grid">
          {plans.map(({ name, price, number, icon: Icon, title, description, earning, detail }) => (
            <article className={`landing-plan-card${name === "Enterprise" ? " landing-plan-enterprise" : ""}`} key={name}>
              <div className="landing-plan-top">
                <span className="landing-plan-number">{number} / {name}</span>
                <span className="landing-plan-icon"><Icon size={20} strokeWidth={1.8} /></span>
              </div>
              <div className="landing-plan-price">{price}<small> plan entry</small></div>
              <h3>{title}</h3>
              <p className="landing-plan-description">{description}</p>
              <div className="landing-plan-earning">
                <span>HOW YOU MAY EARN</span>
                <p>{earning}</p>
              </div>
              <p className="landing-plan-detail">{detail}</p>
              <Link className="landing-plan-link" to="/login?tab=signup">
                Get started <ArrowRight size={16} />
              </Link>
            </article>
          ))}
        </div>
        <div className="landing-risk-note" id="risk-note">
          <ShieldAlert size={21} />
          <p><strong>Important:</strong> Plan entry amounts are not guaranteed returns. Earnings, token rewards, and revenue are uncertain and may be zero. Results depend on demand, eligibility, network or project rules, performance, operating costs, and third-party terms. Consider these factors and your ability to bear losses before participating.</p>
        </div>
      </section>

      <section className="landing-how landing-section" id="how-it-works">
        <div className="landing-how-intro">
          <div className="landing-eyebrow"><span /> HOW STOCKBLOCK AI WORKS</div>
          <h2>From resources<br />to <span>real work.</span></h2>
          <p>Stockblock AI helps coordinate the setup and delivery. The network, project, or customer sets the rules for whether work qualifies and how it is compensated.</p>
          <Link className="landing-button landing-button-outline" to="/login?tab=signup">
            Explore participation <ArrowRight size={17} />
          </Link>
        </div>
        <div className="landing-steps">
          {steps.map(({ number, title, copy }, index) => (
            <article className="landing-step" key={number}>
              <div className="landing-step-index">{number}</div>
              <div><h3>{title}</h3><p>{copy}</p></div>
              {index < steps.length - 1 && <div className="landing-step-line" aria-hidden="true" />}
            </article>
          ))}
        </div>
      </section>

      <section className="landing-cta-band">
        <div className="landing-cta-mark" aria-hidden="true"><Sparkles size={25} /></div>
        <div>
          <div className="landing-eyebrow"><span /> EXPLORE STOCKBLOCK AI</div>
          <h2>Choose your next step.</h2>
          <p>Review the plan details and decide whether the requirements fit you.</p>
        </div>
        <Link className="landing-button landing-button-primary" to="/login?tab=signup">
          Get started <ArrowRight size={18} />
        </Link>
      </section>

      <footer className="landing-footer">
        <Link className="landing-brand landing-footer-brand" to="/" aria-label="Stockblock AI home">
          <span className="landing-brand-mark" aria-hidden="true">S</span>
          <span>STOCKBLOCK <span>AI</span></span>
        </Link>
        <p>Participation involves risk. Earnings and rewards are not guaranteed.</p>
        <span className="landing-copyright">© {new Date().getFullYear()} Stockblock AI</span>
      </footer>
    </main>
  );
}

export default LandingPage;
