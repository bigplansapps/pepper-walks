import { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

/* ── helpers ── */
function formatDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  if (hrs < 48) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatFullDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/* ── splash screen ── */
function SplashScreen({ onDone }) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFadeOut(true), 1800);
    const t2 = setTimeout(onDone, 2300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: fadeOut ? 0 : 1,
        transition: "opacity 0.5s ease",
      }}
    >
      <div
        style={{
          width: 160,
          height: 160,
          borderRadius: "50%",
          overflow: "hidden",
          border: "3px solid rgba(255,255,255,0.15)",
          marginBottom: 20,
          animation: "scaleIn 0.6s ease",
        }}
      >
        <img
          src="/pepper.jpg"
          alt="Pepper"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
      <div
        style={{
          color: "#fff",
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: -0.5,
          animation: "fadeUp 0.6s ease 0.2s both",
        }}
      >
        Pepper 🐾
      </div>
      <div
        style={{
          color: "rgba(255,255,255,0.4)",
          fontSize: 14,
          marginTop: 6,
          fontWeight: 500,
          animation: "fadeUp 0.6s ease 0.4s both",
        }}
      >
        Walk Tracker
      </div>
    </div>
  );
}

/* ── iOS toggle ── */
function Toggle({ value, onChange }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        width: 51,
        height: 31,
        borderRadius: 16,
        background: value ? "#007AFF" : "#e9e9eb",
        padding: 2,
        transition: "background 0.2s",
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 27,
          height: 27,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          transition: "transform 0.2s",
          transform: value ? "translateX(20px)" : "translateX(0)",
        }}
      />
    </div>
  );
}

/* ── row inside a card ── */
function CardRow({ label, children, last }) {
  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "13px 16px",
          minHeight: 44,
        }}
      >
        <span style={{ fontSize: 16, color: "#1c1c1e" }}>{label}</span>
        {children}
      </div>
      {!last && <div style={{ height: 0.5, background: "#e5e5ea", marginLeft: 16 }} />}
    </>
  );
}

