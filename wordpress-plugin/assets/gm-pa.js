(function () {
    const cfg = window.GM_PA;
    if (!cfg || !cfg.apiBase || !cfg.pageId) return;
  
    const root = document.getElementById("gm-pa-root");
    if (!root) return;
  
    // prevent double init
    if (root.dataset.gmPaInit === "1") return;
    root.dataset.gmPaInit = "1";
  
    const apiBase = cfg.apiBase.replace(/\/$/, "");
    const SESSION_MIN_KEY = `gm_pa_min:${cfg.pageId}`;
  
    // Ensure launcher exists (outside root)
    let launcher = document.querySelector(".gm-pa-launcher");
    if (!launcher) {
      launcher = document.createElement("button");
      launcher.className = "gm-pa-launcher";
      launcher.type = "button";
      launcher.setAttribute("aria-label", "Open Page Assistant");
      launcher.innerHTML = `
        <span class="gm-pa-launcher-icon" aria-hidden="true">
          <svg class="gm-pa-icon" width="18" height="18" viewBox="0 0 24 24" fill="none"
            xmlns="http://www.w3.org/2000/svg" focusable="false">
            <path d="M7.5 18.5L4 20V6.5C4 5.119 5.119 4 6.5 4H17.5C18.881 4 20 5.119 20 6.5V14.5C20 15.881 18.881 17 17.5 17H9.2L7.5 18.5Z"
              stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
            <path d="M8 8.8H16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M8 12H13.2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </span>
        <span class="gm-pa-launcher-text">ASK</span>
      `;
      document.body.appendChild(launcher);
    }
  
    // Build the panel INSIDE root
    root.innerHTML = `
      <div class="gm-pa" id="gm-pa-panel" aria-live="polite">
        <div class="gm-pa-card">
          <div class="gm-pa-header">
            <div class="gm-pa-title">
              <strong>Page Assistant</strong>
              <span class="gm-pa-subtitle">GlimMarket</span>
            </div>
            <button id="gm-pa-close" type="button" aria-label="Minimize assistant" title="Minimize">✕</button>
          </div>
  
          <div class="gm-pa-body" id="gm-pa-body"></div>
  
          <div class="gm-pa-input">
            <input id="gm-pa-input" placeholder="Ask about this page…" />
            <button id="gm-pa-send" type="button">Send</button>
          </div>
        </div>
      </div>
    `;
  
    const panel = document.getElementById("gm-pa-panel");
    const body = document.getElementById("gm-pa-body");
    const input = document.getElementById("gm-pa-input");
    const send = document.getElementById("gm-pa-send");
    const close = document.getElementById("gm-pa-close");
  
    let messages = [];
  
    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, (m) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      }[m]));
    }
  
    function add(role, text) {
      const row = document.createElement("div");
      row.className = "gm-pa-row";
      row.innerHTML = `<div class="${role === "user" ? "gm-pa-user" : "gm-pa-assistant"}">${escapeHtml(text)}</div>`;
      body.appendChild(row);
      body.scrollTop = body.scrollHeight;
    }
  
    function setThinking(on) {
      if (on) {
        add("assistant", "Thinking…");
      } else {
        const last = body.lastElementChild;
        if (last && last.textContent && last.textContent.includes("Thinking…")) {
          body.removeChild(last);
        }
      }
    }
  
    async function ask(text) {
      messages.push({ role: "user", content: text });
      add("user", text);
      setThinking(true);
  
      const res = await fetch(apiBase + "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: cfg.pageId, messages }),
      });
  
      const data = await res.json();
      setThinking(false);
  
      if (data?.answer) {
        messages.push({ role: "assistant", content: data.answer });
        add("assistant", data.answer);
      } else {
        add("assistant", data?.details || "Something went wrong.");
      }
    }
  
    // ---- Minimize / Restore ----
    function minimize() {
      root.classList.add("gm-pa-minimized");      // hides panel
      launcher.classList.remove("gm-pa-hidden");  // shows launcher
      sessionStorage.setItem(SESSION_MIN_KEY, "1");
      root.classList.remove("gm-pa-kb-open");
    }
  
    function restore() {
      root.classList.remove("gm-pa-minimized");   // shows panel
      launcher.classList.add("gm-pa-hidden");     // hides launcher while open
      sessionStorage.removeItem(SESSION_MIN_KEY);
      setTimeout(() => input && input.focus(), 50);
      setTimeout(updateKeyboardLift, 150);
    }
  
    close.addEventListener("click", minimize);
    launcher.addEventListener("click", restore);
  
    // ---- Keyboard lift (mobile) ----
    function updateKeyboardLift() {
      if (root.classList.contains("gm-pa-minimized")) return;
      const vv = window.visualViewport;
      if (!vv) return;
  
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      if (kb > 120) {
        root.classList.add("gm-pa-kb-open");
        root.style.setProperty("--gm-pa-kb", `${kb}px`);
      } else {
        root.classList.remove("gm-pa-kb-open");
        root.style.setProperty("--gm-pa-kb", `0px`);
      }
    }
  
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", updateKeyboardLift);
      window.visualViewport.addEventListener("scroll", updateKeyboardLift);
    }
    window.addEventListener("resize", updateKeyboardLift);
    input.addEventListener("focus", updateKeyboardLift);
    input.addEventListener("blur", () => setTimeout(updateKeyboardLift, 150));
  
    // ---- Send handlers ----
    send.addEventListener("click", () => {
      const t = input.value.trim();
      if (!t) return;
      input.value = "";
      ask(t).catch(() => {
        setThinking(false);
        add("assistant", "Error contacting assistant.");
      });
    });
  
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") send.click();
    });
  
    // ---- Welcome + chips ----
    add("assistant", "I can summarize this page, list key takeaways, or answer questions using only what’s on this page.");
  
    const chipWrap = document.createElement("div");
    chipWrap.className = "gm-pa-chips";
    chipWrap.innerHTML = `
      <button class="gm-pa-chip" data-q="Summarize this page in 2–3 sentences.">Summarize</button>
      <button class="gm-pa-chip" data-q="Give me 5 key takeaways from this page.">Key takeaways</button>
      <button class="gm-pa-chip" data-q="Explain this page in simple terms.">Explain simply</button>
    `;
    body.appendChild(chipWrap);
  
    chipWrap.addEventListener("click", (e) => {
      const btn = e.target.closest(".gm-pa-chip");
      if (!btn) return;
      ask(btn.getAttribute("data-q")).catch(() => {
        setThinking(false);
        add("assistant", "Error contacting assistant.");
      });
    });
  
    // ---- Initial state ----
    if (sessionStorage.getItem(SESSION_MIN_KEY) === "1") {
      // Start minimized: launcher visible, panel hidden
      minimize();
    } else {
      // Start open: panel visible, launcher hidden
      restore();
    }
  })();