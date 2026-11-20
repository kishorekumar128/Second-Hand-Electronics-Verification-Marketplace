"""
Database module for Second-Hand Electronics Verification Marketplace
Provides SQLite storage, schema initialization, and seed data.
"""

import sqlite3
import json
import hashlib
import time
from datetime import datetime, timedelta

DB_PATH = "marketplace.db"

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def compute_verification_hash(device_id, imei, tests_json, battery_pct, verifier_id, timestamp):
    payload = f"{device_id}:{imei}:{battery_pct}:{verifier_id}:{timestamp}:{tests_json}"
    return hashlib.sha256(payload.encode('utf-8')).hexdigest()

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # Devices Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS devices (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        brand TEXT NOT NULL,
        category TEXT NOT NULL,
        imei_serial TEXT NOT NULL,
        original_msrp REAL NOT NULL,
        asking_price REAL NOT NULL,
        seller_name TEXT NOT NULL,
        seller_rating REAL DEFAULT 4.9,
        status TEXT NOT NULL,
        grade TEXT DEFAULT 'PENDING',
        specs TEXT NOT NULL,
        image_url TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
    """)

    # Verification Reports Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS verification_reports (
        id TEXT PRIMARY KEY,
        device_id TEXT NOT NULL,
        verifier_id TEXT NOT NULL,
        verifier_name TEXT NOT NULL,
        verification_timestamp TEXT NOT NULL,
        verification_hash TEXT NOT NULL,
        overall_grade TEXT NOT NULL,
        battery_health_pct INTEGER NOT NULL,
        battery_cycle_count INTEGER NOT NULL,
        oem_parts_status TEXT NOT NULL,
        liquid_damage_status TEXT NOT NULL,
        imei_blacklist_status TEXT NOT NULL,
        activation_lock_status TEXT NOT NULL,
        cosmetic_score REAL NOT NULL,
        functional_score REAL NOT NULL,
        diagnostic_tests TEXT NOT NULL,
        notes TEXT,
        FOREIGN KEY (device_id) REFERENCES devices(id)
    )
    """)

    # Escrow Transactions Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS escrow_transactions (
        id TEXT PRIMARY KEY,
        device_id TEXT NOT NULL,
        buyer_name TEXT NOT NULL,
        seller_name TEXT NOT NULL,
        amount REAL NOT NULL,
        verification_fee REAL NOT NULL,
        shipping_fee REAL NOT NULL,
        total_escrow_amount REAL NOT NULL,
        status TEXT NOT NULL,
        tracking_number TEXT,
        inspection_window_expires_at TEXT,
        created_at TEXT NOT NULL,
        audit_log TEXT NOT NULL,
        FOREIGN KEY (device_id) REFERENCES devices(id)
    )
    """)

    conn.commit()

    # Seed if empty
    cursor.execute("SELECT COUNT(*) FROM devices")
    if cursor.fetchone()[0] == 0:
        seed_data(cursor)
        conn.commit()

    conn.close()

def seed_data(cursor):
    now = datetime.now()
    now_str = now.isoformat()

    sample_tests_iphone = [
        {"category": "Security & Identity", "test": "GSMA Stolen Device Blacklist Check", "result": "PASSED", "detail": "Clean IMEI, clean carrier status, zero unpaid financing flags"},
        {"category": "Security & Identity", "test": "Apple iCloud Activation Lock", "result": "PASSED", "detail": "Find My disabled, clean DFU mode, zero MDM enterprise profiles"},
        {"category": "Screen & Digitizer", "test": "Touch Digitizer Multi-point Matrix", "result": "PASSED", "detail": "100% 64-zone touch matrix responsive, 120Hz ProMotion fluid"},
        {"category": "Screen & Digitizer", "test": "Dead Pixel & Sub-pixel Color Uniformity", "result": "PASSED", "detail": "Zero sub-pixel burn-in, TrueTone sensor factory calibrated"},
        {"category": "Screen & Digitizer", "test": "OEM Display Authenticity Test", "result": "PASSED", "detail": "Original Apple Super Retina XDR with cryptographic pairing token intact"},
        {"category": "Power & Battery", "test": "Internal Battery Gas-Gauge Telemetry", "result": "PASSED", "detail": "96% effective capacity, 142 complete discharge cycles recorded"},
        {"category": "Power & Battery", "test": "Thermal Behavior & Fast-Charging Pin Test", "result": "PASSED", "detail": "Peak 27W USB-PD charging verified without thermal throttling"},
        {"category": "Sensors & Biometrics", "test": "TrueDepth Camera & Face ID Hardware", "result": "PASSED", "detail": "Dot projector and infrared camera pass calibration tolerances"},
        {"category": "Sensors & Biometrics", "test": "LiDAR Scanner & Pro Camera Array", "result": "PASSED", "detail": "48MP main sensor, 5x periscope telephoto, OIS gyro motors pristine"},
        {"category": "Chassis & Hardware", "test": "Liquid Contact Indicator (LCI) Bench", "result": "PASSED", "detail": "SIM tray and logic board internal LCIs 100% white (no moisture)"},
        {"category": "Audio & Connectivity", "test": "Spatial Stereo Speakers & Array Mic", "result": "PASSED", "detail": "Frequency sweep 20Hz-20kHz balanced, beamforming mic functional"},
        {"category": "Audio & Connectivity", "test": "5G Sub-6 / mmWave & Wi-Fi 6E RF Test", "result": "PASSED", "detail": "Full signal strength on both 2.4/5/6GHz bands, NFC tag read OK"}
    ]

    sample_tests_macbook = [
        {"category": "Security & Identity", "test": "Apple T2 / Secure Enclave Enrolment", "result": "PASSED", "detail": "Activation Lock disabled, FileVault ready, zero remote MDM profiles"},
        {"category": "Power & Battery", "test": "Battery Cycle & Retention Benchmark", "result": "PASSED", "detail": "98% original design capacity, 64 cycles recorded"},
        {"category": "Screen & Chassis", "test": "Liquid Retina XDR Mini-LED Test", "result": "PASSED", "detail": "1600 nits peak HDR verified, zero keyboard keycap imprint on anti-reflective coating"},
        {"category": "Compute & Thermal", "test": "M3 Pro Silicon Multi-core Stress Test", "result": "PASSED", "detail": "Fans spin smoothly under load, zero thermal paste degradation"},
        {"category": "Internal Hardware", "test": "OEM Internal Board & Liquid Sensor", "result": "PASSED", "detail": "All factory tamper stickers present, LCI pristine white"},
        {"category": "I/O Ports", "test": "Thunderbolt 4 / MagSafe 3 / HDMI 2.1", "result": "PASSED", "detail": "All 3 TB4 ports negotiate 40Gbps data and 100W PD charging"}
    ]

    # Device 1: iPhone 15 Pro Max (VERIFIED_ACTIVE)
    d1_id = "DEV-2026-001"
    d1_imei = "359124098273612"
    d1_specs = json.dumps({"storage": "256GB", "color": "Natural Titanium", "ram": "8GB", "carrier": "Factory Unlocked", "condition_notes": "Single micro-abrasion on lower bezel edge"})
    cursor.execute("""
    INSERT INTO devices VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (d1_id, "Apple iPhone 15 Pro Max 256GB", "Apple", "Smartphones", d1_imei, 1199.00, 890.00, "Alex Rivera (San Francisco)", 4.95, "VERIFIED_ACTIVE", "A_PRISTINE", d1_specs, "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&auto=format&fit=crop&q=80", now_str))

    # Verification Report for Device 1
    tests_json1 = json.dumps(sample_tests_iphone)
    v1_hash = compute_verification_hash(d1_id, d1_imei, tests_json1, 96, "VER-LAB-04", now_str)
    cursor.execute("""
    INSERT INTO verification_reports VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        "VR-2026-9041", d1_id, "VER-LAB-04", "TechCert Labs (Bay Area Hub)", now_str, v1_hash,
        "A_PRISTINE", 96, 142, "All Original OEM Certified Parts",
        "No Liquid Contact (All Internal LCIs Untriggered)",
        "Clean - GSMA & Global Stolen Registry Verified",
        "Clean - iCloud & Activation Lock Unlocked",
        9.8, 10.0, tests_json1,
        "Superb condition. Micro-scuff near bottom antenna band barely visible under 10x loupe. Full battery longevity verified."
    ))

    # Device 2: MacBook Pro 14" M3 Pro (IN_ESCROW)
    d2_id = "DEV-2026-002"
    d2_imei = "C02G90PLMD6T"
    d2_specs = json.dumps({"processor": "Apple M3 Pro (11-core CPU, 14-core GPU)", "ram": "18GB Unified", "storage": "512GB NVMe SSD", "color": "Space Black"})
    cursor.execute("""
    INSERT INTO devices VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (d2_id, "MacBook Pro 14\" M3 Pro (18GB/512GB)", "Apple", "Laptops", d2_imei, 1999.00, 1540.00, "Elena Rostova (Austin)", 5.0, "IN_ESCROW", "A_EXCELLENT", d2_specs, "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80", now_str))

    tests_json2 = json.dumps(sample_tests_macbook)
    v2_hash = compute_verification_hash(d2_id, d2_imei, tests_json2, 98, "VER-LAB-01", now_str)
    cursor.execute("""
    INSERT INTO verification_reports VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        "VR-2026-8710", d2_id, "VER-LAB-01", "VeriTech Certified Austin", now_str, v2_hash,
        "A_EXCELLENT", 98, 64, "All Original OEM Components",
        "Dry Inspection Passed (Zero Moisture Residual)",
        "Clean Serial - Enterprise MDM Clean",
        "Apple ID & FileVault De-registered",
        9.6, 9.9, tests_json2,
        "Battery condition like new. Keyboard keycaps display zero gloss/wear. Display hinge tension nominal."
    ))

    # Escrow for Device 2
    escrow_log2 = json.dumps([
        {"timestamp": (now - timedelta(days=2)).isoformat(), "event": "Buyer deposited $1,595.00 into Third-Party Trust Vault", "status": "FUNDS_LOCKED"},
        {"timestamp": (now - timedelta(days=1)).isoformat(), "event": "Inspection complete at Austin Hub. 40-point verification passed.", "status": "INSPECTION_PASSED"},
        {"timestamp": now_str, "event": "Delivered to Buyer via Secured Courier. 48-Hour Inspection Window Active.", "status": "BUYER_INSPECTION_WINDOW"}
    ])
    cursor.execute("""
    INSERT INTO escrow_transactions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        "ESC-9102", d2_id, "Marcus Vance (Seattle)", "Elena Rostova (Austin)",
        1540.00, 35.00, 20.00, 1595.00, "BUYER_INSPECTION_WINDOW", "1Z9999999999999999",
        (now + timedelta(hours=36)).isoformat(), now_str, escrow_log2
    ))

    # Device 3: Samsung Galaxy S24 Ultra (IN_VERIFICATION)
    d3_id = "DEV-2026-003"
    d3_imei = "354910294819283"
    d3_specs = json.dumps({"storage": "512GB", "color": "Titanium Gray", "ram": "12GB", "stylus": "S-Pen Included and Synchronized"})
    cursor.execute("""
    INSERT INTO devices VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (d3_id, "Samsung Galaxy S24 Ultra 512GB", "Samsung", "Smartphones", d3_imei, 1419.00, 960.00, "David Chen (Chicago)", 4.8, "IN_VERIFICATION", "PENDING", d3_specs, "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600&auto=format&fit=crop&q=80", now_str))

    # Device 4: Sony WH-1000XM5 (VERIFIED_ACTIVE)
    d4_id = "DEV-2026-004"
    d4_imei = "SN-SONY-99812A"
    d4_specs = json.dumps({"color": "Silver", "anc": "Integrated Processor V1 + QN1", "battery_runtime": "30h ANC on", "accessories": "Original Magnetic Travel Case + 3.5mm Gold Cable"})
    cursor.execute("""
    INSERT INTO devices VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (d4_id, "Sony WH-1000XM5 Wireless ANC Headphones", "Sony", "Audio", d4_imei, 399.00, 240.00, "Samantha Ray (Denver)", 4.9, "VERIFIED_ACTIVE", "A_EXCELLENT", d4_specs, "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&auto=format&fit=crop&q=80", now_str))

    tests_json4 = json.dumps([
        {"category": "Audio Drivers", "test": "30mm Carbon Fiber Composite Drivers", "result": "PASSED", "detail": "Left/Right dB balance ±0.2dB variance"},
        {"category": "ANC & Microphones", "test": "8-Microphone Active Noise Cancellation Matrix", "result": "PASSED", "detail": "Auto NC Optimizer calibrated"},
        {"category": "Battery", "test": "Lithium-Ion Quick-Charge Cycle Test", "result": "PASSED", "detail": "Full 30-hour playback capacity verified (95% health)"},
        {"category": "Physical Condition", "test": "Ear Cushion & Synthetic Soft Fit Leather", "result": "PASSED", "detail": "Zero tears, sanitized with UV-C sterilizer chamber"}
    ])
    v4_hash = compute_verification_hash(d4_id, d4_imei, tests_json4, 95, "VER-LAB-02", now_str)
    cursor.execute("""
    INSERT INTO verification_reports VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        "VR-2026-6632", d4_id, "VER-LAB-02", "Denver Audio & Mobile Tech Lab", now_str, v4_hash,
        "A_EXCELLENT", 95, 38, "Original Sony OEM Parts",
        "Dry / Zero Moisture", "Verified Non-Counterfeit (Sony Authenticity Handshake)",
        "Not Applicable (Audio Peripheral)",
        9.7, 10.0, tests_json4,
        "Sanitized in UV-C medical enclosure. Sound signature matches factory curve. Case and cabling included."
    ))

    # Device 5: Steam Deck OLED 1TB (VERIFIED_ACTIVE)
    d5_id = "DEV-2026-005"
    d5_imei = "VALVE-SD-88190"
    d5_specs = json.dumps({"display": "7.4\" 90Hz HDR OLED", "storage": "1TB High-speed NVMe", "battery": "50Whr", "extras": "Anti-glare Etched Glass + Valve Carrying Pouch"})
    cursor.execute("""
    INSERT INTO devices VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (d5_id, "Valve Steam Deck OLED 1TB", "Valve", "Gaming Handhelds", d5_imei, 649.00, 480.00, "Leo Kim (Portland)", 4.98, "VERIFIED_ACTIVE", "A_PRISTINE", d5_specs, "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80", now_str))

    tests_json5 = json.dumps([
        {"category": "OLED Display", "test": "90Hz HDR Uniformity & Zero Burn-in", "result": "PASSED", "detail": "1000 nits peak HDR verified"},
        {"category": "Controls & Joysticks", "test": "Thumbstick Hall-Effect / Drift Test", "result": "PASSED", "detail": "Zero deadzone drift (<0.5%), haptic trackpads calibrated"},
        {"category": "Thermal & Battery", "test": "6nm AMD APU Stress Test", "result": "PASSED", "detail": "Whisper quiet fan curve, 97% battery capacity retained"},
        {"category": "System Legitimacy", "test": "SteamOS BIOS & Hardware Attestation", "result": "PASSED", "detail": "Motherboard serial matches chassis barcode, clean unbanned Steam account linkage"}
    ])
    v5_hash = compute_verification_hash(d5_id, d5_imei, tests_json5, 97, "VER-LAB-04", now_str)
    cursor.execute("""
    INSERT INTO verification_reports VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        "VR-2026-4421", d5_id, "VER-LAB-04", "TechCert Labs (Bay Area Hub)", now_str, v5_hash,
        "A_PRISTINE", 97, 45, "All Original Valve OEM Parts",
        "Dry (LCI Untriggered)", "Clean Hardware Serial", "Steam Account Unlinked",
        9.9, 10.0, tests_json5,
        "Like brand new. Thumbstick sensors exhibit zero drift. Battery maintains full charge retention."
    ))

    # Device 6: Apple iPad Pro 12.9" M2 (LISTED_UNVERIFIED)
    d6_id = "DEV-2026-006"
    d6_imei = "DMP92048K120"
    d6_specs = json.dumps({"processor": "Apple M2", "storage": "128GB Wi-Fi", "screen": "Liquid Retina XDR Mini-LED", "color": "Space Gray"})
    cursor.execute("""
    INSERT INTO devices VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (d6_id, "iPad Pro 12.9\" M2 128GB Wi-Fi", "Apple", "Tablets", d6_imei, 1099.00, 690.00, "Jordan Miles (New York)", 4.7, "LISTED_UNVERIFIED", "PENDING", d6_specs, "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&auto=format&fit=crop&q=80", now_str))

