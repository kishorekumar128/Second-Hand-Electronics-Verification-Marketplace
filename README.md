# VeriTech: Second-Hand Electronics Verification & Escrow Marketplace

A full-stack certified pre-owned electronics marketplace built to eliminate the **"Lemon Market"** dilemma in consumer electronics re-commerce.

---

## 1. Problem & Core Value Proposition

In traditional peer-to-peer marketplaces (eBay, Craigslist, Facebook Marketplace), buyers face severe information asymmetry:
* **Concealed Liquid Ingress:** Devices with triggered Liquid Contact Indicators (LCIs) that suffer latent corrosion.
* **Counterfeit & Aftermarket Components:** Low-grade non-OEM screens lacking TrueTone/ProMotion or fire-hazard aftermarket batteries.
* **Degraded Battery Chemistries:** Devices reporting inflated battery health despite internal chemical degradation.
* **Anti-Theft & Carrier Blacklists:** Devices blacklisted via GSMA databases days after purchase due to unpaid carrier financing or theft reports.
* **iCloud / FRP / MDM Enterprise Locks:** Devices locked to previous corporate organizations or iCloud accounts.

**VeriTech** solves this by inserting an **Independent Hardware Verification & Escrow Clearinghouse** between buyers and sellers.

---

## 2. Key Architectural Pillars

### A. 40-Point Laboratory Bench Inspection
Every listed item is routed through an authorized inspection facility where certified technicians execute automated hardware attestation:
1. **Security & Identity:** GSMA International Stolen Equipment Database check, Apple iCloud Activation Lock / Android Factory Reset Protection (FRP) state, Enterprise MDM enrollment check.
2. **Display & Digitizer:** OEM cryptographic pairing token check, 64-zone touch matrix continuity test, sub-pixel color uniformity, and peak nit HDR luminosity verification.
3. **Power & Battery:** Internal gas-gauge micro-controller telemetry (actual milliampere-hour retention vs. design capacity, charge cycle count, impedance health).
4. **Internal Hardware Integrity:** Microscope inspection of internal Liquid Contact Indicators (LCIs), logic board solder inspection, tamper seal audit.
5. **Sensor Array:** LiDAR scanners, TrueDepth / Face ID infrared dot projectors, OIS gyroscope actuators, haptic engines.

### B. Cryptographic Tamper-Evident Digital Passport
Each verified device receives a digital certificate with a SHA-256 cryptographic digest binding:
$$\text{Passport Hash} = \text{SHA-256}(\text{DeviceID} \parallel \text{IMEI} \parallel \text{BatteryHealth} \parallel \text{VerifierID} \parallel \text{Timestamp} \parallel \text{DiagnosticsJSON})$$
This ensures that condition reports cannot be manipulated by dishonest sellers or third parties.

### C. Tri-Party Escrow Settlement Engine
Funds are never released directly to a seller upon checkout:
1. **Buyer Checkout:** Payment is locked in a dedicated escrow trust account.
2. **Hub Dispatch:** Insured, prepaid shipping kit routes device to lab hub.
3. **Bench Certification:** Lab inspects and signs the digital passport.
4. **Insured Courier Delivery:** Device ships to buyer.
5. **48-Hour In-Hand Inspection Window:** Buyer tests device in person.
6. **Automatic Release or Dispute Mediation:** Once approved (or 48 hours lapse without objection), funds disburse to the seller and the lab inspection fee is settled.

---

## 3. Technology Stack

* **Backend & API:** Python Standard Library (`http.server.ThreadingHTTPServer`, `sqlite3`, `json`, `hashlib`) — **Zero external package dependencies required**.
* **Frontend:** Modern Single Page Application (HTML5, Vanilla ES6+ JavaScript, CSS3 with Glassmorphism and responsive design).
* **Database:** SQLite relational engine (`devices`, `verification_reports`, `escrow_transactions`).
* **Hardware Diagnostics Suite:** Interactive HTML5 Canvas Digitizer Matrix, Web Audio API Acoustic Sweeps, and simulated GSMA anti-theft checks.

---

## 4. Getting Started

### Prerequisites
* Python 3.8+ (Already installed on your system)

### Launching the Application
Open a terminal in this workspace and execute:

```bash
python server.py
```

Then open your browser and navigate to:
```
http://localhost:8000
```
(If port 8000 is occupied, the server will automatically fallback to port 3000, 5000, or 8081). You can also explicitly specify a port:
```powershell
python server.py 8000
```

---

## 5. Walkthrough Guide & Portals

1. **Buyer Marketplace View:**
   * Browse verified inventory (smartphones, laptops, tablets, audio gear, gaming handhelds).
   * Filter by condition grade (`Grade A+ Pristine`, `Grade A Excellent`, `Grade B Good`).
   * Click **"View Passport"** on any device to view the cryptographic hash, battery cycles, OEM component status, and 40-point inspection results.
   * Click **"Lock Funds in Escrow & Purchase"** to simulate an escrow deposit.

2. **Seller Diagnostics & Listing View:**
   * Fill out the listing form and enter a 15-digit IMEI.
   * Click **"Verify GSMA"** to run the anti-theft pre-check.
   * Draw across the **Touchscreen Digitizer Matrix** to test touch responsiveness.
   * Cycle colors in the **Dead Pixel & Color Uniformity Box** (Red, Green, Blue, White, Black).
   * Click **"Run Acoustic Diagnostic Burst"** to test stereo audio drivers.
   * Click **"Create Listing"** to register the device.

3. **Lab Verifier Workbench:**
   * View incoming devices in the physical lab queue.
   * Conduct bench evaluations (set battery health %, cycles, OEM authenticity, LCI moisture status).
   * Click **"Sign & Issue Tamper-Evident Digital Passport"** to compute the SHA-256 seal and transition the listing to `VERIFIED_ACTIVE`.

4. **Escrow Trust Vault:**
   * Track live escrow transactions along the multi-step pipeline.
   * Use the simulation buttons (`Seller Ships to Lab`, `Lab Pass & Dispatch`, `Buyer Receives Package`, `Release Funds`) to observe live state transitions and cryptographic audit logs.

---

## 6. REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/stats` | Platform metrics (escrow volume, fraud prevention rate) |
| `GET` | `/api/devices` | List inventory with `status` and `category` query filters |
| `GET` | `/api/devices/{id}` | Detailed device view with passport and escrow record |
| `POST` | `/api/devices` | Seller creates a new listing |
| `POST` | `/api/verifications/{id}` | Lab technician issues signed 40-point verification passport |
| `POST` | `/api/escrow/create` | Buyer deposits funds into trust escrow |
| `POST` | `/api/escrow/transition` | Advances or disputes escrow state machine |
