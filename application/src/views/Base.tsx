const Base = (content: string, title = "App", extraCss: string[] = [], extraJs: string[] = []) => {
  const extraLinks = extraCss
    .map((href) => `<link rel="stylesheet" href="${href}">`)
    .join("\n    ");

  const extraScripts = extraJs
    .map((src) => `<script src="${src}"></script>`)
    .join("\n  ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,700;1,800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/public/base.css">
  ${extraLinks}
  <link rel="stylesheet" href="/public/chat.css">
</head>
<body>
  <div id="appContent">
    ${content}
  </div>

  <!-- AI DECISION PANEL -->
  <button id="chatFab" onclick="toggleChat(event)" title="Ask LapTop AI" type="button">
    <img src="/images/robert2.png" alt="AI bot">
    Ask AI
  </button>

  <div id="chatSidebar">
    <div class="cp-handle"><div class="cp-handle-bar"></div></div>

    <div class="cp-header">
      <span class="cp-header-dot"></span>
      <span class="cp-header-name">LapTop AI</span>
      <span class="cp-header-tag">Decision Assistant</span>
      <button class="cp-header-close" type="button" onclick="closeChat(event)">&times;</button>
    </div>

    <div class="cp-thread" id="chatMessages">
      <div class="cp-ai-card">
        <div class="cp-card-bar"></div>
        <div class="cp-card-head">
          <div class="cp-card-byline">LapTop AI</div>
          <div class="cp-card-answer">Hi! I'm your laptop decision assistant. Ask about software compatibility, budget tradeoffs, or what to prioritize.</div>
        </div>
        <div class="cp-card-body">
          <div class="cp-section-label">Have a question?</div>
        </div>
        <div class="cp-actions">
          <span class="cp-action" onclick="sendChip(this)">Mac vs Windows for me?</span>
          <span class="cp-action" onclick="sendChip(this)">How much RAM do I need?</span>
          <span class="cp-action" onclick="sendChip(this)">With $1000, what should I upgrade first?</span>
        </div>
      </div>
    </div>

    <div class="cp-input-row">
      <textarea id="chatInput" placeholder="Ask about software, tradeoffs, budget..." rows="1" onkeydown="chatKeydown(event)"></textarea>
      <button id="chatSend" onclick="sendChat()" type="button">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
      </button>
    </div>
  </div>

  <script src="/public/nav.js"></script>
  ${extraScripts}
  <script src="/public/chat.js"></script>
</body>
</html>`;
};

export default Base;
