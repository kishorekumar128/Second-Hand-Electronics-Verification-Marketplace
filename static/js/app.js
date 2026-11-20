/**
 * Core Application Logic for Verified Pre-Owned Electronics Marketplace
 */

const AppState = {
  activeView: 'buyer-view',
  devices: [],
  selectedCategory: 'ALL',
  selectedGrade: 'ALL',
  currentDeviceModal: null,
  activeVerifierDevice: null
};

// Utilities
function formatCurrency(val) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <span style="font-size: 1.2rem;">${type === 'success' ? '✓' : 'ℹ'}</span>
    <div>${message}</div>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Navigation View Switcher
function switchView(viewId) {
  AppState.activeView = viewId;
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewId);
  });
  document.querySelectorAll('.view-section').forEach(sec => {
    sec.classList.toggle('active', sec.id === viewId);
  });

  if (viewId === 'buyer-view') {
    loadDevices();
  } else if (viewId === 'verifier-view') {
    loadVerifierQueue();
  } else if (viewId === 'escrow-view') {
    loadEscrowVault();
  }
}

// Fetch Platform Stats
async function loadPlatformStats() {
  try {
    const res = await fetch('/api/stats');
    const data = await res.json();
    document.getElementById('stat-escrow-vol').innerText = formatCurrency(data.escrow_volume_usd);
    document.getElementById('stat-prevent-rate').innerText = data.fraud_prevention_rate;
    document.getElementById('stat-active-count').innerText = `${data.verified_active} Active Certified`;
  } catch (err) {
    console.error("Failed to load stats:", err);
  }
}

// Load and Render Devices in Marketplace
async function loadDevices() {
  const grid = document.getElementById('marketplace-grid');
  grid.innerHTML = '<div style="color: #9ca3af; padding: 2rem;">Loading verified inventory...</div>';

  try {
    const res = await fetch('/api/devices');
    AppState.devices = await res.json();
    renderDeviceCards();
  } catch (err) {
    grid.innerHTML = '<div style="color: #f43f5e; padding: 2rem;">Error connecting to marketplace API.</div>';
  }
}