/* ── card ── */
function Card({ children, style }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 10,
        marginBottom: 16,
        boxShadow: "0 0.5px 0 rgba(0,0,0,0.04)",
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ── section label ── */
function SectionLabel({ children, style }) {
  return (
    <div
      style={{
        fontSize: 13,
        fontWeight: 500,
        color: "#6e6e73",
        textTransform: "uppercase",
        letterSpacing: 0.3,
        padding: "0 16px",
        marginBottom: 6,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ── rating row (single line) ── */
function RatingRow({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 3, padding: "12px 10px", justifyContent: "center" }}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            border: "none",
            background: n <= value ? "#007AFF" : "#f2f2f7",
            color: n <= value ? "#fff" : "#8e8e93",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.12s",
            padding: 0,
          }}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

/* ── walk card ── */
function WalkCard({ walk, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const walkers = walk.walker || "";

  return (
    <div onClick={() => setExpanded(!expanded)} style={{ cursor: "pointer" }}>
      <div style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {walk.title && (
              <div style={{ fontSize: 16, fontWeight: 600, color: "#1c1c1e", marginBottom: 2 }}>
                {walk.title}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: "#3a3a3c" }}>
                {walkers}
              </span>
              <span style={{ fontSize: 13, color: "#aeaeb2" }}>
                {formatDate(walk.date)}
              </span>
            </div>
            <div style={{ display: "flex", gap: 5, marginTop: 5, flexWrap: "wrap" }}>
              {walk.duration && (
                <span style={{ fontSize: 12, color: "#aeaeb2" }}>{walk.duration} min</span>
              )}
              {walk.lunged && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    background: "#FFF3CD",
                    color: "#926c05",
                    padding: "1px 7px",
                    borderRadius: 5,
                  }}
                >
                  Lunged
                </span>
              )}
              {walk.dogPark && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    background: "#D4EDDA",
                    color: "#155724",
                    padding: "1px 7px",
                    borderRadius: 5,
                  }}
                >
                  Dog Park
                </span>
              )}
            </div>
          </div>
          <div
            style={{
              background: "#007AFF",
              borderRadius: 8,
              padding: "3px 10px",
              fontSize: 17,
              fontWeight: 700,
              color: "#fff",
              marginLeft: 12,
              flexShrink: 0,
            }}
          >
            {walk.rating}
          </div>
        </div>

        {expanded && (
          <div
            style={{
              marginTop: 10,
              paddingTop: 10,
              borderTop: "0.5px solid #e5e5ea",
            }}
          >
            <div style={{ fontSize: 13, color: "#aeaeb2" }}>{formatFullDate(walk.date)}</div>
            {walk.notes && (
              <p
                style={{
                  fontSize: 15,
                  color: "#3a3a3c",
                  margin: "8px 0",
                  lineHeight: 1.45,
                }}
              >
                {walk.notes}
              </p>
            )}
            {walk.photo && (
              <img
                src={walk.photo}
                alt="Walk"
                style={{
                  width: "100%",
                  maxHeight: 220,
                  objectFit: "cover",
                  borderRadius: 8,
                  marginTop: 6,
                }}
              />
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm("Delete this walk?")) onDelete(walk.id);
              }}
              style={{
                marginTop: 10,
                background: "none",
                border: "none",
                color: "#FF3B30",
                fontSize: 15,
                cursor: "pointer",
                padding: 0,
                fontWeight: 500,
              }}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   MAIN APP
   ════════════════════════════════════════ */
export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [walks, setWalks] = useState([]);
  const [view, setView] = useState("home");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form
  const [walkerMe, setWalkerMe] = useState(false);
  const [walkerHer, setWalkerHer] = useState(false);
  const [rating, setRating] = useState(7);
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState(null);
  const [lunged, setLunged] = useState(false);
  const [dogPark, setDogPark] = useState(false);
  const fileRef = useRef(null);

  const hasWalker = walkerMe || walkerHer;

  /* ── Firebase real-time ── */
  useEffect(() => {
    const q = query(collection(db, "walks"), orderBy("date", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setWalks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  /* ── save ── */
  const saveWalk = async () => {
    if (!hasWalker) return;
    const walkerLabel =
      walkerMe && walkerHer ? "Both" : walkerMe ? "Me" : "Her";
    setSaving(true);
    try {
      await addDoc(collection(db, "walks"), {
        walker: walkerLabel,
        title: title || null,
        rating,
        duration: duration ? Number(duration) : null,
        notes: notes || null,
        photo: photo || null,
        lunged,
        dogPark,
        date: new Date().toISOString(),
        createdAt: serverTimestamp(),
      });
      resetForm();
      setView("home");
    } catch {
      alert("Couldn't save — try again.");
    }
    setSaving(false);
  };

  const resetForm = () => {
    setWalkerMe(false);
    setWalkerHer(false);
    setRating(7);
    setTitle("");
    setDuration("");
    setNotes("");
    setPhoto(null);
    setLunged(false);
    setDogPark(false);
  };

  /* ── delete ── */
  const deleteWalk = async (id) => {
    try {
      await deleteDoc(doc(db, "walks", id));
    } catch {
      alert("Couldn't delete — try again.");
    }
  };

  /* ── photo ── */
  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      alert("Photo too large — use one under 3MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setPhoto(ev.target.result);
    reader.readAsDataURL(file);
  };

  /* ── stats ── */
  const total = walks.length;
  const avg = total ? (walks.reduce((s, w) => s + w.rating, 0) / total).toFixed(1) : "—";
  const week = walks.filter((w) => new Date() - new Date(w.date) < 7 * 86400000).length;
  const lungeP = total ? Math.round((walks.filter((w) => w.lunged).length / total) * 100) : 0;
  const streak = (() => {
    if (!walks.length) return 0;
    let count = 0;
    const sorted = [...walks].sort((a, b) => new Date(b.date) - new Date(a.date));
    let d = new Date();
    d.setHours(0, 0, 0, 0);
    for (let i = 0; i < 60; i++) {
      if (sorted.some((w) => new Date(w.date).toDateString() === d.toDateString())) {
        count++;
      } else if (i > 0) break;
      d.setDate(d.getDate() - 1);
    }
    return count;
  })();

  /* ── styles ── */
  const font =
    "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', system-ui, sans-serif";

  return (
    <>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
        html { background: #f2f2f7; }
        body { font-family: ${font}; background: #f2f2f7; -webkit-font-smoothing: antialiased; }
        input, textarea { font-family: ${font}; }
        input::placeholder, textarea::placeholder { color: #c7c7cc; }
      `}</style>

      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}

      <div
        style={{
          maxWidth: 480,
          margin: "0 auto",
          minHeight: "100vh",
          background: "#f2f2f7",
          paddingBottom: 40,
        }}
      >
        {/* ── HEADER ── */}
        <div
          style={{
            background: "#fff",
            padding: "env(safe-area-inset-top, 12px) 16px 14px",
            paddingTop: "max(env(safe-area-inset-top, 12px), 12px)",
            borderBottom: "0.5px solid #d1d1d6",
            textAlign: "center",
            position: "sticky",
            top: 0,
            zIndex: 100,
          }}
        >
          {view === "home" ? (
            <>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#1c1c1e" }}>
                Pepper 🐾
              </div>
              {streak > 1 && (
                <div style={{ fontSize: 12, color: "#FF9500", fontWeight: 600, marginTop: 2 }}>
                  🔥 {streak}-day streak
                </div>
              )}
            </>
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button
                onClick={() => { resetForm(); setView("home"); }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#007AFF",
                  fontSize: 17,
                  cursor: "pointer",
                  padding: 0,
                  minWidth: 60,
                  textAlign: "left",
                }}
              >
                Cancel
              </button>
              <span style={{ fontSize: 17, fontWeight: 600, color: "#1c1c1e" }}>New Walk</span>
              <button
                onClick={saveWalk}
                disabled={!hasWalker || saving}
                style={{
                  background: "none",
                  border: "none",
                  color: hasWalker ? "#007AFF" : "#c7c7cc",
                  fontSize: 17,
                  fontWeight: 600,
                  cursor: hasWalker ? "pointer" : "default",
                  padding: 0,
                  minWidth: 60,
                  textAlign: "right",
                }}
              >
                {saving ? "..." : "Save"}
              </button>
            </div>
          )}
        </div>

        {/* ════════ HOME ════════ */}
        {view === "home" && !loading && (
          <div style={{ padding: "16px", animation: "fadeIn 0.25s ease" }}>
            {/* Stats */}
            <Card>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr" }}>
                {[
                  { label: "Week", val: week },
                  { label: "Avg", val: avg },
                  { label: "Total", val: total },
                  { label: "Lunge", val: `${lungeP}%` },
                ].map((s, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "14px 4px",
                      textAlign: "center",
                      borderRight: i < 3 ? "0.5px solid #e5e5ea" : "none",
                    }}
                  >
                    <div style={{ fontSize: 22, fontWeight: 700, color: "#007AFF" }}>
                      {s.val}
                    </div>
                    <div style={{ fontSize: 11, color: "#8e8e93", marginTop: 1, fontWeight: 500 }}>
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Log button */}
            <button
              onClick={() => setView("log")}
              style={{
                width: "100%",
                padding: "15px",
                background: "#007AFF",
                border: "none",
                borderRadius: 12,
                color: "#fff",
                fontSize: 17,
                fontWeight: 600,
                cursor: "pointer",
                marginBottom: 24,
              }}
            >
              Log a Walk
            </button>

            {/* Walks list */}
            <SectionLabel>Recent</SectionLabel>

            {walks.length === 0 ? (
              <Card style={{ padding: "36px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 6 }}>🐕</div>
                <div style={{ fontSize: 15, color: "#8e8e93" }}>No walks yet</div>
              </Card>
            ) : (
              <Card>
                {walks.slice(0, 40).map((w, i) => (
                  <div key={w.id}>
                    {i > 0 && (
                      <div style={{ height: 0.5, background: "#e5e5ea", marginLeft: 16 }} />
                    )}
                    <WalkCard walk={w} onDelete={deleteWalk} />
                  </div>
                ))}
              </Card>
            )}
          </div>
        )}

        {/* ════════ LOG ════════ */}
        {view === "log" && (
          <div style={{ padding: "16px", animation: "fadeIn 0.2s ease" }}>
            {/* Walker selection */}
            <SectionLabel>Who walked Pepper?</SectionLabel>
            <Card>
              <div style={{ display: "flex" }}>
                {[
                  { label: "🙋 Matt", active: walkerMe, set: setWalkerMe },
                  { label: "🙋‍♀️ Sarah", active: walkerHer, set: setWalkerHer },
                ].map((w, i) => (
                  <button
                    key={i}
                    onClick={() => w.set(!w.active)}
                    style={{
                      flex: 1,
                      padding: "14px",
                      border: "none",
                      borderRight: i === 0 ? "0.5px solid #e5e5ea" : "none",
                      background: w.active ? "#007AFF" : "#fff",
                      color: w.active ? "#fff" : "#1c1c1e",
                      fontSize: 16,
                      fontWeight: 500,
                      cursor: "pointer",
                      transition: "all 0.12s",
                    }}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </Card>

            {/* Walk title */}
            <SectionLabel style={{ marginTop: 4 }}>Walk name</SectionLabel>
            <Card>
              <div style={{ padding: "10px 16px" }}>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Morning loop, Beach walk..."
                  style={{
                    width: "100%",
                    padding: "6px 0",
                    background: "none",
                    border: "none",
                    color: "#1c1c1e",
                    fontSize: 16,
                    outline: "none",
                  }}
                />
              </div>
            </Card>

            {/* Rating */}
            <SectionLabel style={{ marginTop: 4 }}>Rating</SectionLabel>
            <Card>
              <RatingRow value={rating} onChange={setRating} />
            </Card>

            {/* Details */}
            <SectionLabel style={{ marginTop: 4 }}>Details</SectionLabel>
            <Card>
              <CardRow label="⚡ Lunged">
                <Toggle value={lunged} onChange={setLunged} />
              </CardRow>
              <CardRow label="🏞️ Dog Park">
                <Toggle value={dogPark} onChange={setDogPark} />
              </CardRow>
              <CardRow label="Duration" last>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="min"
                  style={{
                    width: 70,
                    padding: "6px 10px",
                    background: "#f2f2f7",
                    border: "none",
                    borderRadius: 8,
                    color: "#1c1c1e",
                    fontSize: 16,
                    outline: "none",
                    textAlign: "right",
                  }}
                />
              </CardRow>
            </Card>

            {/* Notes */}
            <SectionLabel style={{ marginTop: 4 }}>Notes</SectionLabel>
            <Card>
              <div style={{ padding: "10px 16px" }}>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="How was the walk?"
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "6px 0",
                    background: "none",
                    border: "none",
                    color: "#1c1c1e",
                    fontSize: 16,
                    outline: "none",
                    resize: "none",
                    lineHeight: 1.45,
                    fontFamily: "inherit",
                  }}
                />
              </div>
            </Card>

            {/* Photo */}
            <SectionLabel style={{ marginTop: 4 }}>Photo</SectionLabel>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhoto}
              style={{ display: "none" }}
            />
            {photo ? (
              <Card style={{ position: "relative" }}>
                <img
                  src={photo}
                  alt="Walk"
                  style={{ width: "100%", maxHeight: 200, objectFit: "cover", display: "block" }}
                />
                <button
                  onClick={() => { setPhoto(null); fileRef.current.value = ""; }}
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    background: "rgba(0,0,0,0.5)",
                    backdropFilter: "blur(8px)",
                    border: "none",
                    color: "#fff",
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    cursor: "pointer",
                    fontSize: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  ×
                </button>
              </Card>
            ) : (
              <Card>
                <button
                  onClick={() => fileRef.current?.click()}
                  style={{
                    width: "100%",
                    padding: "14px",
                    background: "#fff",
                    border: "none",
                    color: "#007AFF",
                    fontSize: 16,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  📷 Add Photo
                </button>
              </Card>
            )}

            {/* Save button */}
            <button
              onClick={saveWalk}
              disabled={!hasWalker || saving}
              style={{
                width: "100%",
                padding: "15px",
                background: hasWalker ? "#007AFF" : "#c7c7cc",
                border: "none",
                borderRadius: 12,
                color: "#fff",
                fontSize: 17,
                fontWeight: 600,
                cursor: hasWalker ? "pointer" : "default",
                marginTop: 8,
                transition: "background 0.15s",
              }}
            >
              {saving ? "Saving..." : "Save Walk"}
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading && view === "home" && (
          <div style={{ padding: "60px 20px", textAlign: "center", color: "#8e8e93" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🐕</div>
            Loading...
          </div>
        )}
      </div>
    </>
  );
}
