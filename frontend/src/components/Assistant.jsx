import React, { useEffect, useRef, useState } from "react";

// MFNet AI assistant.
//
// Talks only to our own /api/assistant/chat endpoint - the AI provider key
// lives on the server and is never shipped to the browser.
//
// Whichever token is in localStorage is forwarded, so a logged-in borrower
// gets answers grounded in their own loans and balances while a visitor on
// the public site gets general help. The backend decides what context to
// attach; the widget just passes the token along.

const SUGGESTIONS = {
  member: [
    "How much do I owe?",
    "How do I pay?",
    "Where has my form reached?",
  ],
  staff: [
    "How do loan approvals work?",
    "What does giving out a loan do?",
    "Where do I add a guarantor?",
  ],
  public: [
    "How do I apply for a loan?",
    "How do I get an account?",
    "What is a guarantor?",
  ],
};

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function tokenFor(audience) {
  if (audience === "member") return localStorage.getItem("mfnet_portal_token");
  if (audience === "staff") return localStorage.getItem("mfnet_token");
  return null;
}

// The model is told it may use **bold**; render that rather than leaking
// asterisks into the transcript.
function renderText(text) {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
}

export default function Assistant({ audience = "public" }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        audience === "staff"
          ? "I am the MFNet assistant. Ask me how any part of the system works — approvals, giving out loans, payment schedules, savings, or the activity log."
          : "Hello. I can help you apply for a loan, check where your form has reached, understand when your payments are due, or pay by card. What would you like to know?",
    },
  ]);
  const logRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages, busy]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  // Escape closes the panel.
  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function send(text) {
    const message = (text ?? input).trim();
    if (!message || busy) return;

    const nextMessages = [...messages, { role: "user", content: message }];
    setMessages(nextMessages);
    setInput("");
    setBusy(true);

    try {
      const token = tokenFor(audience);
      const res = await fetch(`${API_BASE}/assistant/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message,
          // Only prior turns, capped server-side too.
          history: nextMessages.slice(0, -1).slice(-10),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: data.message || "I cannot answer right now. Please try again in a moment.",
          },
        ]);
      } else {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: data.reply, note: data.reason || null },
        ]);
      }
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "I could not connect. Check that the MFNet server is running, then try again.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button className="chat-launch" onClick={() => setOpen(true)} aria-label="Open the MFNet assistant">
        <span className="spark" aria-hidden="true">✦</span>
        Ask MFNet
      </button>
    );
  }

  const suggestions = SUGGESTIONS[audience] || SUGGESTIONS.public;

  return (
    <div className="chat-window" role="dialog" aria-label="MFNet assistant">
      <div className="chat-head">
        <div className="chat-head-text">
          <strong>MFNet Assistant</strong>
          <span>Ask about loans, savings and payments</span>
        </div>
        <button className="chat-close" onClick={() => setOpen(false)} aria-label="Close the assistant">
          ×
        </button>
      </div>

      <div className="chat-log" ref={logRef} aria-live="polite">
        {messages.map((m, i) => (
          <React.Fragment key={i}>
            <div className={`chat-msg ${m.role === "user" ? "chat-msg-user" : "chat-msg-bot"}`}>
              {renderText(m.content)}
            </div>
            {m.note && <div className="chat-meta">{m.note}</div>}
          </React.Fragment>
        ))}
        {busy && (
          <div className="chat-msg chat-msg-bot">
            <span className="chat-typing" aria-label="Thinking">
              <i /> <i /> <i />
            </span>
          </div>
        )}
      </div>

      {messages.length <= 1 && (
        <div className="chat-suggestions">
          {suggestions.map((s) => (
            <button key={s} className="chat-suggestion" onClick={() => send(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="chat-form">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
          placeholder="Type your question…"
          maxLength={1000}
          aria-label="Your message"
        />
        <button className="btn btn-primary btn-sm" onClick={() => send()} disabled={busy || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}