function renderDeviceCards() {
  const grid = document.getElementById('marketplace-grid');
  grid.innerHTML = '';

  const filtered = AppState.devices.filter(d => {
    const matchesCat = AppState.selectedCategory === 'ALL' || d.category === AppState.selectedCategory;
    const matchesGrade = AppState.selectedGrade === 'ALL' || d.grade === AppState.selectedGrade;
    return matchesCat && matchesGrade;
  });

  if (filtered.length === 0) {
    grid.innerHTML = '<div style="color: #9ca3af; grid-column: 1/-1; padding: 3rem; text-align: center;">No devices matching your filters. Try selecting another category or grade.</div>';
    return;
  }

  filtered.forEach(device => {
    const card = document.createElement('div');
    card.className = 'device-card';

    const gradeLabels = {
      'A_PRISTINE': 'Grade A+ Pristine',
      'A_EXCELLENT': 'Grade A Excellent',
      'B_GOOD': 'Grade B Good',
      'PENDING': 'Verification Pending'
    };

    const statusLabels = {
      'VERIFIED_ACTIVE': 'Certified & In Stock',
      'IN_ESCROW': 'Escrow Active',
      'IN_VERIFICATION': 'In Lab Testing',
      'LISTED_UNVERIFIED': 'Awaiting Hub Delivery',
      'SOLD': 'Sold & Settled'
    };

    const discount = Math.round(((device.original_msrp - device.asking_price) / device.original_msrp) * 100);

    // Battery / OEM summary strip
    let batteryVal = "N/A";
    let oemVal = "OEM Verified";
    let imeiVal = "GSMA Clean";

    if (device.verification_report) {
      batteryVal = `${device.verification_report.battery_health_pct}%`;
      oemVal = "100% OEM";
      imeiVal = "Clean IMEI";
    }

    card.innerHTML = `
      <div class="device-image-container">
        <span class="badge-grade grade-${device.grade}">${gradeLabels[device.grade] || device.grade}</span>
        <span class="badge-status status-${device.status}">${statusLabels[device.status] || device.status}</span>
        <img class="device-image" src="${device.image_url}" alt="${device.title}" onerror="this.src='https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80'" />
      </div>

      <div class="device-body">
        <h3 class="device-title">${device.title}</h3>
        <div class="device-meta">
          <span>Seller: ${device.seller_name.split(' ')[0]} ★ ${device.seller_rating}</span>
          <span style="color: #34d399; font-weight: 600;">Save ${discount}%</span>
        </div>

        <div class="verification-summary-strip">
          <div class="v-strip-item">
            <span class="v-strip-val">${batteryVal}</span>
            <span class="v-strip-lbl">Battery Health</span>
          </div>
          <div class="v-strip-item">
            <span class="v-strip-val" style="color: #34d399;">${oemVal}</span>
            <span class="v-strip-lbl">Components</span>
          </div>
          <div class="v-strip-item">
            <span class="v-strip-val">${imeiVal}</span>
            <span class="v-strip-lbl">Security</span>
          </div>
        </div>

        <div class="device-footer">
          <div class="price-box">
            <span class="price-current">${formatCurrency(device.asking_price)}</span>
            <span class="price-msrp">MSRP ${formatCurrency(device.original_msrp)}</span>
          </div>
          <button class="btn-card-action" onclick="openDeviceDetailModal('${device.id}')">
            <span>View Passport</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

// Open Device Detail Modal with Full Diagnostic Passport
async function openDeviceDetailModal(deviceId) {
  const modal = document.getElementById('device-modal');
  const content = document.getElementById('modal-content');
  content.innerHTML = '<div style="padding: 3rem; text-align: center; color: #9ca3af;">Loading verified device passport...</div>';
  modal.classList.add('active');

  try {
    const res = await fetch(`/api/devices/${deviceId}`);
    const device = await res.json();
    AppState.currentDeviceModal = device;

    const report = device.verification_report;
    const isVerified = !!report;

    content.innerHTML = `
      <div style="display: flex; gap: 2rem; flex-wrap: wrap;">
        <!-- Left Column: Image & Specs -->
        <div style="flex: 1; min-width: 300px;">
          <img src="${device.image_url}" alt="${device.title}" style="width: 100%; border-radius: 12px; margin-bottom: 1.25rem; object-fit: cover; max-height: 280px;" />
          
          <h2 style="font-size: 1.5rem; font-weight: 800; margin-bottom: 0.5rem;">${device.title}</h2>
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 1rem;">
            <div style="font-size: 1.8rem; font-weight: 800; color: #fff;">${formatCurrency(device.asking_price)}</div>
            <div style="color: #9ca3af; text-decoration: line-through;">Original MSRP: ${formatCurrency(device.original_msrp)}</div>
          </div>

          <!-- Hardware Specs Card -->
          <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.25rem; margin-bottom: 1.5rem;">
            <div style="font-size: 0.85rem; font-weight: 700; color: #38bdf8; text-transform: uppercase; margin-bottom: 0.75rem;">Hardware Specifications</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; font-size: 0.85rem;">
              ${Object.entries(device.specs).map(([k, v]) => `
                <div>
                  <span style="color: #6b7280; text-transform: capitalize;">${k.replace('_', ' ')}:</span>
                  <div style="font-weight: 600; color: #e2e8f0;">${v}</div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Escrow Purchase Box -->
          ${device.status === 'VERIFIED_ACTIVE' ? `
            <div class="escrow-checkout-box">
              <div style="display: flex; align-items: center; gap: 0.5rem; font-weight: 700; color: #38bdf8; font-size: 1.05rem;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                Escrow Purchase Protection
              </div>
              <p style="font-size: 0.825rem; color: #94a3b8; margin: 0.5rem 0 1rem;">
                Funds remain locked in independent trust vault until you physically test the device during your 48-hour inspection period.
              </p>

              <div class="escrow-breakdown">
                <div class="escrow-row">
                  <span>Device Cost</span>
                  <span>${formatCurrency(device.asking_price)}</span>
                </div>
                <div class="escrow-row">
                  <span>Hub Inspection & Certification Fee</span>
                  <span>$25.00</span>
                </div>
                <div class="escrow-row">
                  <span>Secured & Insured Courier</span>
                  <span>$15.00</span>
                </div>
                <div class="escrow-row total">
                  <span>Total Escrow Lock</span>
                  <span style="color: #38bdf8;">${formatCurrency(device.asking_price + 40.00)}</span>
                </div>
              </div>

              <button class="btn-escrow-buy" onclick="initiateEscrowPurchase('${device.id}', ${device.asking_price})">
                Lock Funds in Escrow & Purchase
              </button>
            </div>
          ` : `
            <div style="background: rgba(255,255,255,0.04); padding: 1rem; border-radius: 10px; border: 1px solid var(--border-color); text-align: center;">
              <span style="color: #f59e0b; font-weight: 600;">Status: ${device.status.replace('_', ' ')}</span>
              <p style="font-size: 0.8rem; color: #9ca3af; margin-top: 0.3rem;">This item is currently locked in escrow or undergoing verification testing.</p>
            </div>
          `}
        </div>

        <!-- Right Column: Verification Passport & 40-Point Diagnostic -->
        <div style="flex: 1.4; min-width: 320px;">
          ${isVerified ? `
            <div class="passport-container">
              <div class="passport-seal">
                <div class="seal-title">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  Tamper-Evident Digital Passport
                </div>
                <span class="badge-grade grade-${report.overall_grade}">${report.overall_grade.replace('_', ' ')}</span>
              </div>

              <div style="margin-bottom: 1rem;">
                <div style="font-size: 0.72rem; color: #94a3b8; margin-bottom: 0.2rem;">CRYPTOGRAPHIC VERIFICATION SHA-256 HASH</div>
                <div class="hash-pill">${report.verification_hash}</div>
              </div>

              <div class="cert-grid">
                <div class="cert-stat">
                  <div class="cert-stat-label">Battery Health & Cycles</div>
                  <div class="cert-stat-val">
                    <span style="color: #34d399;">${report.battery_health_pct}%</span>
                    <span style="font-size: 0.8rem; color: #9ca3af;">(${report.battery_cycle_count} cycles)</span>
                  </div>
                </div>

                <div class="cert-stat">
                  <div class="cert-stat-label">Component Authenticity</div>
                  <div class="cert-stat-val" style="color: #38bdf8; font-size: 0.9rem;">
                    ✓ ${report.oem_parts_status}
                  </div>
                </div>

                <div class="cert-stat">
                  <div class="cert-stat-label">Moisture / LCI Status</div>
                  <div class="cert-stat-val" style="color: #34d399; font-size: 0.9rem;">
                    ✓ ${report.liquid_damage_status}
                  </div>
                </div>

                <div class="cert-stat">
                  <div class="cert-stat-label">IMEI & Anti-Theft Status</div>
                  <div class="cert-stat-val" style="color: #34d399; font-size: 0.9rem;">
                    ✓ ${report.imei_blacklist_status}
                  </div>
                </div>
              </div>

              <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.06); padding: 0.85rem; border-radius: 8px; font-size: 0.85rem; color: #cbd5e1; margin-bottom: 1rem;">
                <strong>Technician Findings:</strong> ${report.notes}
              </div>

              <div style="font-size: 0.75rem; color: #64748b; display: flex; justify-content: space-between;">
                <span>Verified by: ${report.verifier_name} (${report.verifier_id})</span>
                <span>Inspected on: ${new Date(report.verification_timestamp).toLocaleDateString()}</span>
              </div>
            </div>

            <!-- Detailed Diagnostics Checklist -->
            <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.75rem; color: #f9fafb;">40-Point Laboratory Test Suite</h3>
            <div class="diagnostic-checklist">
              ${report.diagnostic_tests.map(test => `
                <div class="check-item">
                  <div class="check-left">
                    <div class="check-name">${test.test}</div>
                    <div class="check-detail">${test.category} — ${test.detail}</div>
                  </div>
                  <span class="check-badge-pass">PASSED</span>
                </div>
              `).join('')}
            </div>
          ` : `
            <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 12px; padding: 2rem; text-align: center;">
              <h3 style="color: #fbbf24; margin-bottom: 0.5rem;">Physical Lab Testing In Progress</h3>
              <p style="color: #9ca3af; font-size: 0.9rem;">
                This device has been submitted by the seller and is queued at our certified verification lab. Once tests complete, a cryptographic passport will be generated.
              </p>
            </div>
          `}
        </div>
      </div>
    `;
  } catch (err) {
    content.innerHTML = '<div style="color: #f43f5e; padding: 2rem;">Failed to load device details.</div>';
  }
}

function closeDeviceModal() {
  document.getElementById('device-modal').classList.remove('active');
}

// Escrow Purchase
async function initiateEscrowPurchase(deviceId, amount) {
  const buyerName = prompt("Enter Buyer Name for Escrow Contract:", "Sarah Jenkins");
  if (!buyerName) return;

  try {
    const res = await fetch('/api/escrow/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_id: deviceId,
        buyer_name: buyerName,
        amount: amount
      })
    });

    const updated = await res.json();
    if (updated.error) {
      alert("Escrow error: " + updated.error);
      return;
    }

    closeDeviceModal();
    showToast(`Funds for ${updated.title} securely locked in Escrow Trust Vault!`, 'success');
    loadPlatformStats();
    switchView('escrow-view');
  } catch (err) {
    alert("Failed to initiate escrow.");
  }
}

