import { useState, useEffect, useCallback, useRef } from "react";

const STORAGE_KEY = "wompwomp-data";

// ── helpers ──────────────────────────────────────────────────────────
function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { quizzes: [], results: [] };
  } catch {
    return { quizzes: [], results: [] };
  }
}
function saveStore(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Storage save failed", e);
  }
}

function cn(...c) { return c.filter(Boolean).join(" "); }
function pct(n, d) { return d ? Math.round((n / d) * 100) : 0; }
function grade(p) {
  if (p >= 90) return { label: "A+", color: "#16a34a", bg: "#dcfce7" };
  if (p >= 80) return { label: "A", color: "#22c55e", bg: "#dcfce7" };
  if (p >= 70) return { label: "B", color: "#3b82f6", bg: "#dbeafe" };
  if (p >= 60) return { label: "C", color: "#f59e0b", bg: "#fef3c7" };
  if (p >= 50) return { label: "D", color: "#f97316", bg: "#ffedd5" };
  return { label: "F", color: "#ef4444", bg: "#fee2e2" };
}
function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// ── icons (inline SVG) ──────────────────────────────────────────────
const Icon = ({ d, size = 20, color = "currentColor", ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d={d} />
  </svg>
);
const Icons = {
  upload: (p) => <Icon d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" {...p} />,
  play: (p) => <Icon d="M5 3l14 9-14 9V3z" {...p} />,
  check: (p) => <Icon d="M20 6L9 17l-5-5" {...p} />,
  x: (p) => <Icon d="M18 6L6 18M6 6l12 12" {...p} />,
  arrow: (p) => <Icon d="M5 12h14M12 5l7 7-7 7" {...p} />,
  back: (p) => <Icon d="M19 12H5M12 19l-7-7 7-7" {...p} />,
  trophy: (p) => <Icon d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 19.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 19.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2z" {...p} />,
  clock: (p) => <Icon d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 6v6l4 2" {...p} />,
  trash: (p) => <Icon d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" {...p} />,
  book: (p) => <Icon d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z" {...p} />,
  star: (p) => <Icon d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z" {...p} />,
  retry: (p) => <Icon d="M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15" {...p} />,
};

// ── styles ───────────────────────────────────────────────────────────
const S = {
  root: {
    fontFamily: "'DM Sans', 'Satoshi', 'General Sans', system-ui, sans-serif",
    minHeight: "100vh",
    background: "#0c0c0f",
    color: "#e8e6e3",
    position: "relative",
    overflow: "hidden",
  },
  grain: {
    position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", opacity: 0.03,
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
  },
  glow1: {
    position: "fixed", top: "-20%", right: "-10%", width: 600, height: 600,
    borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)",
    pointerEvents: "none", zIndex: 0,
  },
  glow2: {
    position: "fixed", bottom: "-30%", left: "-15%", width: 700, height: 700,
    borderRadius: "50%", background: "radial-gradient(circle, rgba(236,72,153,0.06) 0%, transparent 70%)",
    pointerEvents: "none", zIndex: 0,
  },
  container: {
    position: "relative", zIndex: 1, maxWidth: 860, margin: "0 auto",
    padding: "32px 20px 60px",
  },
};

// ── Animated Progress Ring ───────────────────────────────────────────
function Ring({ value, size = 120, stroke = 8, color = "#6366f1" }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const off = circ - (value / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={off}
        style={{ transition: "stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)" }} />
    </svg>
  );
}

// ── Pill Button ──────────────────────────────────────────────────────
function Btn({ children, onClick, variant = "primary", disabled, style, icon }) {
  const base = {
    display: "inline-flex", alignItems: "center", gap: 8,
    padding: "12px 24px", borderRadius: 50, border: "none",
    fontSize: 14, fontWeight: 600, cursor: disabled ? "default" : "pointer",
    transition: "all .25s cubic-bezier(.4,0,.2,1)",
    fontFamily: "inherit", opacity: disabled ? 0.4 : 1,
    letterSpacing: "0.01em",
  };
  const variants = {
    primary: { background: "#6366f1", color: "#fff" },
    secondary: { background: "rgba(255,255,255,0.06)", color: "#e8e6e3", border: "1px solid rgba(255,255,255,0.1)" },
    danger: { background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" },
    success: { background: "rgba(34,197,94,0.12)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.2)" },
    ghost: { background: "transparent", color: "#a1a1aa" },
  };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ ...base, ...variants[variant], ...style }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}>
      {icon}{children}
    </button>
  );
}