# CRUD helpers
def get_all_devices(status_filter=None, category_filter=None):
    conn = get_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM devices WHERE 1=1"
    params = []
    if status_filter:
        query += " AND status = ?"
        params.append(status_filter)
    if category_filter:
        query += " AND category = ?"
        params.append(category_filter)
    query += " ORDER BY created_at DESC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    devices = [dict(row) for row in rows]
    for d in devices:
        d['specs'] = json.loads(d['specs'])
    conn.close()
    return devices

def get_device_by_id(device_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM devices WHERE id = ?", (device_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None
    device = dict(row)
    device['specs'] = json.loads(device['specs'])

    # Attach verification report if exists
    cursor.execute("SELECT * FROM verification_reports WHERE device_id = ?", (device_id,))
    vrow = cursor.fetchone()
    if vrow:
        report = dict(vrow)
        report['diagnostic_tests'] = json.loads(report['diagnostic_tests'])
        device['verification_report'] = report
    else:
        device['verification_report'] = None

    # Attach escrow if exists
    cursor.execute("SELECT * FROM escrow_transactions WHERE device_id = ?", (device_id,))
    erow = cursor.fetchone()
    if erow:
        escrow = dict(erow)
        escrow['audit_log'] = json.loads(escrow['audit_log'])
        device['escrow'] = escrow
    else:
        device['escrow'] = None

    conn.close()
    return device

def create_device(title, brand, category, imei_serial, original_msrp, asking_price, seller_name, specs, image_url):
    conn = get_connection()
    cursor = conn.cursor()
    device_id = f"DEV-{int(time.time()) % 1000000:06d}"
    now_str = datetime.now().isoformat()
    specs_json = json.dumps(specs)

    cursor.execute("""
    INSERT INTO devices VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (device_id, title, brand, category, imei_serial, original_msrp, asking_price, seller_name, 4.9, "LISTED_UNVERIFIED", "PENDING", specs_json, image_url, now_str))
    conn.commit()
    conn.close()
    return get_device_by_id(device_id)

def submit_verifier_inspection(device_id, verifier_id, verifier_name, grade, battery_pct, battery_cycles, oem_status, liquid_status, imei_status, lock_status, cosmetic_score, functional_score, tests, notes=""):
    conn = get_connection()
    cursor = conn.cursor()

    # Get device to retrieve imei
    cursor.execute("SELECT imei_serial FROM devices WHERE id = ?", (device_id,))
    dev = cursor.fetchone()
    if not dev:
        conn.close()
        return None

    imei = dev['imei_serial']
    now_str = datetime.now().isoformat()
    tests_json = json.dumps(tests)
    report_id = f"VR-{int(time.time()) % 1000000:06d}"
    vhash = compute_verification_hash(device_id, imei, tests_json, battery_pct, verifier_id, now_str)

    cursor.execute("DELETE FROM verification_reports WHERE device_id = ?", (device_id,))
    cursor.execute("""
    INSERT INTO verification_reports VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        report_id, device_id, verifier_id, verifier_name, now_str, vhash,
        grade, battery_pct, battery_cycles, oem_status, liquid_status,
        imei_status, lock_status, cosmetic_score, functional_score,
        tests_json, notes
    ))

    # Update device status and grade
    cursor.execute("""
    UPDATE devices SET status = 'VERIFIED_ACTIVE', grade = ? WHERE id = ?
    """, (grade, device_id))

    conn.commit()
    conn.close()
    return get_device_by_id(device_id)