// Seller Portal: Create Listing
async function handleSellerListingSubmit(e) {
  e.preventDefault();
  const form = e.target;

  const title = document.getElementById('sell-title').value.trim();
  const brand = document.getElementById('sell-brand').value.trim();
  const category = document.getElementById('sell-category').value;
  const imei = document.getElementById('sell-imei').value.trim();
  const askingPrice = parseFloat(document.getElementById('sell-price').value);
  const msrp = parseFloat(document.getElementById('sell-msrp').value);
  const sellerName = document.getElementById('sell-name').value.trim();
  const imageUrl = document.getElementById('sell-image').value.trim() || "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80";

  const specs = {
    storage: document.getElementById('sell-storage').value,
    color: document.getElementById('sell-color').value,
    condition_declared: document.getElementById('sell-condition').value
  };

  try {
    const res = await fetch('/api/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title, brand, category,
        imei_serial: imei,
        asking_price: askingPrice,
        original_msrp: msrp,
        seller_name: sellerName,
        specs,
        image_url: imageUrl
      })
    });

    const created = await res.json();
    showToast(`Listing created! Courier prepaid shipping kit dispatched to ${sellerName}.`, 'success');
    form.reset();
    DiagnosticsEngine.resetTouchGrid('touch-progress', 'touch-badge');
    loadPlatformStats();
    switchView('verifier-view');
  } catch (err) {
    alert("Failed to create listing: " + err);
  }
}

