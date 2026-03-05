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

/* ── iOS-style toggle ── */
function IOSToggle({ label, value, onChange }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 16px",
        cursor: "pointer",
      }}
    >
      <span style={{ fontSize: 16, color: "#1c1c1e" }}>{label}</span>
      <div
        style={{
          width: 51,
          height: 31,
          borderRadius: 16,
          background: value ? "#34C759" : "#e9e9eb",
          padding: 2,
          transition: "background 0.2s",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            width: 27,
            height: 27,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
            transition: "transform 0.2s",
            transform: value ? "translateX(20px)" : "translateX(0)",
          }}
        />
      </div>
    </div>
  );
}

/* ── rating selector ── */
function RatingSelector({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            border: "none",
            background: n <= value ? "#007AFF" : "#f2f2f7",
            color: n <= value ? "#fff" : "#8e8e93",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

/* ── iOS card wrapper ── */
function Card({ children, style }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        marginBottom: 12,
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ── divider ── */
function Divider() {
  return <div style={{ height: 1, background: "#f2f2f7", marginLeft: 16 }} />;
}

/* ── walk card ── */
function WalkCard({ walk, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        padding: "14px 16px",
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: "#1c1c1e" }}>
              {walk.walker}
            </span>
            <span style={{ fontSize: 14, color: "#8e8e93" }}>
              {formatDate(walk.date)}
            </span>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
            {walk.duration && (
              <span style={{ fontSize: 13, color: "#8e8e93" }}>
                {walk.duration} min
              </span>
            )}
            {walk.lunged && (
              <span
                style={{
                  fontSize: 12,
                  background: "#FFF3CD",
                  color: "#856404",
                  padding: "2px 8px",
                  borderRadius: 6,
                  fontWeight: 500,
                }}
              >
                Lunged
              </span>
            )}
            {walk.dogPark && (
              <span
                style={{
                  fontSize: 12,
                  background: "#D1ECF1",
                  color: "#0C5460",
                  padding: "2px 8px",
                  borderRadius: 6,
                  fontWeight: 500,
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
            borderRadius: 10,
            padding: "4px 12px",
            fontSize: 17,
            fontWeight: 700,
            color: "#fff",
            minWidth: 36,
            textAlign: "center",
          }}
        >
          {walk.rating}
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #f2f2f7" }}>
          <div style={{ fontSize: 13, color: "#8e8e93", marginBottom: 4 }}>
            {formatFullDate(walk.date)}
          </div>
          {walk.notes && (
            <p style={{ fontSize: 15, color: "#3a3a3c", margin: "8px 0", lineHeight: 1.5 }}>
              {walk.notes}
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
                borderRadius: 10,
                marginTop: 8,
              }}
            />
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm("Delete this walk?")) onDelete(walk.id);
            }}
            style={{
              marginTop: 12,
              background: "none",
              border: "none",
              color: "#FF3B30",
              fontSize: 15,
              cursor: "pointer",
              padding: 0,
            }}
          >
            Delete Walk
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

  const bg = "#f2f2f7";

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', system-ui, sans-serif",
        }}
      >
        <div style={{ textAlign: "center", color: "#8e8e93" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🐕</div>
          <div>Loading Pepper's walks...</div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: bg,
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', system-ui, sans-serif",
        maxWidth: 480,
        margin: "0 auto",
        paddingBottom: 40,
      }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input, textarea { font-family: inherit; }
      `}</style>

      {/* ════════ HEADER ════════ */}
      <div
        style={{
          padding: "52px 20px 16px",
          textAlign: "center",
          background: "#fff",
          borderBottom: "1px solid #e5e5ea",
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 700, color: "#1c1c1e" }}>
          Pepper 🐾
        </div>
        {streak > 1 && (
          <div style={{ fontSize: 13, color: "#FF9500", marginTop: 4, fontWeight: 500 }}>
            🔥 {streak}-day streak
          </div>
        )}
      </div>

      {/* ════════ HOME VIEW ════════ */}
      {view === "home" && (
        <div style={{ padding: "16px 16px 0", animation: "fadeIn 0.2s ease" }}>
          {/* Stats */}
          <Card>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr" }}>
              {[
                { label: "This Week", value: last7 },
                { label: "Avg Rating", value: avgRating },
                { label: "Total", value: totalWalks },
                { label: "Lunge %", value: `${lungeRate}%` },
              ].map((s, i) => (
                <div
                  key={i}
                  style={{
                    padding: "14px 8px",
                    textAlign: "center",
                    borderRight: i < 3 ? "1px solid #f2f2f7" : "none",
                  }}
                >
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#007AFF" }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: 11, color: "#8e8e93", marginTop: 2 }}>
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
              padding: "16px",
              background: "#007AFF",
              border: "none",
              borderRadius: 12,
              color: "#fff",
              fontSize: 17,
              fontWeight: 600,
              cursor: "pointer",
              marginBottom: 20,
            }}
          >
            + Log a Walk
          </button>

          {/* Recent walks */}
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#8e8e93",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              padding: "0 4px",
              marginBottom: 8,
            }}
          >
            Recent Walks
          </div>

          {walks.length === 0 ? (
            <Card style={{ padding: "40px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🐕</div>
              <div style={{ fontSize: 16, color: "#8e8e93" }}>No walks yet</div>
              <div style={{ fontSize: 14, color: "#aeaeb2", marginTop: 4 }}>
                Tap "Log a Walk" to get started
              </div>
            </Card>
          ) : (
            <Card>
              {walks.slice(0, 30).map((w, i) => (
                <div key={w.id}>
                  {i > 0 && <Divider />}
                  <WalkCard walk={w} onDelete={deleteWalk} />
                </div>
              ))}
            </Card>
          )}
        </div>
      )}

      {/* ════════ LOG VIEW ════════ */}
      {view === "log" && (
        <div style={{ padding: "16px 16px 0", animation: "fadeIn 0.2s ease" }}>
          {/* Nav bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <button
              onClick={() => setView("home")}
              style={{
                background: "none",
                border: "none",
                color: "#007AFF",
                fontSize: 17,
                cursor: "pointer",
                padding: 0,
              }}
            >
              Cancel
            </button>
            <span style={{ fontSize: 17, fontWeight: 600, color: "#1c1c1e" }}>
              New Walk
            </span>
            <button
              onClick={saveWalk}
              disabled={!walker || saving}
              style={{
                background: "none",
                border: "none",
                color: walker ? "#007AFF" : "#aeaeb2",
                fontSize: 17,
                fontWeight: 600,
                cursor: walker ? "pointer" : "default",
                padding: 0,
              }}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>

          {/* Who walked */}
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#8e8e93",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              padding: "0 4px",
              marginBottom: 8,
            }}
          >
            Who walked Pepper?
          </div>
          <Card>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
              {["You", "Wife"].map((w, i) => (
                <button
                  key={w}
                  onClick={() => setWalker(w)}
                  style={{
                    padding: "14px 16px",
                    border: "none",
                    borderRight: i === 0 ? "1px solid #f2f2f7" : "none",
                    background: walker === w ? "#007AFF" : "#fff",
                    color: walker === w ? "#fff" : "#1c1c1e",
                    fontSize: 16,
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {w === "You" ? "🙋 Matt" : "🙋‍♀️ Sarah"}
                </button>
              ))}
            </div>
          </Card>

          {/* Rating */}
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#8e8e93",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              padding: "0 4px",
              marginBottom: 8,
              marginTop: 20,
            }}
          >
            Rating
          </div>
          <Card style={{ padding: "14px 12px" }}>
            <RatingSelector value={rating} onChange={setRating} />
          </Card>

          {/* Toggles */}
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#8e8e93",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              padding: "0 4px",
              marginBottom: 8,
              marginTop: 20,
            }}
          >
            Details
          </div>
          <Card>
            <IOSToggle label="⚡ Lunged" value={lunged} onChange={setLunged} />
            <Divider />
            <IOSToggle label="🏞️ Dog Park" value={dogPark} onChange={setDogPark} />
            <Divider />
            <div style={{ padding: "12px 16px" }}>
              <div style={{ fontSize: 16, color: "#1c1c1e", marginBottom: 8 }}>
                Duration (minutes)
              </div>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="Optional"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  background: "#f2f2f7",
                  border: "none",
                  borderRadius: 8,
                  color: "#1c1c1e",
                  fontSize: 16,
                  outline: "none",
                }}
              />
            </div>
          </Card>

          {/* Notes */}
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#8e8e93",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              padding: "0 4px",
              marginBottom: 8,
              marginTop: 20,
            }}
          >
            Notes
          </div>
          <Card style={{ padding: "12px 16px" }}>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How was the walk?"
              rows={3}
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "#f2f2f7",
                border: "none",
                borderRadius: 8,
                color: "#1c1c1e",
                fontSize: 16,
                outline: "none",
                resize: "vertical",
                lineHeight: 1.5,
                fontFamily: "inherit",
              }}
            />
          </Card>

          {/* Photo */}
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#8e8e93",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              padding: "0 4px",
              marginBottom: 8,
              marginTop: 20,
            }}
          >
            Photo
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhoto}
            style={{ display: "none" }}
          />
          {photo ? (
            <Card style={{ position: "relative", overflow: "hidden" }}>
              <img
                src={photo}
                alt="Walk"
                style={{ width: "100%", maxHeight: 200, objectFit: "cover", display: "block" }}
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
                  background: "rgba(0,0,0,0.5)",
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
                  padding: "16px",
                  background: "#fff",
                  border: "none",
                  color: "#007AFF",
                  fontSize: 16,
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                📷 Add Photo
              </button>
            </Card>
          )}

          {/* Bottom save button (for easy thumb reach) */}
          <button
            onClick={saveWalk}
            disabled={!walker || saving}
            style={{
              width: "100%",
              padding: "16px",
              background: walker ? "#007AFF" : "#e5e5ea",
              border: "none",
              borderRadius: 12,
              color: walker ? "#fff" : "#aeaeb2",
              fontSize: 17,
              fontWeight: 600,
              cursor: walker ? "pointer" : "default",
              marginTop: 24,
              transition: "all 0.15s",
            }}
          >
            {saving ? "Saving..." : "Save Walk"}
          </button>
        </div>
      )}
    </div>
  );
}
