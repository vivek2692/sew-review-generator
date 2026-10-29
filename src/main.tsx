import React, { useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { categories } from "./categories";
import "./styles.css";

type Language = "en" | "gu" | "hi";
type ResultSource = "ai" | "fallback";

const rawGoogleReviewUrl = (import.meta.env.VITE_GOOGLE_REVIEW_URL || "").trim();
const GOOGLE_REVIEW_URL = (() => {
  try {
    const url = new URL(rawGoogleReviewUrl);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
})();

function App() {
  const [language, setLanguage] = useState<Language>("en");
  const [selected, setSelected] = useState<string[]>([]);
  const [review, setReview] = useState("");
  const [source, setSource] = useState<ResultSource | null>(null);
  const [message, setMessage] = useState<{ kind: "success" | "error" | "info"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const requestId = useRef(0);
  const activeController = useRef<AbortController | null>(null);
  const characterCount = useMemo(() => review.length, [review]);

  function toggle(id: string) {
    const next = selected.includes(id)
      ? selected.filter((item) => item !== id)
      : [...selected, id];

    setSelected(next);
    setMessage(null);
    setCopied(false);

    if (next.length > 0) {
      void generate(next, language);
    } else {
      requestId.current += 1;
      activeController.current?.abort();
      activeController.current = null;
      setMessage({ kind: "info", text: "Select a category to create a review draft." });
    }
  }

  async function generate(categoriesToGenerate: string[], languageToUse: Language) {
    if (categoriesToGenerate.length === 0) return;

    // Cancel an older request so the draft always matches the latest selections.
    requestId.current += 1;
    const thisRequestId = requestId.current;
    activeController.current?.abort();
    const controller = new AbortController();
    activeController.current = controller;

    setMessage(null);
    setCopied(false);

    const timer = window.setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetch("/api/reviews/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ language: languageToUse, categories: categoriesToGenerate }),
        signal: controller.signal,
      });

      const data = (await response.json().catch(() => null)) as
        | { review?: unknown; source?: unknown; error?: unknown }
        | null;

      if (!response.ok || typeof data?.review !== "string") {
        throw new Error(typeof data?.error === "string" ? data.error : "We couldn't generate a draft right now.");
      }

      if (thisRequestId !== requestId.current) return;

      setReview(data.review);
      setSource(data.source === "ai" ? "ai" : "fallback");
      setMessage({
        kind: "success",
        text: "Your draft is ready. Please edit it so it reflects your real experience."
      });
    } catch (error) {
      if (thisRequestId !== requestId.current) return;
      setMessage({
        kind: "error",
        text:
          error instanceof Error && error.name === "AbortError"
            ? "The request took too long. Your existing draft is still here."
            : "We couldn't reach the generator. Your existing draft is still here; please try again later.",
      });
    } finally {
      window.clearTimeout(timer);
      if (thisRequestId === requestId.current) {
        activeController.current = null;
      }
    }
  }

  function changeLanguage(nextLanguage: Language) {
    setLanguage(nextLanguage);
    setMessage(null);
    if (selected.length > 0) {
      void generate(selected, nextLanguage);
    }
  }

  async function copyReview(): Promise<boolean> {
    if (!review.trim()) {
      setMessage({ kind: "info", text: "Generate or write a review before copying." });
      return false;
    }
    try {
      await navigator.clipboard.writeText(review);
      setCopied(true);
      setMessage({ kind: "success", text: "Review copied. You can paste it wherever you choose." });
      return true;
    } catch {
      setCopied(false);
      setMessage({ kind: "info", text: "Clipboard access was blocked. Select the review text and copy it manually." });
      return false;
    }
  }

  async function openGoogle() {
    if (!GOOGLE_REVIEW_URL) return;
    const tab = window.open(GOOGLE_REVIEW_URL, "_blank");
    if (tab) tab.opener = null;
    const ok = await copyReview();
    if (!tab) {
      setMessage({
        kind: "info",
        text: ok
          ? "Review copied, but your browser blocked the new tab. Allow pop-ups or open the shop's Google review link from the shop."
          : "Your browser blocked the new tab and clipboard access. Copy the text manually and open the shop's Google review page.",
      });
    } else if (!ok) {
      setMessage({ kind: "info", text: "Google Reviews opened. Copy the review text manually before submitting." });
    } else {
      setMessage({ kind: "success", text: "Review copied and Google Reviews opened in a new tab. Paste, review, and submit it yourself." });
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="HEKAM Sewing Machine">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 48 48">
              <path d="M9 32c8-1 10-12 17-12h7v8h-8c-5 0-7 7-13 7H9z" />
              <path d="M29 12h8v8h-8zM11 13l7 7M8 9l5 5M35 29v8" />
            </svg>
          </span>
          <span><strong>HEKAM Sewing Machine & Repairing Hiralal K. Bros.</strong><small>Clothes sewing - Rajkot, Gujarat 360001</small></span>
        </a>
      </header>

      <main id="top" className="layout">
        <section className="intro">
          <div className="eyebrow"><span>✳</span> A LITTLE HELP, FROM US TO YOU</div>
          <h1>Share your<br /><em>experience.</em></h1>
          <p className="intro-copy">A few simple prompts can help you put your thoughts into words. Create a review draft, make it your own, and share only what feels true.</p>
          <div className="trust-line"><span className="check-circle">✓</span> No sign-up · Your draft stays in your browser</div>
          <div className="stitch-art" aria-hidden="true">
            <div className="sun-disc" /><div className="thread-line" />
            <div className="machine-drawing">
              <svg viewBox="0 0 300 190">
                <path d="M47 143h200v15H47zM65 143V70q0-18 20-18h83q23 0 23 22v16h-37V75h-38v29h65v39M191 92h22v25h-22M211 117h-17v26M79 83h25M79 96h25M79 109h25M106 143v-25h34v25M140 118h35" />
                <circle cx="123" cy="131" r="7" /><path d="M225 142q15-10 0-20" />
              </svg>
            </div>
            <span className="art-caption">Made with care, stitched with pride.</span>
          </div>
        </section>

        <section className="form-panel" aria-label="Review generator">
          <div className="panel-heading">
            <div><span className="step-label">YOUR REVIEW, YOUR WAY</span><h2>Let's get started</h2></div>
            <span className="steps-count">01 <i>/</i> 03</span>
          </div>

          <div className="step-block">
            <div className="step-title"><span className="step-number">1</span><div><h3>Choose your language</h3><p>Pick the way you'd naturally speak.</p></div></div>
            <div className="language-options" role="group" aria-label="Review language">
              {([
                { id: "en", title: "English", sub: "English" },
                { id: "gu", title: "ગુજરાતી", sub: "Gujarati" },
                { id: "hi", title: "हिंदी", sub: "Hindi" },
              ] as const).map((item) => (
                <button key={item.id} type="button" className={`language-option ${language === item.id ? "active" : ""}`} aria-pressed={language === item.id} onClick={() => changeLanguage(item.id)}>
                  <span className="language-title">{item.title}</span><span className="language-sub">{item.sub}</span><span className="radio-dot" aria-hidden="true" />
                </button>
              ))}
            </div>
            <p className="language-hint"><span>ⓘ</span> Gujarati and Hindi drafts are written using English letters, not their native scripts.</p>
          </div>

          <div className="step-block topics-block">
            <div className="step-title"><span className="step-number">2</span><div><h3>What did you like?</h3><p>Select the things you genuinely liked about your experience.</p></div></div>
            <div className="topic-grid">
              {categories.map((item, index) => (
                <label key={item.id} className={`topic-card ${selected.includes(item.id) ? "selected" : ""}`}>
                  <input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id)} />
                  <span className="topic-icon" aria-hidden="true">{["✦", "₹", "⌁", "☝", "◇", "▦", "♡", "✓"][index]}</span>
                  <span className="topic-label">{item.label}</span><span className="topic-check" aria-hidden="true">✓</span>
                </label>
              ))}
            </div>
            <div className="selection-footer"><span>{selected.length} of 8 selected</span><span>Choose at least one</span></div>
          </div>

          <div className="step-block editor-block">
            <div className="step-title"><span className="step-number">3</span><div><h3>Read it. Edit it. Own it.</h3><p>Only share a review that reflects your real experience.</p></div></div>
            <div className="editor-wrap">
              <label className="editor-label" htmlFor="review-text">YOUR REVIEW DRAFT <span>{characterCount} characters</span></label>
              <textarea id="review-text" value={review} onChange={(event) => { setReview(event.target.value); setCopied(false); }} placeholder="Your review draft will appear here… You can also write your own words." rows={6} maxLength={1200} />
              <div className="editor-footer">
                <span>{source === "ai" ? "✦ AI-assisted draft" : source === "fallback" ? "◌ Ready-to-use sample draft" : "Your words matter most"}</span>
                <button type="button" className="text-button" onClick={() => { setReview(""); setSource(null); setCopied(false); setMessage({ kind: "info", text: "Draft cleared. You can write your own review here." }); }} disabled={!review}>Clear draft</button>
              </div>
            </div>
            <div className="action-row">
              <button className="secondary-button" type="button" onClick={copyReview} disabled={!review.trim()}><span>{copied ? "✓" : "▢"}</span>{copied ? "Copied!" : "Copy review"}</button>
              <button className="google-button" type="button" onClick={openGoogle} disabled={!GOOGLE_REVIEW_URL || !review.trim()}><span className="google-g">G</span> Copy &amp; open Google Reviews <span className="button-arrow">↗</span></button>
            </div>
            {!GOOGLE_REVIEW_URL && <p className="setup-note">The shop's Google review link hasn't been configured yet.</p>}
            {message && <div className={`status-message ${message.kind}`} role="status" aria-live="polite"><span aria-hidden="true">{message.kind === "success" ? "✓" : message.kind === "error" ? "!" : "ⓘ"}</span>{message.text}</div>}
          </div>

          <footer className="panel-footer"><span>✳ Be honest. Be yourself.</span><span>Reviews are never posted automatically.</span></footer>
        </section>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);