// Verifier Hub Workbench
async function loadVerifierQueue() {
  const container = document.getElementById('verifier-queue');
  container.innerHTML = '<div style="color: #9ca3af;">Loading testing queue...</div>';

  try {
    const res = await fetch('/api/devices');
    const all = await res.json();
    const pending = all.filter(d => d.status === 'LISTED_UNVERIFIED' || d.status === 'IN_VERIFICATION' || d.status === 'VERIFIED_ACTIVE');

    container.innerHTML = '';
    if (pending.length === 0) {
      container.innerHTML = '<div style="color: #9ca3af;">No devices currently in verification queue.</div>';
      return;
    }

    pending.forEach(dev => {
      const card = document.createElement('div');
      card.className = `bench-queue-card ${AppState.activeVerifierDevice?.id === dev.id ? 'selected' : ''}`;
      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <span style="font-weight: 700; font-size: 0.95rem;">${dev.title}</span>
          <span class="badge-status status-${dev.status}" style="position: static;">${dev.status}</span>
        </div>
        <div style="font-size: 0.8rem; color: #94a3b8; font-family: monospace;">IMEI: ${dev.imei_serial}</div>
        <div style="font-size: 0.78rem; color: #64748b; margin-top: 0.4rem;">Seller: ${dev.seller_name}</div>
      `;
      card.onclick = () => selectDeviceForWorkbench(dev.id);
      container.appendChild(card);
    });

    // Auto-select first if none selected
    if (!AppState.activeVerifierDevice && pending.length > 0) {
      selectDeviceForWorkbench(pending[0].id);
    }
  } catch (err) {
    container.innerHTML = '<div style="color: #f43f5e;">Failed to load lab queue.</div>';
  }
}

async function selectDeviceForWorkbench(deviceId) {
  try {
    const res = await fetch(`/api/devices/${deviceId}`);
    const dev = await res.json();
    AppState.activeVerifierDevice = dev;

    document.querySelectorAll('.bench-queue-card').forEach(c => {
      c.classList.toggle('selected', c.innerHTML.includes(dev.imei_serial));
    });

    const bench = document.getElementById('workbench-details');
    bench.innerHTML = `
      <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.75rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem;">
          <div>
            <h2 style="font-size: 1.35rem; font-weight: 800;">Laboratory Testing Station: ${dev.title}</h2>
            <div style="color: #94a3b8; font-size: 0.85rem; font-family: monospace;">Hardware Serial: ${dev.imei_serial}</div>
          </div>
          <span class="badge-grade grade-${dev.grade}">${dev.grade}</span>
        </div>

        <form id="verifier-inspection-form" onsubmit="handleInspectionSubmission(event, '${dev.id}')">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-bottom: 1.5rem;">
            <div class="form-group">
              <label class="form-label">Calculated Final Grade</label>
              <select id="v-grade" class="form-select">
                <option value="A_PRISTINE" ${dev.grade === 'A_PRISTINE' ? 'selected' : ''}>Grade A+ (Pristine, 95%+ Battery, No Marks)</option>
                <option value="A_EXCELLENT" ${dev.grade === 'A_EXCELLENT' ? 'selected' : ''}>Grade A (Excellent, Minor Hairline Scratches)</option>
                <option value="B_GOOD" ${dev.grade === 'B_GOOD' ? 'selected' : ''}>Grade B (Good, Visible Cosmetic Wear)</option>
                <option value="C_FAIR" ${dev.grade === 'C_FAIR' ? 'selected' : ''}>Grade C (Fair, Heavy Wear / Replaced Battery)</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Battery Capacity Health (%)</label>
              <input type="number" id="v-battery" class="form-input" value="${dev.verification_report?.battery_health_pct || 96}" min="50" max="100" />
            </div>

            <div class="form-group">
              <label class="form-label">Battery Discharge Cycles</label>
              <input type="number" id="v-cycles" class="form-input" value="${dev.verification_report?.battery_cycle_count || 128}" />
            </div>

            <div class="form-group">
              <label class="form-label">Internal Liquid Sensor (LCI) Status</label>
              <select id="v-liquid" class="form-select">
                <option value="Dry - Zero Moisture Contact">Dry - Zero Moisture (All LCIs White)</option>
                <option value="Moisture Contact Detected">MOISTURE DETECTED (Red LCI)</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">OEM Component Verification</label>
              <select id="v-oem" class="form-select">
                <option value="All Original OEM Parts Verified">All Original OEM Parts Verified</option>
                <option value="Aftermarket Screen Detected">Aftermarket Screen Detected</option>
                <option value="Aftermarket Battery Detected">Aftermarket Battery Detected</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">GSMA Blacklist & FRP Lock Check</label>
              <select id="v-imei" class="form-select">
                <option value="Clean - GSMA & Carrier Whitelisted">Clean - GSMA & Carrier Whitelisted</option>
                <option value="BLACKLISTED - REPORTED STOLEN">BLACKLISTED - REPORTED STOLEN</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Technician Notes & Bench Observations</label>
            <textarea id="v-notes" class="form-textarea" rows="3">${dev.verification_report?.notes || "Bench diagnostic run complete. Display, thermals, digitizer, and cameras meet ISO 9001 factory tolerances."}</textarea>
          </div>

          <button type="submit" class="btn-escrow-buy" style="background: linear-gradient(135deg, #10b981, #06b6d4);">
            Sign & Issue Tamper-Evident Digital Passport (SHA-256)
          </button>
        </form>
      </div>
    `;
  } catch (err) {
    console.error(err);
  }
}

async function handleInspectionSubmission(e, deviceId) {
  e.preventDefault();

  const grade = document.getElementById('v-grade').value;
  const batteryPct = parseInt(document.getElementById('v-battery').value);
  const batteryCycles = parseInt(document.getElementById('v-cycles').value);
  const liquid = document.getElementById('v-liquid').value;
  const oem = document.getElementById('v-oem').value;
  const imei = document.getElementById('v-imei').value;
  const notes = document.getElementById('v-notes').value;

  const tests = [
    { category: "Security", test: "GSMA IMEI Anti-theft Database", result: "PASSED", detail: imei },
    { category: "Screen", test: "OEM Display Cryptographic Handshake", result: "PASSED", detail: oem },
    { category: "Power", test: "Battery Capacity & Stress Benchmark", result: "PASSED", detail: `${batteryPct}% design capacity, ${batteryCycles} cycles` },
    { category: "Hardware", test: "Liquid Contact Indicator (LCI)", result: "PASSED", detail: liquid },
    { category: "Sensors", test: "Biometrics & Camera Matrix", result: "PASSED", detail: "Face/Fingerprint sensor & all lenses in factory spec" },
    { category: "Audio", test: "Speaker & Microphone Array Sweep", result: "PASSED", detail: "20Hz-20kHz balanced response, mic SNR > 65dB" }
  ];

  try {
    const res = await fetch(`/api/verifications/${deviceId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        verifier_id: 'LAB-TECH-BAY-09',
        verifier_name: 'TechCert Inspection Lab #4',
        grade: grade,
        battery_pct: batteryPct,
        battery_cycles: batteryCycles,
        oem_status: oem,
        liquid_status: liquid,
        imei_status: imei,
        cosmetic_score: 9.6,
        functional_score: 10.0,
        tests: tests,
        notes: notes
      })
    });

    const updated = await res.json();
    showToast(`Verification complete! Digital Passport issued for ${updated.title}`, 'success');
    loadPlatformStats();
    selectDeviceForWorkbench(deviceId);
    loadVerifierQueue();
  } catch (err) {
    alert("Verification failed: " + err);
  }
}

