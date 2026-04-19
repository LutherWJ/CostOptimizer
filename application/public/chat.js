// AI Decision Panel (client)
// Talks to local API: POST /api/support/chat

(function () {
  let chatOpen = false;
  let chatHistory = [];
  const MAX_HISTORY_MESSAGES = 24;
  const REQUEST_TIMEOUT_MS = 60000;
  const UI_MAX_CHARS = 350;
  const STORAGE_KEY = "laptop_ai_chat_state_v1";

  const WL_LABELS = {
    daily: "Daily Browsing",
    stream: "Streaming",
    writing: "Writing & Study",
    casual2d: "Casual 2D Games",
    office: "Office Productivity",
    finance: "Finance",
    research: "Research & Analytics",
    remote: "Remote Work & VPN",
    erp: "ERP Systems",
    design: "Photo & Design",
    video: "Video Editing",
    music: "Music Production",
    content: "Content Creation",
    render3d: "VFX & 3D Rendering",
    webdev: "Web Development",
    datasci: "Data Science",
    cyber: "Cybersecurity",
    ml: "Machine Learning",
    gamedev: "Game Development",
    cad: "3D CAD / Modeling",
    arch: "Architecture & BIM",
    science: "Scientific Simulation",
    gis: "GIS & Mapping",
    electrical: "Electrical / EDA",
    casual: "Casual Gaming",
    esports: "Esports",
    gaming: "AAA Gaming",
    vr: "VR Gaming",
  };

  function $(sel) {
    return document.querySelector(sel);
  }
  function byId(id) {
    return document.getElementById(id);
  }

  function safeText(x) {
    return String(x || "").trim();
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function getSelectedWorkloadIdsFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("workloads") || "";
    if (!raw) return [];
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function getSelectedWorkloadIds() {
    // Workloads page stores selection in a global lexical `selectedWLs` Set (not window.selectedWLs).
    try {
      // eslint-disable-next-line no-undef
      if (typeof selectedWLs !== "undefined" && selectedWLs && selectedWLs.size != null) {
        // eslint-disable-next-line no-undef
        return Array.from(selectedWLs);
      }
    } catch (e) {
      // ignore
    }
    return getSelectedWorkloadIdsFromUrl();
  }

  function getBudgetSelection() {
    const preset = $("#budgetPresets .preset.sel") || $(".preset.sel");
    if (preset) return safeText(preset.textContent);
    const params = new URLSearchParams(window.location.search);
    return params.get("budget") || "";
  }

  function getSizeSelection() {
    const sizeTitle = $("#sizeCards .size-card.sel .s-title") || $(".size-card.sel .s-title");
    if (sizeTitle) return safeText(sizeTitle.textContent);
    const params = new URLSearchParams(window.location.search);
    const v = params.get("size") || "";
    if (v === "compact") return "Compact";
    if (v === "standard") return "Standard";
    if (v === "desktop") return "Desktop";
    return v;
  }

  function getTopResults() {
    const cards = Array.from(document.querySelectorAll(".rec-card")).slice(0, 3);
    if (!cards.length) return "";

    const items = cards
      .map((c) => {
        const brandEl = c.querySelector(".rc-brand");
        const nameEl = c.querySelector(".rc-name");
        const priceEl = c.querySelector(".rc-price");
        const brand = safeText(brandEl ? brandEl.textContent : "");
        const name = safeText(nameEl ? nameEl.textContent : "");
        const price = safeText(priceEl ? priceEl.textContent : "").replace(/\s+starting.*$/i, "");
        return [brand, name].filter(Boolean).join(" ") + (price ? ` (${price})` : "");
      })
      .filter(Boolean);

    return items.join("; ");
  }

  // Get live context about user's current selections
  function getLiveContext() {
    const wlIds = getSelectedWorkloadIds();
    const wls = wlIds.length ? wlIds.map((id) => WL_LABELS[id] || id).join(", ") : null;
    const budget = getBudgetSelection() || null;
    const size = getSizeSelection() || null;
    const results = getTopResults() || null;
    return { wls, budget, size, results };
  }

  function ensureOpenState() {
    const sidebar = byId("chatSidebar");
    const fab = byId("chatFab");
    if (!sidebar || !fab) return;
    sidebar.classList.toggle("open", chatOpen);
    fab.classList.toggle("hidden", chatOpen);
    document.body.classList.toggle("chat-open", chatOpen);
    saveChatState();
  }

  function openChat() {
    chatOpen = true;
    ensureOpenState();
    const sidebar = byId("chatSidebar");
    if (sidebar && window.innerWidth <= 900) sidebar.style.height = "24dvh";
    setTimeout(() => {
      const input = byId("chatInput");
      if (input) input.focus();
    }, 50);
  }

  function closeChat(e) {
    if (e) {
      if (e.preventDefault) e.preventDefault();
      if (e.stopPropagation) e.stopPropagation();
    }
    chatOpen = false;
    const sidebar = byId("chatSidebar");
    if (sidebar) sidebar.style.height = "";
    ensureOpenState();
  }

  function toggleChat(e) {
    if (e) {
      if (e.preventDefault) e.preventDefault();
      if (e.stopPropagation) e.stopPropagation();
    }
    if (chatOpen) closeChat();
    else openChat();
  }

  function chatKeydown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChat();
    }
  }

  function sendChip(el) {
    const raw = safeText(el && el.textContent ? el.textContent : "");
    const msg = raw.replace(/^[\s\S]{1,3}\s/, "").trim();
    sendChatMsg(msg);
  }

  function sendChat() {
    const input = byId("chatInput");
    const msg = safeText(input && typeof input.value === "string" ? input.value : "");
    if (!msg) return;
    if (input) {
      input.value = "";
      input.style.height = "auto";
    }
    sendChatMsg(msg);
  }

  function safeParseJson(str) {
    try {
      return JSON.parse(str);
    } catch (e) {
      return null;
    }
  }

  function getPersistableHistory() {
    return (Array.isArray(chatHistory) ? chatHistory : [])
      .filter((m) => m && (m.role === "user" || m.role === "assistant"))
      .map((m) => ({ role: m.role, content: safeText(m.content) }))
      .filter((m) => m.content)
      .slice(-MAX_HISTORY_MESSAGES);
  }

  function saveChatState() {
    try {
      if (!window.localStorage) return;
      const state = {
        v: 1,
        open: !!chatOpen,
        history: getPersistableHistory(),
        savedAt: Date.now(),
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // ignore
    }
  }

  function restoreChatState() {
    try {
      if (!window.localStorage) return;
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const state = safeParseJson(raw);
      if (!state || state.v !== 1) return;

      const history = Array.isArray(state.history) ? state.history : [];
      if (!history.length) {
        chatOpen = !!state.open;
        ensureOpenState();
        return;
      }

      // Load into memory first.
      chatHistory = history
        .filter((m) => m && (m.role === "user" || m.role === "assistant"))
        .map((m) => ({ role: m.role, content: safeText(m.content) }))
        .filter((m) => m.content)
        .slice(-MAX_HISTORY_MESSAGES);

      // Render into the thread (keep the greeting card that is in the HTML).
      for (const m of chatHistory) {
        if (m.role === "user") appendUserPill(m.content);
        else appendAiCard({ answer: m.content, why: [], tradeoffs: [], actions: [] });
      }

      chatOpen = !!state.open;
      ensureOpenState();
    } catch (e) {
      // ignore
    }
  }

  function appendUserPill(text) {
    const thread = byId("chatMessages");
    if (!thread) return;
    const row = document.createElement("div");
    row.className = "cp-user-row";
    const pill = document.createElement("div");
    pill.className = "cp-user-pill";
    pill.textContent = text;
    row.appendChild(pill);
    thread.appendChild(row);
    thread.scrollTop = thread.scrollHeight;
  }

  function appendTypingCard(id) {
    const thread = byId("chatMessages");
    if (!thread) return;
    const div = document.createElement("div");
    div.className = "cp-typing";
    div.id = id;
    div.innerHTML =
      '<span class="cp-typing-label">Thinking...</span><div class="typing-dots"><span></span><span></span><span></span></div>';
    thread.appendChild(div);
    thread.scrollTop = thread.scrollHeight;
  }

  function removeTyping(id) {
    const el = byId(id);
    if (el) el.remove();
  }

  function handleActionIntent(intent, label) {
    const i = safeText(intent);
    if (i === "refine_workloads") {
      window.location.href = "/workloads";
      return;
    }
    if (i === "refine_budget" || i === "refine_screen") {
      const params = new URLSearchParams(window.location.search);
      const workloads = params.get("workloads");
      window.location.href = workloads ? `/filters?workloads=${encodeURIComponent(workloads)}` : "/filters";
      return;
    }
    if (i === "show_results") {
      if (window.location.pathname.startsWith("/recommend")) return;
      const params = new URLSearchParams(window.location.search);
      const qs = params.toString();
      window.location.href = qs ? `/recommend?${qs}` : "/recommend";
      return;
    }
    sendChatMsg(label);
  }

  function appendAiCard(data) {
    const thread = byId("chatMessages");
    if (!thread) return;

    const card = document.createElement("div");
    card.className = "cp-ai-card";

    const bar = document.createElement("div");
    bar.className = "cp-card-bar";
    card.appendChild(bar);

    const head = document.createElement("div");
    head.className = "cp-card-head";
    const byline = document.createElement("div");
    byline.className = "cp-card-byline";
    byline.textContent = "LapTop AI";
    const answer = document.createElement("div");
    answer.className = "cp-card-answer";
    answer.textContent = safeText(data && data.answer ? data.answer : "");
    head.appendChild(byline);
    head.appendChild(answer);
    card.appendChild(head);

    const body = document.createElement("div");
    body.className = "cp-card-body";

    if (data && Array.isArray(data.why) && data.why.length > 0) {
      const lbl = document.createElement("div");
      lbl.className = "cp-section-label";
      lbl.textContent = "Why";
      body.appendChild(lbl);

      const ul = document.createElement("ul");
      ul.className = "cp-bullets";
      data.why.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = safeText(item);
        ul.appendChild(li);
      });
      body.appendChild(ul);
    }

    if (data && Array.isArray(data.tradeoffs) && data.tradeoffs.length > 0) {
      const lbl2 = document.createElement("div");
      lbl2.className = "cp-section-label";
      lbl2.textContent = "Tradeoffs";
      body.appendChild(lbl2);

      const grid = document.createElement("div");
      grid.className = "cp-tradeoffs";
      data.tradeoffs.forEach((t) => {
        const box = document.createElement("div");
        box.className = "cp-tradeoff " + (t.type === "pro" ? "pro" : "con");
        const icon = document.createElement("div");
        icon.className = "cp-tradeoff-icon";
        icon.textContent = t.type === "pro" ? "✓" : "✗";
        const txt = document.createElement("div");
        txt.className = "cp-tradeoff-text";
        txt.textContent = safeText(t.text);
        box.appendChild(icon);
        box.appendChild(txt);
        grid.appendChild(box);
      });
      body.appendChild(grid);
    }

    card.appendChild(body);

    if (data && Array.isArray(data.actions) && data.actions.length > 0) {
      const actRow = document.createElement("div");
      actRow.className = "cp-actions";
      data.actions.forEach((a) => {
        const btn = document.createElement("span");
        btn.className = "cp-action" + (a.type === "primary" ? " primary" : "");
        btn.textContent = safeText(a.label);
        btn.onclick = () => handleActionIntent(a.intent, a.label);
        actRow.appendChild(btn);
      });
      card.appendChild(actRow);
    }

    thread.appendChild(card);
    thread.scrollTop = thread.scrollHeight;
  }

  async function sendChatMsg(msg) {
    const text = safeText(msg);
    if (!text) return;

    appendUserPill(text);
    chatHistory.push({ role: "user", content: text });
    if (chatHistory.length > MAX_HISTORY_MESSAGES) {
      chatHistory = chatHistory.slice(chatHistory.length - MAX_HISTORY_MESSAGES);
    }
    saveChatState();

    const typingId = "typing-" + Date.now();
    appendTypingCard(typingId);

    const ctx = getLiveContext();
    const ctxLines = [
      ctx.wls ? `User workloads: ${ctx.wls}.` : "",
      ctx.budget ? `Budget preference: ${ctx.budget}.` : "",
      ctx.size ? `Screen size preference: ${ctx.size}.` : "",
      ctx.results ? `Top current results: ${ctx.results}.` : "",
    ]
      .filter(Boolean)
      .join(" ");

    // Keep a single UI context system message in history (replace previous).
    const uiContext = ctxLines ? `UI CONTEXT (user selections): ${ctxLines}` : "";
    chatHistory = chatHistory.filter((m) => !(m.role === "system" && String(m.content || "").startsWith("UI CONTEXT")));
    if (uiContext) chatHistory.unshift({ role: "system", content: uiContext });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, topK: 6, history: chatHistory }),
        signal: controller.signal,
      });

      const data = await res.json().catch(() => null);
      removeTyping(typingId);

      const answerText =
        safeText(data && data.answer ? data.answer : "") ||
        "Sorry - I'm having trouble responding right now. Please try again.";
      const shown = answerText.length > UI_MAX_CHARS ? answerText.slice(0, UI_MAX_CHARS - 3).trimEnd() + "..." : answerText;
      const parsed = { answer: shown, why: [], tradeoffs: [], actions: [] };
      appendAiCard(parsed);
      chatHistory.push({ role: "assistant", content: answerText });
      if (chatHistory.length > MAX_HISTORY_MESSAGES) {
        chatHistory = chatHistory.slice(chatHistory.length - MAX_HISTORY_MESSAGES);
      }
      saveChatState();
    } catch (e) {
      removeTyping(typingId);
      appendAiCard({
        answer: "Sorry - I'm taking too long to respond. Please try again in a moment.",
        why: [],
        tradeoffs: [],
        actions: [],
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  // Mobile draggable bottom sheet support
  let isDragging = false;
  let startY = 0;
  let startHeight = 0;

  function startDrag(clientY) {
    const sidebar = byId("chatSidebar");
    if (!sidebar || !sidebar.classList.contains("open")) return;
    isDragging = true;
    startY = clientY;
    startHeight = sidebar.getBoundingClientRect().height;
    sidebar.style.transition = "none";
  }

  function moveDrag(clientY) {
    if (!isDragging) return;
    const sidebar = byId("chatSidebar");
    if (!sidebar) return;

    const maxHeight = Math.round(window.innerHeight * 0.85);
    const deltaY = startY - clientY;
    const nextHeight = clamp(startHeight + deltaY, 0, maxHeight);
    sidebar.style.height = `${nextHeight}px`;
  }

  function endDrag() {
    if (!isDragging) return;
    isDragging = false;
    const sidebar = byId("chatSidebar");
    if (!sidebar) return;
    sidebar.style.transition = "";

    const currentHeight = sidebar.getBoundingClientRect().height;
    const minHeight = Math.round(window.innerHeight * 0.22);
    const maxHeight = Math.round(window.innerHeight * 0.85);
    const closeThreshold = Math.round(window.innerHeight * 0.12);

    if (currentHeight < closeThreshold) {
      closeChat();
      return;
    }

    const clamped = clamp(currentHeight, minHeight, maxHeight);
    sidebar.style.height = `${clamped}px`;
  }

  function wireUi() {
    const handle = $(".cp-handle");

    if (handle) {
      handle.addEventListener("mousedown", (e) => {
        e.preventDefault();
        startDrag(e.clientY);
      });
      handle.addEventListener(
        "touchstart",
        (e) => {
          startDrag(e.touches[0].clientY);
        },
        { passive: true },
      );
    }

    window.addEventListener("mousemove", (e) => moveDrag(e.clientY));
    window.addEventListener("mouseup", () => endDrag());
    window.addEventListener(
      "touchmove",
      (e) => moveDrag(e.touches[0].clientY),
      { passive: true },
    );
    window.addEventListener("touchend", () => endDrag());

    restoreChatState();
  }

  // Expose globals for inline HTML handlers
  window.toggleChat = toggleChat;
  window.closeChat = closeChat;
  window.chatKeydown = chatKeydown;
  window.sendChat = sendChat;
  window.sendChip = sendChip;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wireUi);
  else wireUi();
})();
