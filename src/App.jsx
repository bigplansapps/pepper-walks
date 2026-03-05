import { useState, useEffect, useCallback, useRef } from "react";
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

/* ── colours & constants ── */
const WALKER_COLORS = { You: "#E8A87C", Wife: "#85CDCA" };

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

/* ── rating dots ── */
function RatingDots({ value, onChange, size = 32 }) {
  return (
    <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap" }}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            border: "2px solid",
            borderColor: n <= value ? "#D4845A" : "rgba(180,160,140,0.3)",
            background:
              n <= value
                ? "linear-gradient(135deg, #E8A87C, #D4845A)"
                : "rgba(255,255,255,0.05)",
            color: n <= value ? "#fff" : "rgba(180,160,140,0.5)",
            fontSize: size * 0.4,
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: n <= value ? "scale(1.05)" : "scale(1)",
            boxShadow: n <= value ? "0 2px 8px rgba(212,132,90,0.3)" : "none",
          }}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

/* ── toggle pill ── */
function TogglePill({ label, emoji, value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "12px 18px",
        borderRadius: 14,
        border: `2px solid ${value ? "#D4845A" : "rgba(180,160,140,0.15)"}`,
        background: value ? "rgba(212,132,90,0.12)" : "rgba(255,255,255,0.03)",
        color: value ? "#E8A87C" : "rgba(180,160,140,0.5)",
        fontSize: 15,
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.2s",
        flex: 1,
      }}
    >
      <span style={{ fontSize: 18 }}>{emoji}</span>
      {label}
      <span
        style={{
          marginLeft: "auto",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: 0.5,
        }}
      >
        {value ? "YES" : "NO"}
      </span>
    </button>
  );
}