def create_escrow_deposit(device_id, buyer_name, amount, verification_fee=25.0, shipping_fee=15.0):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM devices WHERE id = ?", (device_id,))
    dev = cursor.fetchone()
    if not dev:
        conn.close()
        return None

    now = datetime.now()
    now_str = now.isoformat()
    escrow_id = f"ESC-{int(time.time()) % 1000000:06d}"
    total = amount + verification_fee + shipping_fee
    tracking = f"TRK-{int(time.time() * 1000) % 10000000000:010d}"
    expires = (now + timedelta(hours=48)).isoformat()

    audit_log = json.dumps([
        {"timestamp": now_str, "event": f"Buyer {buyer_name} locked ${total:.2f} into Escrow Trust Vault.", "status": "FUNDS_LOCKED"}
    ])

    cursor.execute("DELETE FROM escrow_transactions WHERE device_id = ?", (device_id,))
    cursor.execute("""
    INSERT INTO escrow_transactions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        escrow_id, device_id, buyer_name, dev['seller_name'],
        amount, verification_fee, shipping_fee, total,
        "FUNDS_LOCKED", tracking, expires, now_str, audit_log
    ))

    cursor.execute("UPDATE devices SET status = 'IN_ESCROW' WHERE id = ?", (device_id,))
    conn.commit()
    conn.close()
    return get_device_by_id(device_id)

def transition_escrow(escrow_id, new_status, comment=""):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM escrow_transactions WHERE id = ?", (escrow_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None

    log = json.loads(row['audit_log'])
    now_str = datetime.now().isoformat()
    log.append({
        "timestamp": now_str,
        "event": f"Status updated to {new_status}. {comment}".strip(),
        "status": new_status
    })

    cursor.execute("""
    UPDATE escrow_transactions SET status = ?, audit_log = ? WHERE id = ?
    """, (new_status, json.dumps(log), escrow_id))

    # If escrow completed, mark device SOLD. If refunded, return to VERIFIED_ACTIVE.
    if new_status == 'COMPLETED_RELEASED':
        cursor.execute("UPDATE devices SET status = 'SOLD' WHERE id = ?", (row['device_id'],))
    elif new_status == 'REFUNDED':
        cursor.execute("UPDATE devices SET status = 'VERIFIED_ACTIVE' WHERE id = ?", (row['device_id'],))

    conn.commit()
    conn.close()
    return get_device_by_id(row['device_id'])

def get_platform_metrics():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM devices")
    total_devices = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM devices WHERE status = 'VERIFIED_ACTIVE'")
    verified_devices = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM escrow_transactions")
    total_escrows = cursor.fetchone()[0]

    cursor.execute("SELECT SUM(total_escrow_amount) FROM escrow_transactions WHERE status != 'REFUNDED'")
    total_escrow_val = cursor.fetchone()[0] or 0.0

    conn.close()
    return {
        "total_devices": total_devices,
        "verified_active": verified_devices,
        "total_escrows": total_escrows,
        "escrow_volume_usd": round(total_escrow_val, 2),
        "fraud_prevention_rate": "99.8%",
        "avg_hub_inspection_hours": "3.4h"
    }

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")
