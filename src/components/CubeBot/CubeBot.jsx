import { useState, useEffect, useRef } from "react";
import { supabase } from "../../libs/supabase";
import { useLocation } from "react-router-dom";
import "./CubeBot.css";

const KB = [
  {
    keys: ["hello","hi","hey","start","help","what can","who are you"],
    reply: "Hey there! 👋 I'm **CubeBot**, your CubeCoin mining assistant. I can help you with:\n\n• How mining works\n• Subscription plans\n• Withdrawals & wallet\n• Referrals & bonuses\n• Streak rewards\n\nWhat would you like to know?",
    chips: ["How do I mine?","Subscription plans","How to withdraw?","Referral program"],
  },
  {
    keys: ["mine","mining","how to mine","start mining","pickaxe","earn cube"],
    reply: "⛏ **How Mining Works:**\n\n1. Go to the **Mining page** from your dashboard\n2. Tap **Start Mining** — your session begins\n3. Mining runs based on your plan's rate (e.g. 0.40 CUBE/hr)\n4. You can **Pause** and **Resume** anytime\n5. When done, tap **Claim** to add earned CUBE to your wallet\n\nYour CUBE accumulates in real time — the longer you mine, the more you earn! 🚀",
    chips: ["What are the rates?","Can I pause mining?","How to claim?"],
  },
{
  keys: ["rate","cube per hour","mining rate","how fast","daily","earn per day","naira daily"],
  reply: "📊 **Mining Rates & Daily Earnings:**\n\n🟢 Basic → **30,000 CUBE/day** (₦1,500 value)\n⬡ Starter → **60,000 CUBE/day** (₦3,000 value)\n🥉 Bronze → **90,000 CUBE/day** (₦4,500 value)\n🥈 Silver → **120,000 CUBE/day** (₦6,000 value)\n🥇 Gold → **150,000 CUBE/day** (₦7,500 value)\n💎 Diamond → **196,000 CUBE/day** (₦9,800 value)\n\n📌 Exchange rate: 1 CUBE = ₦0.05 (100 CUBE = ₦5)\nAll sessions run 24 hours — claim daily to keep earning!",
  chips: ["What does Silver cost?","How to cash out?","Upgrade my plan"],
},
{
  keys: ["plan","subscription","starter","bronze","silver","gold","diamond","basic","cost","price","upgrade"],
  reply: "💳 **Subscription Plans:**\n\n🆕 **Basic** — ₦5,600 → 20,000 CUBE bonus\n⬡ **Starter** — ₦10,600 → 50,000 CUBE bonus\n🥉 **Bronze** — ₦16,200 → 100,000 CUBE bonus\n🥈 **Silver** — ₦22,500 → 200,000 CUBE bonus ⭐\n🥇 **Gold** — ₦30,350 → 250,000 CUBE bonus\n💎 **Diamond** — ₦50,000 → 300,000 CUBE bonus\n\nEach plan is a **one-time payment** with a big CUBE bonus on activation!",
  chips: ["How to subscribe?","How do I pay?","Mining rates","What's the best plan?"],
},
  {
    keys: ["pay","payment","bank","transfer","how to pay","receipt","moniepoint"],
    reply: "🏦 **How to Pay:**\n\n1. Choose your plan on the Subscription page\n2. Transfer to:\n   • **Bank:** Moniepoint  Nigeria\n   • **Name:** Mara's Treat\n   • **Account:** 7077456282\n3. Upload your payment **receipt**\n4. Admin verifies within **1–3 hours**\n\n⚠️ Use your phone/email as narration so we can identify you.",
    chips: ["How long does activation take?","Subscription plans"],
  },
  {
    keys: ["activate","activation","how long","pending","approved","verify"],
    reply: "⏱ **Plan Activation:**\n\nAfter submitting your receipt, our admin verifies and activates your plan within **1–3 hours**.\n\nYou'll be redirected to your dashboard once approved. Check the **Subscription Status** page anytime.",
    chips: ["How to contact support?","What happens on activation?"],
  },
  {
    keys: ["withdraw","cashout","cash out","withdrawal","naira","convert","wallet"],
    reply: "💸 **How to Cash Out:**\n\n1. Go to your **Wallet** page\n2. Tap **Cash Out**\n3. Enter CUBE amount (min. **100 CUBE**)\n4. Enter your bank details\n5. Submit — processed within **1–24 hours**\n\n💱 Rate: **100 CUBE = ₦5.00**",
    chips: ["Minimum withdrawal?","What's the exchange rate?"],
  },
  {
    keys: ["exchange","naira","ngn","100 cube","worth","value"],
    reply: "💱 **CUBE Exchange Rate:**\n\n**100 CUBE = ₦5.00** (1 CUBE = ₦0.05)\n\nExamples:\n• 1,000 CUBE = ₦50\n• 10,000 CUBE = ₦500\n• 100,000 CUBE = ₦5,000",
    chips: ["How to cash out?","How to earn more CUBE?"],
  },
  {
  keys: ["referral","refer","invite","code","friend","bonus","earn"],
  reply: "👥 **Referral Program:**\n\nShare your unique code. When a friend subscribes to any plan using your code, they count as an **active referral**.\n\n🎯 **Milestone Rewards (subscribed users only):**\n• 5 subscribers → **5,000 CUBE**\n• 10 subscribers → **10,000 CUBE**\n• 25 subscribers → **25,000 CUBE**\n• 50 subscribers → **50,000 CUBE**\n\n⚠️ Just signing up doesn't count — your friend must **subscribe to a plan** to unlock your bonus.\n\nBonuses are auto-credited the moment a milestone is reached! 🚀",
  chips: ["Where is my referral code?","Withdrawal requirement","How to share?"],
},
  {
    keys: ["streak","daily","check in","checkin","consecutive","fire"],
    reply: "🔥 **Streak Bonuses:**\n\n• 7 days → 100 CUBE + 10% boost\n• 14 days → 250 CUBE + 20% boost\n• 30 days → 1,000 CUBE + 40% boost\n• 60 days → VIP + 60% boost\n• 100 days → Legendary + 100% boost\n\nDon't miss a day — missing resets your streak! 😅",
    chips: ["How to check in?","Referral program"],
  },
  {
    keys: ["pause","resume","stop","session","paused"],
    reply: "⏸ **Pausing Mining:**\n\n• **Pause** — stops timer, no CUBE earned while paused\n• **Resume** — continues from where you left off\n• **Claim** — adds all earned CUBE to your wallet\n\nOnly active mining time counts toward earnings.",
    chips: ["How to claim?","Mining rates"],
  },
  {
    keys: ["claim","reward","collect","add to wallet"],
    reply: "🎉 **How to Claim:**\n\nTap **Claim Reward** on your Dashboard or Mining page to:\n✅ Add earned CUBE to your wallet\n✅ Log the transaction\n✅ Increment your streak\n\nClaiming ends the current session — start a new one to keep mining!",
    chips: ["How to start mining?","What's my balance?"],
  },
  {
    keys: ["spin","wheel","daily spin","prize","airtime","data","task"],
    reply: "🎡 **Daily Spin Wheel:**\n\nVisit the **Daily Spin** page once per day! Prizes:\n\n• ⬡ CUBE (25, 50, 75, 100, 200, 500)\n• 📱 Airtime (₦100, ₦200)\n• 📶 Data (1GB, 5GB, 10GB, 20GB)\n\nCUBE prizes are added instantly. For airtime/data — contact support to redeem!",
    chips: ["How to get more CUBE?","Contact support"],
  },
  {
    keys: ["support","contact","problem","issue","not working","error"],
    reply: "🛠 **Need Support?**\n\n1. **Payment not verified** → Wait 1–3 hrs then contact us\n2. **Mining not working** → Check your subscription status\n3. **Can't withdraw** → Ensure you have 100+ CUBE\n4. **Referral not working** → Code format should be CUBE-XXXXXX\n\nContact the admin team through official channels. We're here! 💚",
    chips: ["Payment issues","Mining issues","Withdrawal issues"],
  },
  {
    keys: ["best plan","recommend","which plan","suggest"],
    reply: "🌟 **Best Plan for You:**\n\n• **Starting out?** → Starter (₦10,600)\n• **Best value?** → ⭐ Silver (₦22,500) — most popular!\n• **Maximum earnings?** → 💎 Diamond (₦50,000)\n\nSilver is the sweet spot — 0.40 CUBE/hr + 200K activation bonus!",
    chips: ["How to subscribe?","Mining rates"],
  },
  {
    keys: ["activation bonus","subscription cube","50k","100k","200k","300k"],
    reply: "🎁 **Activation Bonuses:**\n\nWhen your plan is approved you get:\n\n⬡ Starter → **50,000 CUBE**\n🥉 Bronze → **100,000 CUBE**\n🥈 Silver → **200,000 CUBE**\n🥇 Gold → **250,000 CUBE**\n💎 Diamond → **300,000 CUBE**\n\nCredited to your wallet automatically on approval!",
    chips: ["Mining rates","How to cash out?"],
  },
  {
    keys: ["balance","cube balance","how much","total"],
    reply: "💰 **Your CUBE Balance:**\n\nCheck your balance on:\n• **Dashboard** → Hero card (live balance)\n• **Wallet page** → Full history breakdown\n• **Mining page** → Live claimable amount\n\nGrows through mining, referrals, streaks, and bonuses!",
    chips: ["How to withdraw?","How to mine?"],
  },
];