/* ── walk card ── */
function WalkCard({ walk, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const walkerColor = WALKER_COLORS[walk.walker] || "#ccc";

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        background: "rgba(255,255,255,0.04)",
        borderRadius: 16,
        padding: "16px 20px",
        cursor: "pointer",
        borderLeft: `4px solid ${walkerColor}`,
        transition: "all 0.2s",
        marginBottom: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: walkerColor,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              {walk.walker}
            </span>
            <span style={{ fontSize: 12, color: "rgba(180,160,140,0.5)" }}>•</span>
            <span style={{ fontSize: 13, color: "rgba(180,160,140,0.6)" }}>
              {formatDate(walk.date)}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
            {walk.duration && (
              <span style={{ fontSize: 12, color: "rgba(180,160,140,0.4)" }}>
                {walk.duration} min
              </span>
            )}
            {walk.lunged && (
              <span
                style={{
                  fontSize: 11,
                  background: "rgba(220,120,100,0.15)",
                  color: "#DC7864",
                  padding: "2px 8px",
                  borderRadius: 6,
                  fontWeight: 600,
                }}
              >
                Lunged
              </span>
            )}
            {walk.dogPark && (
              <span
                style={{
                  fontSize: 11,
                  background: "rgba(133,205,202,0.15)",
                  color: "#85CDCA",
                  padding: "2px 8px",
                  borderRadius: 6,
                  fontWeight: 600,
                }}
              >
                Dog Park
              </span>
            )}
          </div>
        </div>
        <div
          style={{
            background: "linear-gradient(135deg, #E8A87C, #D4845A)",
            borderRadius: 12,
            padding: "6px 14px",
            fontSize: 18,
            fontWeight: 800,
            color: "#fff",
            minWidth: 44,
            textAlign: "center",
            fontFamily: "'DM Serif Display', Georgia, serif",
          }}
        >
          {walk.rating}
        </div>
      </div>

      {expanded && (
        <div
          style={{
            marginTop: 14,
            paddingTop: 14,
            borderTop: "1px solid rgba(180,160,140,0.1)",
            animation: "fadeIn 0.2s ease",
          }}
        >
          <div style={{ fontSize: 12, color: "rgba(180,160,140,0.5)", marginBottom: 4 }}>
            {formatFullDate(walk.date)}
          </div>
          {walk.notes && (
            <p
              style={{
                fontSize: 14,
                color: "rgba(230,220,210,0.8)",
                margin: "8px 0",
                lineHeight: 1.5,
                fontStyle: "italic",
              }}
            >
              "{walk.notes}"
            </p>
          )}
          {walk.photo && (
            <img
              src={walk.photo}
              alt="Walk"
              style={{
                width: "100%",
                maxHeight: 240,
                objectFit: "cover",
                borderRadius: 12,
                marginTop: 8,
              }}
            />
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(walk.id);
            }}
            style={{
              marginTop: 12,
              background: "none",
              border: "1px solid rgba(200,100,100,0.3)",
              color: "rgba(200,100,100,0.6)",
              fontSize: 12,
              padding: "6px 14px",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Delete walk
          </button>
        </div>
      )}
    </div>
  );
}

/* ── main app ── */
export default function App() {
  const [walks, setWalks] = useState([]);
  const [view, setView] = useState("home");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Log form state
  const [walker, setWalker] = useState("");
  const [rating, setRating] = useState(7);
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState(null);
  const [lunged, setLunged] = useState(false);
  const [dogPark, setDogPark] = useState(false);
  const fileRef = useRef(null);

  /* ── real-time sync from Firebase ── */
  useEffect(() => {
    const q = query(collection(db, "walks"), orderBy("date", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setWalks(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  /* ── save walk ── */
  const saveWalk = async () => {
    if (!walker) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "walks"), {
        walker,
        rating,
        duration: duration ? Number(duration) : null,
        notes: notes || null,
        photo: photo || null,
        lunged,
        dogPark,
        date: new Date().toISOString(),
        createdAt: serverTimestamp(),
      });
      // Reset form
      setWalker("");
      setRating(7);
      setDuration("");
      setNotes("");
      setPhoto(null);
      setLunged(false);
      setDogPark(false);
      setView("home");
    } catch (err) {
      alert("Couldn't save — please try again.");
      console.error(err);
    }
    setSaving(false);
  };

  /* ── delete walk ── */
  const deleteWalk = async (id) => {
    try {
      await deleteDoc(doc(db, "walks", id));
    } catch {
      alert("Couldn't delete — please try again.");
    }
  };

  /* ── photo handling ── */
  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      alert("Photo is too large. Please use one under 3MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setPhoto(ev.target.result);
    reader.readAsDataURL(file);
  };

  /* ── stats ── */
  const totalWalks = walks.length;
  const avgRating = totalWalks
    ? (walks.reduce((s, w) => s + w.rating, 0) / totalWalks).toFixed(1)
    : "—";
  const last7 = walks.filter((w) => new Date() - new Date(w.date) < 7 * 86400000).length;
  const lungeRate = totalWalks
    ? Math.round((walks.filter((w) => w.lunged).length / totalWalks) * 100)
    : 0;
  const streak = (() => {
    if (!walks.length) return 0;
    let count = 0;
    const sorted = [...walks].sort((a, b) => new Date(b.date) - new Date(a.date));
    let checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);
    for (let i = 0; i < 60; i++) {
      const dayStr = checkDate.toDateString();
      if (sorted.some((w) => new Date(w.date).toDateString() === dayStr)) {
        count++;
      } else if (i > 0) {
        break;
      }
      checkDate.setDate(checkDate.getDate() - 1);
    }
    return count;
  })();

  /* ── styles ── */
  const containerStyle = {
    minHeight: "100vh",
    background: "linear-gradient(170deg, #1a1612 0%, #2a2218 40%, #1e1a14 100%)",
    color: "#E6DCD0",
    fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif",
    maxWidth: 480,
    margin: "0 auto",
    position: "relative",
    paddingBottom: 100,
  };

  if (loading) {
    return (
      <div
        style={{
          ...containerStyle,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center", opacity: 0.5 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🐕</div>
          <div>Loading Pepper's walks...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap"
        rel="stylesheet"
      />
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input, textarea { font-family: inherit; }
        ::placeholder { color: rgba(180,160,140,0.35); }
      `}</style>

      {/* HEADER */}
      <div style={{ padding: "32px 24px 20px", textAlign: "center" }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: "rgba(180,160,140,0.4)",
            marginBottom: 4,
            fontWeight: 600,
          }}
        >
          Walk Tracker
        </div>
        <h1
          style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: 36,
            fontWeight: 400,
            background: "linear-gradient(135deg, #E8A87C, #85CDCA)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: -0.5,
          }}
        >
          Pepper 🐾
        </h1>
        {streak > 1 && (
          <div
            style={{
              fontSize: 12,
              color: "#E8A87C",
              marginTop: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            🔥 {streak}-day streak!
          </div>
        )}
      </div>

      {/* ════════ HOME VIEW ════════ */}
      {view === "home" && (
        <div style={{ padding: "0 20px", animation: "fadeIn 0.3s ease" }}>
          {/* Stats row */}
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 24 }}
          >
            {[
              { label: "This Week", value: last7 },
              { label: "Avg Rating", value: avgRating },
              { label: "Total", value: totalWalks },
              { label: "Lunge %", value: `${lungeRate}%` },
            ].map((s, i) => (
              <div
                key={i}
                style={{
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: 14,
                  padding: "14px 6px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    fontFamily: "'DM Serif Display', Georgia, serif",
                    color: "#E8A87C",
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "rgba(180,160,140,0.45)",
                    marginTop: 2,
                    letterSpacing: 0.5,
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* Big LOG button */}
          <button
            onClick={() => setView("log")}
            style={{
              width: "100%",
              padding: "18px",
              background: "linear-gradient(135deg, #D4845A, #C06A3A)",
              border: "none",
              borderRadius: 16,
              color: "#fff",
              fontSize: 18,
              fontWeight: 700,
              cursor: "pointer",
              marginBottom: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              boxShadow: "0 4px 20px rgba(212,132,90,0.3)",
              letterSpacing: 0.5,
            }}
          >
            <span style={{ fontSize: 22 }}>+</span> Log a Walk
          </button>

          {/* Recent walks */}
          <h2
            style={{
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              color: "rgba(180,160,140,0.45)",
              marginBottom: 14,
            }}
          >
            Recent Walks
          </h2>

          {walks.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "48px 20px",
                color: "rgba(180,160,140,0.35)",
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 12 }}>🐕</div>
              <div style={{ fontSize: 15 }}>No walks yet!</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>
                Tap "Log a Walk" to get started
              </div>
            </div>
          ) : (
            walks.slice(0, 30).map((w) => (
              <WalkCard key={w.id} walk={w} onDelete={deleteWalk} />
            ))
          )}
        </div>
      )}

      {/* ════════ LOG VIEW ════════ */}
      {view === "log" && (
        <div style={{ padding: "0 20px", animation: "slideUp 0.3s ease" }}>
          <button
            onClick={() => setView("home")}
            style={{
              background: "none",
              border: "none",
              color: "rgba(180,160,140,0.5)",
              fontSize: 14,
              cursor: "pointer",
              marginBottom: 20,
              padding: 0,
            }}
          >
            ← Back
          </button>

          {/* Who walked? */}
          <div style={{ marginBottom: 28 }}>
            <label style={labelStyle}>Who walked Pepper?</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {["You", "Wife"].map((w) => (
                <button
                  key={w}
                  onClick={() => setWalker(w)}
                  style={{
                    padding: "16px",
                    borderRadius: 14,
                    border: `2px solid ${
                      walker === w ? WALKER_COLORS[w] : "rgba(180,160,140,0.15)"
                    }`,
                    background:
                      walker === w ? `${WALKER_COLORS[w]}15` : "rgba(255,255,255,0.03)",
                    color: walker === w ? WALKER_COLORS[w] : "rgba(180,160,140,0.5)",
                    fontSize: 16,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {w === "You" ? "🙋 Me" : "🙋‍♀️ Her"}
                </button>
              ))}
            </div>
          </div>

          {/* Rating */}
          <div style={{ marginBottom: 28 }}>
            <label style={labelStyle}>How was the walk?</label>
            <RatingDots value={rating} onChange={setRating} />
          </div>

          {/* Lunged + Dog Park toggles */}
          <div style={{ marginBottom: 28 }}>
            <label style={labelStyle}>What happened?</label>
            <div style={{ display: "flex", gap: 10 }}>
              <TogglePill
                label="Lunged"
                emoji="⚡"
                value={lunged}
                onChange={setLunged}
              />
              <TogglePill
                label="Dog Park"
                emoji="🏞️"
                value={dogPark}
                onChange={setDogPark}
              />
            </div>
          </div>

          {/* Duration */}
          <div style={{ marginBottom: 28 }}>
            <label style={labelStyle}>Duration (minutes) — optional</label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g. 30"
              style={inputStyle}
            />
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 28 }}>
            <label style={labelStyle}>Notes — optional</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Pepper chased a squirrel 🐿️"
              rows={3}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
            />
          </div>

          {/* Photo */}
          <div style={{ marginBottom: 36 }}>
            <label style={labelStyle}>Photo — optional</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhoto}
              style={{ display: "none" }}
            />
            {photo ? (
              <div style={{ position: "relative" }}>
                <img
                  src={photo}
                  alt="Walk"
                  style={{
                    width: "100%",
                    maxHeight: 200,
                    objectFit: "cover",
                    borderRadius: 12,
                  }}
                />
                <button
                  onClick={() => {
                    setPhoto(null);
                    fileRef.current.value = "";
                  }}
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    background: "rgba(0,0,0,0.6)",
                    border: "none",
                    color: "#fff",
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    cursor: "pointer",
                    fontSize: 16,
                  }}
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                style={{
                  width: "100%",
                  padding: "20px",
                  background: "rgba(255,255,255,0.03)",
                  border: "2px dashed rgba(180,160,140,0.15)",
                  borderRadius: 12,
                  color: "rgba(180,160,140,0.4)",
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                📷 Tap to add photo
              </button>
            )}
          </div>

          {/* Save */}
          <button
            onClick={saveWalk}
            disabled={!walker || saving}
            style={{
              width: "100%",
              padding: "18px",
              background: walker
                ? "linear-gradient(135deg, #D4845A, #C06A3A)"
                : "rgba(180,160,140,0.15)",
              border: "none",
              borderRadius: 16,
              color: walker ? "#fff" : "rgba(180,160,140,0.3)",
              fontSize: 17,
              fontWeight: 700,
              cursor: walker ? "pointer" : "default",
              marginBottom: 20,
              boxShadow: walker ? "0 4px 20px rgba(212,132,90,0.3)" : "none",
              transition: "all 0.2s",
            }}
          >
            {saving ? "Saving..." : "Save Walk ✓"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── shared styles ── */
const labelStyle = {
  fontSize: 12,
  letterSpacing: 1.5,
  textTransform: "uppercase",
  color: "rgba(180,160,140,0.45)",
  fontWeight: 600,
  display: "block",
  marginBottom: 10,
};

const inputStyle = {
  width: "100%",
  padding: "14px 16px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(180,160,140,0.12)",
  borderRadius: 12,
  color: "#E6DCD0",
  fontSize: 16,
  outline: "none",
};