// Escrow Vault View
async function loadEscrowVault() {
  const container = document.getElementById('escrow-vault-content');
  container.innerHTML = '<div style="color: #9ca3af;">Loading escrow transactions...</div>';

  try {
    const res = await fetch('/api/devices');
    const devices = await res.json();
    const escrowDevices = devices.filter(d => d.escrow);

    if (escrowDevices.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 4rem; color: #9ca3af;">
          <h3>No Active Escrows</h3>
          <p style="font-size: 0.9rem; margin-top: 0.5rem;">To test the escrow lifecycle, go to the <strong>Marketplace</strong> and click <strong>"Lock Funds in Escrow & Purchase"</strong> on any verified device.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = escrowDevices.map(d => {
      const esc = d.escrow;
      return `
        <div class="escrow-vault-card">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem;">
            <div>
              <div style="font-size: 0.8rem; color: #38bdf8; font-weight: 700;">ESCROW TRUST VAULT ID: ${esc.id}</div>
              <h3 style="font-size: 1.35rem; font-weight: 800; margin-top: 0.2rem;">${d.title}</h3>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 1.4rem; font-weight: 800; color: #34d399;">${formatCurrency(esc.total_escrow_amount)}</div>
              <span class="badge-status status-${esc.status}">${esc.status.replace('_', ' ')}</span>
            </div>
          </div>

          <!-- Stepper -->
          ${EscrowEngine.renderStepper(esc.status)}

          <!-- Interactive State Control Controls for Demo -->
          <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 10px; padding: 1.25rem; margin: 1.5rem 0;">
            <div style="font-size: 0.85rem; font-weight: 700; color: #e2e8f0; margin-bottom: 0.75rem;">Simulate Escrow Lifecycle Steps:</div>
            <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
              <button class="filter-btn" onclick="triggerEscrowStep('${esc.id}', 'SENT_TO_HUB', 'Seller dropped package at FedEx with prepaid insured label.')">
                1. Seller Ships to Lab
              </button>
              <button class="filter-btn" onclick="triggerEscrowStep('${esc.id}', 'INSPECTION_PASSED', 'Lab verified 40 checkpoints. OEM parts and battery health approved.')">
                2. Lab Pass & Dispatch
              </button>
              <button class="filter-btn" onclick="triggerEscrowStep('${esc.id}', 'BUYER_INSPECTION_WINDOW', 'Delivered to Buyer. 48-hour physical inspection timer activated.')">
                3. Buyer Receives Package
              </button>
              <button class="filter-btn" style="background: #10b981; color: #fff; border-color: #34d399;" onclick="triggerEscrowStep('${esc.id}', 'COMPLETED_RELEASED', 'Buyer accepted device condition. Funds disbursed to seller!')">
                4. Buyer Accepts -> Release Funds
              </button>
              <button class="filter-btn" style="background: #f43f5e; color: #fff; border-color: #fb7185;" onclick="triggerEscrowStep('${esc.id}', 'DISPUTED', 'Buyer flagged undisclosed scratch on camera lens. Dispute mediator assigned.')">
                Raise Dispute / Refund
              </button>
            </div>
          </div>

          <!-- Audit Ledger -->
          <div style="font-size: 0.85rem; font-weight: 700; color: #94a3b8; margin-bottom: 0.5rem;">Cryptographic Escrow Audit Ledger</div>
          <div class="audit-feed">
            ${esc.audit_log.map(entry => `
              <div class="audit-entry">
                <span class="audit-time">${new Date(entry.timestamp).toLocaleTimeString()}</span>
                <span class="audit-text"><strong>[${entry.status}]</strong> ${entry.event}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    container.innerHTML = '<div style="color: #f43f5e;">Failed to load escrow vault.</div>';
  }
}

async function triggerEscrowStep(escrowId, status, comment) {
  const updated = await EscrowEngine.transition(escrowId, status, comment);
  if (updated) {
    showToast(`Escrow status updated to ${status}`, 'success');
    loadPlatformStats();
    loadEscrowVault();
  }
}

// Category & Grade Filter Click Handlers
function initFilters() {
  document.querySelectorAll('.filter-category-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.filter-category-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      AppState.selectedCategory = btn.dataset.cat;
      renderDeviceCards();
    };
  });

  document.querySelectorAll('.filter-grade-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.filter-grade-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      AppState.selectedGrade = btn.dataset.grade;
      renderDeviceCards();
    };
  });
}

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  loadPlatformStats();
  loadDevices();
  initFilters();

  // Diagnostics Suite Init
  DiagnosticsEngine.initTouchTest('touch-canvas', 'touch-progress', 'touch-badge');

  const deadPixelBox = document.getElementById('dead-pixel-box');
  if (deadPixelBox) {
    deadPixelBox.onclick = () => {
      DiagnosticsEngine.cycleDeadPixelTest('dead-pixel-box', 'dead-pixel-label');
    };
  }
});
