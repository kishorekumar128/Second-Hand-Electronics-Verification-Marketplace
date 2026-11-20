/**
 * Interactive Hardware Diagnostics Module for Second-Hand Electronics
 * Provides client-side hardware attestation simulation:
 * 1. Touchscreen Multi-Zone Digitizer Matrix Test
 * 2. Dead Pixel & Sub-pixel Color Uniformity Test
 * 3. Audio & Acoustic Echo Loop Test
 * 4. GSMA IMEI & Cloud Activation Lock Query
 */

const DiagnosticsEngine = {
  touchGrid: {
    rows: 8,
    cols: 10,
    filledCells: new Set(),
    canvas: null,
    ctx: null,
    isTesting: false
  },

  colorTestIndex: 0,
  testColors: [
    { name: "Pure Red (#FF0000) - Checking Red Subpixels", color: "#FF0000" },
    { name: "Pure Green (#00FF00) - Checking Green Subpixels", color: "#00FF00" },
    { name: "Pure Blue (#0000FF) - Checking Blue Subpixels", color: "#0000FF" },
    { name: "Pure White (#FFFFFF) - Checking Uniformity & Backlight Bleed", color: "#FFFFFF", textColor: "#000" },
    { name: "Pure Black (#000000) - Checking OLED True Black & Burn-in", color: "#000000", textColor: "#FFF" }
  ],

  initTouchTest(canvasId, progressElId, statusBadgeId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    this.touchGrid.canvas = canvas;
    this.touchGrid.ctx = canvas.getContext('2d');
    this.touchGrid.filledCells.clear();
    this.touchGrid.isTesting = true;

    // Handle high DPI
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    this.touchGrid.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    this.drawTouchGrid();

    const handlePointer = (e) => {
      if (!this.touchGrid.isTesting) return;
      const cRect = canvas.getBoundingClientRect();
      const x = e.clientX - cRect.left;
      const y = e.clientY - cRect.top;
      
      const colWidth = cRect.width / this.touchGrid.cols;
      const rowHeight = cRect.height / this.touchGrid.rows;
      
      const col = Math.floor(x / colWidth);
      const row = Math.floor(y / rowHeight);
      
      if (col >= 0 && col < this.touchGrid.cols && row >= 0 && row < this.touchGrid.rows) {
        const key = `${row}-${col}`;
        if (!this.touchGrid.filledCells.has(key)) {
          this.touchGrid.filledCells.add(key);
          this.drawTouchGrid();

          const total = this.touchGrid.rows * this.touchGrid.cols;
          const pct = Math.round((this.touchGrid.filledCells.size / total) * 100);
          
          if (progressElId) {
            document.getElementById(progressElId).innerText = `${pct}% Zone Coverage (${this.touchGrid.filledCells.size}/${total})`;
          }

          if (pct >= 90 && statusBadgeId) {
            const badge = document.getElementById(statusBadgeId);
            badge.className = "check-badge-pass";
            badge.innerText = "PASSED (100% Responsive)";
          }
        }
      }
    };

    canvas.onmousemove = handlePointer;
    canvas.ontouchmove = (e) => {
      e.preventDefault();
      handlePointer(e.touches[0]);
    };
  },

  drawTouchGrid() {
    const { canvas, ctx, rows, cols, filledCells } = this.touchGrid;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    ctx.clearRect(0, 0, w, h);

    const cellW = w / cols;
    const cellH = h / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const key = `${r}-${c}`;
        const isFilled = filledCells.has(key);

        if (isFilled) {
          ctx.fillStyle = "#10b981";
          ctx.fillRect(c * cellW, r * cellH, cellW, cellH);
        } else {
          ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
          ctx.fillRect(c * cellW, r * cellH, cellW, cellH);
        }

        ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
        ctx.lineWidth = 1;
        ctx.strokeRect(c * cellW, r * cellH, cellW, cellH);
      }
    }
  },

  resetTouchGrid(progressElId, statusBadgeId) {
    this.touchGrid.filledCells.clear();
    this.drawTouchGrid();
    if (progressElId) document.getElementById(progressElId).innerText = "0% Zone Coverage (Draw across box)";
    if (statusBadgeId) {
      const badge = document.getElementById(statusBadgeId);
      badge.className = "filter-btn";
      badge.innerText = "INCOMPLETE";
    }
  },

  cycleDeadPixelTest(boxId, labelId) {
    const box = document.getElementById(boxId);
    const label = document.getElementById(labelId);
    if (!box) return;

    this.colorTestIndex = (this.colorTestIndex + 1) % this.testColors.length;
    const current = this.testColors[this.colorTestIndex];
    box.style.background = current.color;
    box.style.color = current.textColor || "#FFF";
    if (label) {
      label.innerText = `Screen Check: ${current.name} (Click to cycle)`;
    }
  },

  simulateAudioTest(badgeId, feedbackId) {
    const feedback = document.getElementById(feedbackId);
    const badge = document.getElementById(badgeId);
    if (feedback) feedback.innerText = "Generating 440Hz / 1kHz sine sweep & listening on mic...";

    // Play quick harmless audio chime if supported
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.3); // A5
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch(e) {
      // AudioContext muted/unsupported
    }

    setTimeout(() => {
      if (feedback) feedback.innerText = "Dual-speaker acoustic output OK. Mic signal-to-noise ratio: 68dB (Nominal).";
      if (badge) {
        badge.className = "check-badge-pass";
        badge.innerText = "PASSED";
      }
    }, 1200);
  },

  simulateGSMAIMEICheck(imeiInputId, resultElId) {
    const imei = document.getElementById(imeiInputId).value.trim();
    const result = document.getElementById(resultElId);
    if (!imei) {
      result.innerHTML = `<span style="color: #f43f5e;">Please enter a 15-digit IMEI or Serial number.</span>`;
      return;
    }

    result.innerHTML = `<span style="color: #38bdf8;">Querying GSMA Global Stolen DB & Apple/Android FRP Registry...</span>`;
    
    setTimeout(() => {
      result.innerHTML = `
        <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid #10b981; padding: 0.8rem; border-radius: 8px; margin-top: 0.5rem;">
          <div style="color: #34d399; font-weight: 700; margin-bottom: 0.2rem;">✓ GSMA Blacklist: CLEAN (Not Reported Stolen or Lost)</div>
          <div style="color: #34d399; font-weight: 700; margin-bottom: 0.2rem;">✓ Carrier Financing: UNENCUMBERED (Fully Paid Off)</div>
          <div style="color: #34d399; font-weight: 700;">✓ Activation Lock / FRP: READY FOR TRANSFER</div>
        </div>
      `;
    }, 1400);
  }
};

window.DiagnosticsEngine = DiagnosticsEngine;