const FALLBACKS = [
  "I'm not sure about that! 🤔 Try asking about mining, subscriptions, withdrawals, or referrals.",
  "Hmm, I don't have that info yet. I can help with CubeCoin mining, plans, wallet, and referrals!",
  "That's outside my knowledge for now! 💡 Ask me about mining rates, plans, or cashouts.",
];

function parseText(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br/>");
}

// ── Robot bot icon SVG ────────────────────────────────────────────────────────
function RobotIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Antenna */}
      <line x1="16" y1="2" x2="16" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="16" cy="2" r="1.5" fill="currentColor"/>
      {/* Head */}
      <rect x="6" y="7" width="20" height="14" rx="4" fill="currentColor" opacity="0.15"/>
      <rect x="6" y="7" width="20" height="14" rx="4" stroke="currentColor" strokeWidth="1.8"/>
      {/* Eyes */}
      <circle cx="12" cy="13" r="2.2" fill="currentColor"/>
      <circle cx="20" cy="13" r="2.2" fill="currentColor"/>
      <circle cx="12.8" cy="12.2" r=".7" fill="white"/>
      <circle cx="20.8" cy="12.2" r=".7" fill="white"/>
      {/* Mouth */}
      <path d="M11 17.5 Q16 20.5 21 17.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none"/>
      {/* Ears */}
      <rect x="3" y="11" width="3" height="5" rx="1.5" fill="currentColor" opacity="0.6"/>
      <rect x="26" y="11" width="3" height="5" rx="1.5" fill="currentColor" opacity="0.6"/>
      {/* Body */}
      <rect x="9" y="22" width="14" height="8" rx="3" fill="currentColor" opacity="0.15"/>
      <rect x="9" y="22" width="14" height="8" rx="3" stroke="currentColor" strokeWidth="1.8"/>
      {/* Body buttons */}
      <circle cx="13" cy="26" r="1.2" fill="currentColor" opacity="0.7"/>
      <circle cx="16" cy="26" r="1.2" fill="currentColor" opacity="0.7"/>
      <circle cx="19" cy="26" r="1.2" fill="currentColor" opacity="0.7"/>
      {/* Neck connector */}
      <rect x="14" y="20.5" width="4" height="2" rx="1" fill="currentColor" opacity="0.5"/>
    </svg>
  );
}

