import Base from "./Base";

const Workloads = () => {
  const content = `
    <nav>
      <a class="nav-logo" href="/">
        <span class="nav-dot"></span>LapTop
      </a>
      <div class="nav-right">
        <div class="nav-pager" aria-label="Page navigation">
          <button class="nav-arrow" type="button" data-dir="prev" data-href="/" aria-label="Back">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div class="nav-page-label">Workloads</div>
          <button class="nav-arrow" type="button" data-dir="next" data-action="goToFilters" disabled aria-disabled="true" aria-label="Next">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
          </button>
        </div>
      </div>
    </nav>

    <div class="step-page">
      <div class="step-card">

        <div class="step-eyebrow">Step 1 of 2</div>
        <h2>Select your workloads!</h2>
        <p class="sub">Click all workloads which apply.</p>

        <!-- Fast path: major presets -->
        <div class="fp-section">
          <div class="fp-heading">What are you studying?</div>
          <div class="fp-sub">Select your program and we'll pre-fill the most relevant workloads. You can still adjust them below.</div>
          <div class="fp-grid">
            <button class="fp-btn" onclick="applyMajor('engineering',this)"><span class="fp-ico">⚙️</span>Engineering</button>
            <button class="fp-btn" onclick="applyMajor('nursing',this)"><span class="fp-ico">🩺</span>Nursing / Health</button>
            <button class="fp-btn" onclick="applyMajor('business',this)"><span class="fp-ico">💼</span>Business</button>
            <button class="fp-btn" onclick="applyMajor('cs',this)"><span class="fp-ico">💻</span>CS / Dev</button>
            <button class="fp-btn" onclick="applyMajor('design',this)"><span class="fp-ico">🎨</span>Art / Design</button>
            <button class="fp-btn" onclick="applyMajor('architecture',this)"><span class="fp-ico">🏛️</span>Architecture</button>
            <button class="fp-btn" onclick="applyMajor('humanities',this)"><span class="fp-ico">📚</span>Humanities</button>
            <button class="fp-btn" onclick="applyMajor('general',this)"><span class="fp-ico">🌐</span>General / Other</button>
          </div>
          <button class="fp-reset" id="fpReset" onclick="resetMajor()">✕ Clear selection — pick workloads manually</button>
        </div>

        <!-- Group 1: Everyday use -->
        <div class="wl-group">
          <div class="wl-group-header">
            <div class="wl-group-title">⭐ Everyday use</div>
          </div>
          <div class="wl-grid">
            <div class="wcard" data-id="daily" onclick="toggleWL(this)">
              <div class="wck"></div>
              <div class="wico">🌐</div>
              <div class="wlbl">Daily browsing &amp; social</div>
              <div class="wdsc">Web, email, social media, shopping, maps</div>
            </div>
            <div class="wcard" data-id="stream" onclick="toggleWL(this)">
              <div class="wck"></div>
              <div class="wico">📺</div>
              <div class="wlbl">Streaming &amp; video calls</div>
              <div class="wdsc">Netflix, Disney+, Plex, Zoom, Google Meet</div>
            </div>
            <div class="wcard" data-id="writing" onclick="toggleWL(this)">
              <div class="wck"></div>
              <div class="wico">✍️</div>
              <div class="wlbl">Writing &amp; study</div>
              <div class="wdsc">Google Docs, Word, Notion, PDFs</div>
            </div>
            <div class="wcard" data-id="casual2d" onclick="toggleWL(this)">
              <div class="wck"></div>
              <div class="wico">🎲</div>
              <div class="wlbl">Casual 2D games</div>
              <div class="wdsc">Browser games, Stardew Valley, Minecraft</div>
            </div>
          </div>
        </div>

        <!-- Group 2: Office & business -->
        <div class="wl-group">
          <div class="wl-group-header">
            <div class="wl-group-title">💼 Office &amp; business</div>
          </div>
          <div class="wl-grid">
            <div class="wcard" data-id="office" onclick="toggleWL(this)">
              <div class="wck"></div>
              <div class="wico">📊</div>
              <div class="wlbl">Office productivity</div>
              <div class="wdsc">Word, Excel, PowerPoint, Outlook</div>
            </div>
            <div class="wcard" data-id="finance" onclick="toggleWL(this)">
              <div class="wck"></div>
              <div class="wico">💹</div>
              <div class="wlbl">Finance &amp; accounting</div>
              <div class="wdsc">Excel macros, Power BI, Bloomberg, SAP</div>
            </div>
            <div class="wcard" data-id="research" onclick="toggleWL(this)">
              <div class="wck"></div>
              <div class="wico">🔬</div>
              <div class="wlbl">Research &amp; analytics</div>
              <div class="wdsc">SPSS, R, Python notebooks, Tableau</div>
            </div>
            <div class="wcard" data-id="remote" onclick="toggleWL(this)">
              <div class="wck"></div>
              <div class="wico">🔗</div>
              <div class="wlbl">Remote work &amp; VPN</div>
              <div class="wdsc">Citrix, VPN, remote desktop, VDI</div>
            </div>
            <div class="wcard" data-id="erp" onclick="toggleWL(this)">
              <div class="wck"></div>
              <div class="wico">🏢</div>
              <div class="wlbl">ERP &amp; business systems</div>
              <div class="wdsc">SAP, Oracle, Dynamics, NetSuite</div>
            </div>
          </div>
        </div>

        <!-- Group 3: Creative & media -->
        <div class="wl-group">
          <div class="wl-group-header">
            <div class="wl-group-title">🎨 Creative &amp; media</div>
          </div>
          <div class="wl-grid">
            <div class="wcard" data-id="design" onclick="toggleWL(this)">
              <div class="wck"></div>
              <div class="wico">🖼️</div>
              <div class="wlbl">Photo, design &amp; UI/UX</div>
              <div class="wdsc">Lightroom, Photoshop, Figma, XD</div>
            </div>
            <div class="wcard" data-id="video" onclick="toggleWL(this)">
              <div class="wck"></div>
              <div class="wico">🎞️</div>
              <div class="wlbl">Video editing (HD/4K)</div>
              <div class="wdsc">Premiere Pro, DaVinci Resolve, Final Cut</div>
            </div>
            <div class="wcard" data-id="music" onclick="toggleWL(this)">
              <div class="wck"></div>
              <div class="wico">🎵</div>
              <div class="wlbl">Music production</div>
              <div class="wdsc">Ableton, Logic Pro, FL Studio, Pro Tools</div>
            </div>
            <div class="wcard" data-id="content" onclick="toggleWL(this)">
              <div class="wck"></div>
              <div class="wico">🎬</div>
              <div class="wlbl">Content creation</div>
              <div class="wdsc">OBS, Audacity, YouTube 4K, podcast</div>
            </div>
            <div class="wcard" data-id="render3d" onclick="toggleWL(this)">
              <div class="wck"></div>
              <div class="wico">🌀</div>
              <div class="wlbl">VFX &amp; 3D rendering</div>
              <div class="wdsc">Blender, After Effects, Cinema 4D</div>
            </div>
          </div>
        </div>

        <!-- Group 4: Development & data -->
        <div class="wl-group">
          <div class="wl-group-header">
            <div class="wl-group-title">💻 Development &amp; data</div>
          </div>
          <div class="wl-grid">
            <div class="wcard" data-id="webdev" onclick="toggleWL(this)">
              <div class="wck"></div>
              <div class="wico">🌍</div>
              <div class="wlbl">Web development</div>
              <div class="wdsc">VS Code, Node.js, React, Docker</div>
            </div>
            <div class="wcard" data-id="datasci" onclick="toggleWL(this)">
              <div class="wck"></div>
              <div class="wico">📈</div>
              <div class="wlbl">Data science</div>
              <div class="wdsc">Jupyter, Pandas, Spark, SQL, Tableau</div>
            </div>
            <div class="wcard" data-id="cyber" onclick="toggleWL(this)">
              <div class="wck"></div>
              <div class="wico">🔒</div>
              <div class="wlbl">Cybersecurity / PenTest</div>
              <div class="wdsc">Kali Linux, Burp Suite, Wireshark</div>
            </div>
            <div class="wcard" data-id="ml" onclick="toggleWL(this)">
              <div class="wck"></div>
              <div class="wico">🤖</div>
              <div class="wlbl">Machine learning / AI</div>
              <div class="wdsc">PyTorch, TensorFlow, CUDA, LLM</div>
            </div>
            <div class="wcard" data-id="gamedev" onclick="toggleWL(this)">
              <div class="wck"></div>
              <div class="wico">🕹️</div>
              <div class="wlbl">Game development</div>
              <div class="wdsc">Unity 6, Unreal Engine 5, C++</div>
            </div>
          </div>
        </div>

        <!-- Group 5: Engineering & science -->
        <div class="wl-group">
          <div class="wl-group-header">
            <div class="wl-group-title">🔧 Engineering &amp; science</div>
          </div>
          <div class="wl-grid">
            <div class="wcard" data-id="cad" onclick="toggleWL(this)">
              <div class="wck"></div>
              <div class="wico">📐</div>
              <div class="wlbl">3D CAD / Modeling</div>
              <div class="wdsc">SolidWorks, AutoCAD, Fusion 360</div>
            </div>
            <div class="wcard" data-id="arch" onclick="toggleWL(this)">
              <div class="wck"></div>
              <div class="wico">🏛️</div>
              <div class="wlbl">Architecture &amp; BIM</div>
              <div class="wdsc">Revit, SketchUp, Rhino 3D, Lumion</div>
            </div>
            <div class="wcard" data-id="science" onclick="toggleWL(this)">
              <div class="wck"></div>
              <div class="wico">🧪</div>
              <div class="wlbl">Scientific simulation</div>
              <div class="wdsc">MATLAB, Ansys, GROMACS, CFD/FEA</div>
            </div>
            <div class="wcard" data-id="gis" onclick="toggleWL(this)">
              <div class="wck"></div>
              <div class="wico">🗺️</div>
              <div class="wlbl">GIS &amp; mapping</div>
              <div class="wdsc">ArcGIS, QGIS, Google Earth Engine</div>
            </div>
            <div class="wcard" data-id="electrical" onclick="toggleWL(this)">
              <div class="wck"></div>
              <div class="wico">⚡</div>
              <div class="wlbl">Electrical / EDA</div>
              <div class="wdsc">Altium, KiCad, SPICE, Cadence</div>
            </div>
          </div>
        </div>

        <!-- Group 6: Gaming -->
        <div class="wl-group">
          <div class="wl-group-header">
            <div class="wl-group-title">🎮 Gaming</div>
          </div>
          <div class="wl-grid">
            <div class="wcard" data-id="casual" onclick="toggleWL(this)">
              <div class="wck"></div>
              <div class="wico">🎯</div>
              <div class="wlbl">Casual &amp; indie games</div>
              <div class="wdsc">Stardew Valley, Hades, Minecraft, Sims</div>
            </div>
            <div class="wcard" data-id="esports" onclick="toggleWL(this)">
              <div class="wck"></div>
              <div class="wico">🏅</div>
              <div class="wlbl">Esports (CS2, Valorant)</div>
              <div class="wdsc">Competitive FPS, 144–360Hz, low latency</div>
            </div>
            <div class="wcard" data-id="gaming" onclick="toggleWL(this)">
              <div class="wck"></div>
              <div class="wico">🏆</div>
              <div class="wlbl">AAA Gaming (1080p)</div>
              <div class="wdsc">Cyberpunk 2077, GTA VI, Elden Ring</div>
            </div>
            <div class="wcard" data-id="vr" onclick="toggleWL(this)">
              <div class="wck"></div>
              <div class="wico">🥽</div>
              <div class="wlbl">VR gaming</div>
              <div class="wdsc">Meta Quest PC, SteamVR, PCVR</div>
            </div>
          </div>
        </div>

        <!-- Navigation buttons -->
        <div class="nav-btns">
          <a class="btn-back-outline" href="/">&larr; Back</a>
          <button class="btn-next-teal" id="continueBtn" onclick="goToFilters()" disabled>
            Select at least one workload
          </button>
        </div>

      </div>
    </div>
  `;

  return Base(content, "LapTop — Select workloads", ["/public/workloads.css"], ["/public/workloads.js"]);
};

export default Workloads;
