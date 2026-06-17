export default function WelcomeCard() {
  return (
    <div className="welcome-card">

      <div className="welcome-top">

        <div>
          <p className="welcome-greeting">
            Good Morning 👋
          </p>

          <h1 className="cube-balance">
            12,450.32
          </h1>

          <span className="cube-unit">
            CUBE
          </span>
        </div>

      </div>

      <div className="mining-status">

        <span className="status-dot" />

        Mining Active

      </div>

      <div className="earning-rate">

        +4.5 CUBE / Hour

      </div>

      <button className="claim-btn">
        Claim Reward
      </button>

    </div>
  );
}