// ── User avatar — profile image or initials fallback ─────────────────────────
function UserAvatar({ profile }) {
  const [imgErr, setImgErr] = useState(false);

  if (profile?.avatar_url && !imgErr) {
    return (
      <img
        src={profile.avatar_url}
        alt="you"
        className="cubebot-msg-avatar cubebot-user-img"
        onError={() => setImgErr(true)}
      />
    );
  }

  // Dicebear fallback (same as dashboard)
  const seed = profile?.full_name || profile?.email || "user";
  const dicebear = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(seed)}`;

  return (
    <img
      src={dicebear}
      alt="you"
      className="cubebot-msg-avatar cubebot-user-img"
      onError={() => {}}
    />
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
    </svg>
  );
}

export default function CubeBot() {
  const [open,    setOpen]    = useState(false);
  const [msgs,    setMsgs]    = useState([]);
  const [input,   setInput]   = useState("");
  const [chips,   setChips]   = useState([]);
  const [typing,  setTyping]  = useState(false);
  const [notif,   setNotif]   = useState(false);
  const [greeted, setGreeted] = useState(false);
  const [profile, setProfile] = useState(null);
  const msgsRef  = useRef(null);
  const inputRef = useRef(null);
  const location = useLocation();
  
  // ── Fetch user profile for avatar ──────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, email, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (data) setProfile(data);
    };
    load();
  }, []);

  // ── Notification badge after 3s ────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => { if (!open) setNotif(true); }, 3000);
    return () => clearTimeout(t);
  }, []);

  // ── Auto scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (msgsRef.current) {
      msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
    }
  }, [msgs, typing]);


    const hiddenRoutes = [
        "/"
    ];

    if (hiddenRoutes.includes(location.pathname)) {
        return null;
    }

  const addMsg = (text, isBot) =>
    setMsgs(prev => [...prev, { text, isBot, id: Date.now() + Math.random() }]);

  const botReply = (text, nextChips) => {
    setTyping(true);
    setChips([]);
    setTimeout(() => {
      setTyping(false);
      addMsg(text, true);
      setChips(nextChips || []);
    }, 800 + Math.random() * 500);
  };

  const findAnswer = (q) => {
    const lower = q.toLowerCase();
    for (const entry of KB) {
      if (entry.keys.some(k => lower.includes(k))) return entry;
    }
    return null;
  };

  const processInput = (text) => {
    if (!text.trim()) return;
    addMsg(text, false);
    setInput("");
    setChips([]);
    const found = findAnswer(text);
    if (found) {
      botReply(found.reply, found.chips);
    } else {
      botReply(
        FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)],
        ["How do I mine?","Subscription plans","How to withdraw?","Referral program"]
      );
    }
  };

  const handleOpen = () => {
    setOpen(true);
    setNotif(false);
    if (!greeted) {
      setGreeted(true);
      const name = profile?.full_name?.split(" ")[0] || "there";
      setTimeout(() => {
        botReply(
          `Hey ${name}! 👋 I'm **CubeBot** — your CubeCoin assistant.\n\nHow can I help you today?`,
          ["How do I mine?","Subscription plans","How to withdraw?","Referral program","Daily spin wheel"]
        );
      }, 500);
    }
    setTimeout(() => inputRef.current?.focus(), 300);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      processInput(input);
    }
  };

  return (
    <>
      {/* ── Floating robot button ── */}
      <button
        className="cubebot-btn"
        onClick={open ? () => setOpen(false) : handleOpen}
        aria-label="Open CubeBot"
      >
        {notif && <span className="cubebot-notif">1</span>}
        <RobotIcon size={28} />
      </button>

      {/* ── Chat window ── */}
      <div className={`cubebot-win ${open ? "open" : ""}`}>

        {/* Header */}
        <div className="cubebot-head">
          <div className="cubebot-head-avatar">
            <RobotIcon size={20} />
          </div>
          <div className="cubebot-info">
            <div className="cubebot-name">CubeBot</div>
            <div className="cubebot-status">
              <span className="cubebot-dot" />
              Online · Always here to help
            </div>
          </div>
          <button className="cubebot-close" onClick={() => setOpen(false)}>×</button>
        </div>

        {/* Messages */}
        <div className="cubebot-msgs" ref={msgsRef}>
          {msgs.map(m => (
            <div key={m.id} className={`cubebot-msg ${m.isBot ? "bot" : "user"}`}>

              {/* Bot avatar — robot icon */}
              {m.isBot && (
                <div className="cubebot-msg-avatar cubebot-bot-avatar">
                  <RobotIcon size={16} />
                </div>
              )}

              {/* User avatar — profile image or dicebear */}
              {!m.isBot && <UserAvatar profile={profile} />}

              <div
                className="cubebot-bubble"
                dangerouslySetInnerHTML={{ __html: parseText(m.text) }}
              />
            </div>
          ))}

          {/* Typing indicator */}
          {typing && (
            <div className="cubebot-msg bot">
              <div className="cubebot-msg-avatar cubebot-bot-avatar">
                <RobotIcon size={16} />
              </div>
              <div className="cubebot-bubble">
                <div className="cubebot-typing">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick chips */}
        {chips.length > 0 && (
          <div className="cubebot-chips">
            {chips.map(c => (
              <button key={c} className="cubebot-chip" onClick={() => processInput(c)}>
                {c}
              </button>
            ))}
          </div>
        )}

        {/* Input row */}
        <div className="cubebot-input-row">
          {/* Mini user avatar next to input */}
          <div className="cubebot-input-avatar">
            <UserAvatar profile={profile} />
          </div>
          <textarea
            ref={inputRef}
            className="cubebot-input"
            rows={1}
            placeholder="Ask me anything…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
          />
          <button className="cubebot-send" onClick={() => processInput(input)}>
            <SendIcon />
          </button>
        </div>
      </div>
    </>
  );
}