// ── Card ─────────────────────────────────────────────────────────────
function Card({ children, style, onClick, hover }) {
  const ref = useRef();
  return (
    <div ref={ref} onClick={onClick} style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 20, padding: 28,
      transition: "all .3s cubic-bezier(.4,0,.2,1)",
      cursor: onClick ? "pointer" : "default",
      ...style,
    }}
    onMouseEnter={e => { if (hover !== false) { e.currentTarget.style.borderColor = "rgba(99,102,241,0.3)"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}}
    onMouseLeave={e => { if (hover !== false) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}}>
      {children}
    </div>
  );
}

// ── Tag ──────────────────────────────────────────────────────────────
function Tag({ children, color = "#6366f1", bg }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "4px 12px", borderRadius: 50,
      background: bg || `${color}18`, color,
      fontSize: 12, fontWeight: 600, letterSpacing: "0.02em",
    }}>{children}</span>
  );
}

// ── Progress Bar ─────────────────────────────────────────────────────
function Bar({ value, color = "#6366f1", height = 6 }) {
  return (
    <div style={{ width: "100%", height, borderRadius: 50, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
      <div style={{
        width: `${value}%`, height: "100%", borderRadius: 50, background: color,
        transition: "width .5s cubic-bezier(.4,0,.2,1)",
      }} />
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// ── MAIN APP ─────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════
export default function QuizApp() {
  const [store, setStore] = useState({ quizzes: [], results: [] });
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("home"); // home | quiz | results
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [quizMode, setQuizMode] = useState("all"); // all | mcq | tf
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showExplanation, setShowExplanation] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();
  const [fadeIn, setFadeIn] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // load persisted data
  useEffect(() => {
    setStore(loadStore());
    setLoaded(true);
  }, []);

  // persist on change
  const persist = useCallback((s) => { setStore(s); saveStore(s); }, []);

  // fade-in on view change
  useEffect(() => { setFadeIn(false); requestAnimationFrame(() => setFadeIn(true)); }, [view]);

  // ── file upload handler ─────────────────────────────────────────
  const handleFile = useCallback((file) => {
    if (!file || !file.name.endsWith(".json")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        // validate
        if (!data.mcq && !data.true_or_false) {
          alert("Invalid quiz JSON. Must contain 'mcq' and/or 'true_or_false' arrays.");
          return;
        }
        const quiz = {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          title: data.quiz_title || file.name.replace(".json", ""),
          mcqCount: data.mcq?.length || 0,
          tfCount: data.true_or_false?.length || 0,
          totalQuestions: (data.mcq?.length || 0) + (data.true_or_false?.length || 0),
          data,
          addedAt: new Date().toISOString(),
        };
        const next = { ...store, quizzes: [...store.quizzes, quiz] };
        persist(next);
      } catch {
        alert("Failed to parse JSON file. Please check the format.");
      }
    };
    reader.readAsText(file);
  }, [store, persist]);

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  // ── quiz engine ──────────────────────────────────────────────────
  const getQuestions = useCallback(() => {
    if (!activeQuiz) return [];
    const d = activeQuiz.data;
    let qs = [];
    if (quizMode === "all" || quizMode === "mcq") {
      (d.mcq || []).forEach(q => qs.push({ ...q, type: "mcq" }));
    }
    if (quizMode === "all" || quizMode === "tf") {
      (d.true_or_false || []).forEach(q => qs.push({ ...q, type: "tf" }));
    }
    return qs;
  }, [activeQuiz, quizMode]);

  const questions = getQuestions();
  const currentQ = questions[qIndex];
  const totalQ = questions.length;

  const startQuiz = (quiz, mode) => {
    setActiveQuiz(quiz);
    setQuizMode(mode);
    setQIndex(0);
    setAnswers({});
    setShowExplanation(false);
    setResultData(null);
    setView("quiz");
  };

  const selectAnswer = (ans) => {
    if (answers[qIndex] !== undefined) return;
    setAnswers(prev => ({ ...prev, [qIndex]: ans }));
    setShowExplanation(true);
  };

  const nextQuestion = () => {
    setShowExplanation(false);
    if (qIndex < totalQ - 1) {
      setQIndex(qIndex + 1);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = () => {
    let correct = 0;
    questions.forEach((q, i) => {
      const userAns = answers[i];
      if (q.type === "mcq" && userAns === q.answer) correct++;
      if (q.type === "tf" && userAns === q.answer) correct++;
    });
    const result = {
      id: Date.now().toString(36),
      quizId: activeQuiz.id,
      quizTitle: activeQuiz.title,
      mode: quizMode,
      total: totalQ,
      correct,
      percentage: pct(correct, totalQ),
      date: new Date().toISOString(),
      answers: { ...answers },
    };
    setResultData(result);
    const next = { ...store, results: [result, ...store.results] };
    persist(next);
    setView("results");
  };

  const deleteQuiz = (id) => {
    const next = {
      quizzes: store.quizzes.filter(q => q.id !== id),
      results: store.results.filter(r => r.quizId !== id),
    };
    persist(next);
    setConfirmDelete(null);
  };

  const clearHistory = () => {
    persist({ ...store, results: [] });
  };

  if (!loaded) return (
    <div style={{ ...S.root, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", opacity: 0.5 }}>
        <div style={{ width: 32, height: 32, border: "3px solid rgba(255,255,255,0.1)", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        Loading...
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════
  // ── RENDER ─────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div style={S.root}>
      <div style={S.grain} />
      <div style={S.glow1} />
      <div style={S.glow2} />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=JetBrains+Mono:wght@400;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::selection { background: rgba(99,102,241,0.3); }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes scaleIn { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
        @keyframes confetti1 { 0% { transform: translateY(0) rotate(0); opacity:1; } 100% { transform: translateY(-80px) rotate(720deg); opacity:0; } }
        @keyframes confetti2 { 0% { transform: translateY(0) rotate(0); opacity:1; } 100% { transform: translateY(-60px) rotate(-540deg); opacity:0; } }
        @keyframes slideRight { from { transform:translateX(-100%); } to { transform:translateX(0); } }
      `}</style>

      <div style={{
        ...S.container,
        opacity: fadeIn ? 1 : 0,
        transform: fadeIn ? "translateY(0)" : "translateY(12px)",
        transition: "all .4s cubic-bezier(.4,0,.2,1)",
      }}>

        {/* ── HEADER ─────────────────────────────────────────── */}
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}
            onClick={() => { setView("home"); setActiveQuiz(null); }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: "linear-gradient(135deg, #6366f1, #a855f7)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 24px rgba(99,102,241,0.3)",
            }}>
              <Icons.book size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}>wompwomp</div>
              <div style={{ fontSize: 11, color: "#71717a", letterSpacing: "0.04em" }}>
                study well ^^
              </div>
            </div>
          </div>
          {view !== "home" && (
            <Btn variant="ghost" onClick={() => { setView("home"); setActiveQuiz(null); }}
              icon={<Icons.back size={16} />}>
              Library
            </Btn>
          )}
        </header>

        {/* ════════════════════════════════════════════════════════ */}
        {/* ── HOME VIEW ────────────────────────────────────────── */}
        {/* ════════════════════════════════════════════════════════ */}
        {view === "home" && (
          <div>
            {/* Upload zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? "#6366f1" : "rgba(255,255,255,0.1)"}`,
                borderRadius: 24,
                padding: "48px 32px",
                textAlign: "center",
                cursor: "pointer",
                transition: "all .3s",
                background: dragOver ? "rgba(99,102,241,0.06)" : "transparent",
                marginBottom: 40,
              }}
            >
              <input ref={fileRef} type="file" accept=".json"
                style={{ display: "none" }}
                onChange={e => handleFile(e.target.files[0])} />
              <div style={{
                width: 64, height: 64, borderRadius: 20, margin: "0 auto 20px",
                background: "rgba(99,102,241,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icons.upload size={28} color="#6366f1" />
              </div>
              <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>
                Drop your quiz JSON here
              </div>
              <div style={{ fontSize: 14, color: "#71717a" }}>
                or click to browse · supports MCQ and True/False formats
              </div>
            </div>

            {/* Stats strip */}
            {store.quizzes.length > 0 && (
              <div style={{
                display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12,
                marginBottom: 32,
              }}>
                {[
                  { label: "Quizzes", value: store.quizzes.length, icon: <Icons.book size={16} color="#6366f1" /> },
                  { label: "Attempts", value: store.results.length, icon: <Icons.clock size={16} color="#a855f7" /> },
                  { label: "Avg Score", value: store.results.length
                    ? pct(store.results.reduce((a, r) => a + r.percentage, 0), store.results.length) + "%"
                    : "—", icon: <Icons.star size={16} color="#f59e0b" /> },
                ].map((s, i) => (
                  <div key={i} style={{
                    background: "rgba(255,255,255,0.03)", borderRadius: 16,
                    padding: "18px 20px", border: "1px solid rgba(255,255,255,0.05)",
                    display: "flex", alignItems: "center", gap: 12,
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: "rgba(255,255,255,0.04)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>{s.icon}</div>
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{s.value}</div>
                      <div style={{ fontSize: 11, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quiz cards */}
            {store.quizzes.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#52525b" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📚</div>
                <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>No quizzes yet</div>
                <div style={{ fontSize: 14 }}>Upload a JSON quiz file to get started</div>
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 600, color: "#a1a1aa", letterSpacing: "0.02em" }}>Your Quizzes</h2>
                  {store.results.length > 0 && (
                    <Btn variant="ghost" onClick={clearHistory} style={{ fontSize: 12 }}>Clear History</Btn>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {store.quizzes.map((quiz, qi) => {
                    const pastResults = store.results.filter(r => r.quizId === quiz.id);
                    const bestScore = pastResults.length
                      ? Math.max(...pastResults.map(r => r.percentage)) : null;
                    const g = bestScore !== null ? grade(bestScore) : null;

                    return (
                      <Card key={quiz.id} style={{ animation: `fadeUp .4s ease ${qi * 0.06}s both` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                          <div style={{ flex: 1, minWidth: 200 }}>
                            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, lineHeight: 1.3 }}>
                              {quiz.title}
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                              {quiz.mcqCount > 0 && <Tag color="#6366f1">{quiz.mcqCount} MCQ</Tag>}
                              {quiz.tfCount > 0 && <Tag color="#a855f7">{quiz.tfCount} T/F</Tag>}
                              <Tag color="#71717a">{quiz.totalQuestions} Total</Tag>
                              {g && <Tag color={g.color}> Best: {bestScore}%</Tag>}
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                              <Btn onClick={() => startQuiz(quiz, "all")} icon={<Icons.play size={14} />}
                                style={{ fontSize: 13, padding: "10px 20px" }}>
                                All Questions
                              </Btn>
                              {quiz.mcqCount > 0 && (
                                <Btn variant="secondary" onClick={() => startQuiz(quiz, "mcq")}
                                  style={{ fontSize: 13, padding: "10px 20px" }}>
                                  MCQ Only
                                </Btn>
                              )}
                              {quiz.tfCount > 0 && (
                                <Btn variant="secondary" onClick={() => startQuiz(quiz, "tf")}
                                  style={{ fontSize: 13, padding: "10px 20px" }}>
                                  True/False
                                </Btn>
                              )}
                              {confirmDelete === quiz.id ? (
                                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                  <Btn variant="danger" onClick={() => deleteQuiz(quiz.id)}
                                    style={{ fontSize: 12, padding: "8px 16px" }}>Confirm</Btn>
                                  <Btn variant="ghost" onClick={() => setConfirmDelete(null)}
                                    style={{ fontSize: 12, padding: "8px 12px" }}>Cancel</Btn>
                                </div>
                              ) : (
                                <Btn variant="ghost" onClick={() => setConfirmDelete(quiz.id)}
                                  icon={<Icons.trash size={14} color="#71717a" />}
                                  style={{ fontSize: 13, padding: "10px 14px" }} />
                              )}
                            </div>
                          </div>

                          {/* Past attempts mini */}
                          {pastResults.length > 0 && (
                            <div style={{
                              background: "rgba(255,255,255,0.02)", borderRadius: 14,
                              padding: "14px 18px", minWidth: 180,
                              border: "1px solid rgba(255,255,255,0.04)",
                            }}>
                              <div style={{ fontSize: 11, color: "#71717a", textTransform: "uppercase",
                                letterSpacing: "0.06em", marginBottom: 10 }}>Recent Attempts</div>
                              {pastResults.slice(0, 3).map((r, ri) => (
                                <div key={ri} style={{
                                  display: "flex", justifyContent: "space-between", alignItems: "center",
                                  padding: "6px 0",
                                  borderBottom: ri < 2 && ri < pastResults.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                                }}>
                                  <span style={{ fontSize: 12, color: "#a1a1aa" }}>
                                    {r.mode === "all" ? "All" : r.mode === "mcq" ? "MCQ" : "T/F"}
                                  </span>
                                  <span style={{
                                    fontSize: 13, fontWeight: 700,
                                    fontFamily: "'JetBrains Mono', monospace",
                                    color: grade(r.percentage).color,
                                  }}>
                                    {r.correct}/{r.total} ({r.percentage}%)
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════ */}
        {/* ── QUIZ VIEW ────────────────────────────────────────── */}
        {/* ════════════════════════════════════════════════════════ */}
        {view === "quiz" && currentQ && (
          <div style={{ animation: "scaleIn .3s ease" }}>
            {/* Progress bar */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: "#71717a" }}>{activeQuiz.title}</span>
                <span style={{
                  fontSize: 13, fontWeight: 600, color: "#a1a1aa",
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {qIndex + 1} / {totalQ}
                </span>
              </div>
              <Bar value={((qIndex + 1) / totalQ) * 100} />
            </div>

            {/* Question type badge */}
            <div style={{ margin: "28px 0 20px" }}>
              <Tag color={currentQ.type === "mcq" ? "#6366f1" : "#a855f7"}>
                {currentQ.type === "mcq" ? "Multiple Choice" : "True or False"}
              </Tag>
            </div>

            {/* Question */}
            <div style={{
              fontSize: 20, fontWeight: 600, lineHeight: 1.5, marginBottom: 28,
              letterSpacing: "-0.01em",
            }}>
              {currentQ.type === "mcq" ? currentQ.question : currentQ.statement}
            </div>

            {/* Options */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {currentQ.type === "mcq" ? (
                currentQ.options.map((opt, oi) => {
                  const letter = opt.charAt(0);
                  const answered = answers[qIndex] !== undefined;
                  const selected = answers[qIndex] === letter;
                  const isCorrect = letter === currentQ.answer;
                  let bg = "rgba(255,255,255,0.03)";
                  let border = "rgba(255,255,255,0.08)";
                  let textColor = "#e8e6e3";
                  if (answered) {
                    if (isCorrect) { bg = "rgba(34,197,94,0.1)"; border = "rgba(34,197,94,0.4)"; textColor = "#4ade80"; }
                    else if (selected && !isCorrect) { bg = "rgba(239,68,68,0.1)"; border = "rgba(239,68,68,0.4)"; textColor = "#f87171"; }
                    else { bg = "rgba(255,255,255,0.02)"; textColor = "#52525b"; }
                  }
                  return (
                    <div key={oi} onClick={() => selectAnswer(letter)} style={{
                      display: "flex", alignItems: "center", gap: 16,
                      padding: "16px 20px", borderRadius: 16,
                      background: bg, border: `1.5px solid ${border}`,
                      cursor: answered ? "default" : "pointer",
                      transition: "all .2s",
                      color: textColor,
                    }}
                    onMouseEnter={e => { if (!answered) { e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)"; e.currentTarget.style.background = "rgba(99,102,241,0.06)"; }}}
                    onMouseLeave={e => { if (!answered) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 700, fontSize: 14,
                        fontFamily: "'JetBrains Mono', monospace",
                        background: answered && isCorrect ? "rgba(34,197,94,0.2)" :
                          answered && selected ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.06)",
                        flexShrink: 0,
                      }}>
                        {answered && isCorrect ? <Icons.check size={16} color="#4ade80" /> :
                          answered && selected ? <Icons.x size={16} color="#f87171" /> : letter}
                      </div>
                      <span style={{ fontSize: 15, lineHeight: 1.5 }}>{opt.slice(3)}</span>
                    </div>
                  );
                })
              ) : (
                ["True", "False"].map((opt) => {
                  const val = opt === "True";
                  const answered = answers[qIndex] !== undefined;
                  const selected = answers[qIndex] === val;
                  const isCorrect = val === currentQ.answer;
                  let bg = "rgba(255,255,255,0.03)";
                  let border = "rgba(255,255,255,0.08)";
                  let textColor = "#e8e6e3";
                  if (answered) {
                    if (isCorrect) { bg = "rgba(34,197,94,0.1)"; border = "rgba(34,197,94,0.4)"; textColor = "#4ade80"; }
                    else if (selected && !isCorrect) { bg = "rgba(239,68,68,0.1)"; border = "rgba(239,68,68,0.4)"; textColor = "#f87171"; }
                    else { bg = "rgba(255,255,255,0.02)"; textColor = "#52525b"; }
                  }
                  return (
                    <div key={opt} onClick={() => selectAnswer(val)} style={{
                      display: "flex", alignItems: "center", gap: 16,
                      padding: "16px 20px", borderRadius: 16,
                      background: bg, border: `1.5px solid ${border}`,
                      cursor: answered ? "default" : "pointer",
                      transition: "all .2s", color: textColor,
                    }}
                    onMouseEnter={e => { if (!answered) { e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)"; e.currentTarget.style.background = "rgba(99,102,241,0.06)"; }}}
                    onMouseLeave={e => { if (!answered) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 700, fontSize: 14,
                        background: answered && isCorrect ? "rgba(34,197,94,0.2)" :
                          answered && selected ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.06)",
                        flexShrink: 0,
                      }}>
                        {answered && isCorrect ? <Icons.check size={16} color="#4ade80" /> :
                          answered && selected ? <Icons.x size={16} color="#f87171" /> :
                            opt === "True" ? "T" : "F"}
                      </div>
                      <span style={{ fontSize: 15, fontWeight: 600 }}>{opt}</span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Explanation */}
            {showExplanation && currentQ.explanation && (
              <div style={{
                marginTop: 24, padding: "20px 24px", borderRadius: 16,
                background: "rgba(99,102,241,0.06)",
                border: "1px solid rgba(99,102,241,0.15)",
                animation: "fadeUp .3s ease",
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#818cf8", textTransform: "uppercase",
                  letterSpacing: "0.06em", marginBottom: 8 }}>Explanation</div>
                <div style={{ fontSize: 14, lineHeight: 1.7, color: "#c4b5fd" }}>
                  {currentQ.explanation}
                </div>
              </div>
            )}

            {/* Next button */}
            {answers[qIndex] !== undefined && (
              <div style={{ marginTop: 28, display: "flex", justifyContent: "flex-end", animation: "fadeUp .25s ease" }}>
                <Btn onClick={nextQuestion} icon={<Icons.arrow size={16} />}>
                  {qIndex < totalQ - 1 ? "Next Question" : "See Results"}
                </Btn>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════ */}
        {/* ── RESULTS VIEW ─────────────────────────────────────── */}
        {/* ════════════════════════════════════════════════════════ */}
        {view === "results" && resultData && (() => {
          const g = grade(resultData.percentage);
          const correct = resultData.correct;
          const wrong = resultData.total - correct;
          return (
            <div style={{ animation: "scaleIn .4s ease" }}>
              {/* Hero card */}
              <Card hover={false} style={{
                textAlign: "center", padding: "48px 32px",
                background: `linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(168,85,247,0.04) 100%)`,
                border: "1px solid rgba(99,102,241,0.15)",
                marginBottom: 28,
                position: "relative", overflow: "hidden",
              }}>
                {resultData.percentage >= 80 && (
                  <>
                    {[...Array(8)].map((_, i) => (
                      <div key={i} style={{
                        position: "absolute",
                        left: `${10 + Math.random() * 80}%`,
                        top: "60%",
                        width: 8, height: 8, borderRadius: 2,
                        background: ["#6366f1", "#a855f7", "#f59e0b", "#22c55e", "#ec4899"][i % 5],
                        animation: `confetti${i % 2 + 1} 1.5s ease ${i * 0.1}s both`,
                      }} />
                    ))}
                  </>
                )}
                <div style={{ position: "relative", display: "inline-block", marginBottom: 20 }}>
                  <Ring value={resultData.percentage} size={140} stroke={10} color={g.color} />
                  <div style={{
                    position: "absolute", inset: 0,
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    transform: "rotate(0)",
                  }}>
                    <div style={{
                      fontSize: 36, fontWeight: 800, color: g.color,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>{resultData.percentage}%</div>
                  </div>
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 6, letterSpacing: "-0.02em" }}>
                  {resultData.percentage >= 80 ? "Excellent!" :
                    resultData.percentage >= 60 ? "Good Job!" :
                      resultData.percentage >= 40 ? "Keep Trying!" : "Study More!"}
                </div>
                <div style={{ fontSize: 15, color: "#a1a1aa", marginBottom: 24 }}>
                  You scored {correct} out of {resultData.total} questions correctly
                </div>

                <div style={{
                  display: "inline-flex", gap: 24,
                  background: "rgba(0,0,0,0.2)", borderRadius: 16, padding: "16px 32px",
                }}>
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: "#4ade80", fontFamily: "'JetBrains Mono', monospace" }}>{correct}</div>
                    <div style={{ fontSize: 11, color: "#71717a", textTransform: "uppercase" }}>Correct</div>
                  </div>
                  <div style={{ width: 1, background: "rgba(255,255,255,0.06)" }} />
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: "#f87171", fontFamily: "'JetBrains Mono', monospace" }}>{wrong}</div>
                    <div style={{ fontSize: 11, color: "#71717a", textTransform: "uppercase" }}>Wrong</div>
                  </div>
                  <div style={{ width: 1, background: "rgba(255,255,255,0.06)" }} />
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: g.color, fontFamily: "'JetBrains Mono', monospace" }}>{g.label}</div>
                    <div style={{ fontSize: 11, color: "#71717a", textTransform: "uppercase" }}>Grade</div>
                  </div>
                </div>
              </Card>

              {/* Actions */}
              <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 36, flexWrap: "wrap" }}>
                <Btn onClick={() => startQuiz(activeQuiz, quizMode)} icon={<Icons.retry size={16} />}>
                  Retry Quiz
                </Btn>
                <Btn variant="secondary" onClick={() => { setView("home"); setActiveQuiz(null); }}
                  icon={<Icons.back size={16} />}>
                  Back to Library
                </Btn>
              </div>

              {/* Answer review */}
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: "#a1a1aa", marginBottom: 16 }}>
                  Answer Review
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {questions.map((q, i) => {
                    const userAns = resultData.answers[i];
                    const isCorrect = q.type === "mcq"
                      ? userAns === q.answer
                      : userAns === q.answer;
                    return (
                      <div key={i} style={{
                        padding: "16px 20px", borderRadius: 16,
                        background: isCorrect ? "rgba(34,197,94,0.04)" : "rgba(239,68,68,0.04)",
                        border: `1px solid ${isCorrect ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)"}`,
                        animation: `fadeUp .3s ease ${i * 0.02}s both`,
                      }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: 8,
                            background: isCorrect ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                            marginTop: 2,
                          }}>
                            {isCorrect ? <Icons.check size={14} color="#4ade80" /> : <Icons.x size={14} color="#f87171" />}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 6 }}>
                              <span style={{ color: "#71717a", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                                Q{i + 1}
                              </span>{" "}
                              {q.type === "mcq" ? q.question : q.statement}
                            </div>
                            <div style={{ fontSize: 13, color: "#a1a1aa" }}>
                              <span style={{ color: isCorrect ? "#4ade80" : "#f87171" }}>
                                Your answer: {q.type === "mcq" ? userAns : (userAns ? "True" : "False")}
                              </span>
                              {!isCorrect && (
                                <span style={{ color: "#4ade80", marginLeft: 12 }}>
                                  Correct: {q.type === "mcq" ? q.answer : (q.answer ? "True" : "False")}
                                </span>
                              )}
                            </div>
                            {q.explanation && (
                              <div style={{ fontSize: 12, color: "#71717a", marginTop: 6, lineHeight: 1.6 }}>
                                {q.explanation}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

      </div>
    </div>
  );
}