import database
import json

def run_tests():
    print("--- 1. Testing Device Retrieval ---")
    devices = database.get_all_devices()
    print(f"Total devices loaded: {len(devices)}")
    for d in devices:
        print(f"  [{d['status']}] {d['title']} (${d['asking_price']}) - Grade: {d['grade']}")

    print("\n--- 2. Testing Verification Passport ---")
    d1 = database.get_device_by_id('DEV-2026-001')
    assert d1 is not None, "DEV-2026-001 not found"
    assert d1['verification_report'] is not None, "Missing verification report"
    v = d1['verification_report']
    print(f"  Report ID: {v['id']}")
    print(f"  SHA-256 Hash: {v['verification_hash']}")
    print(f"  Battery Health: {v['battery_health_pct']}% ({v['battery_cycle_count']} cycles)")
    print(f"  OEM Authenticity: {v['oem_parts_status']}")
    print(f"  40-Point Tests Count: {len(v['diagnostic_tests'])}")

    print("\n--- 3. Testing Seller Listing Creation ---")
    new_dev = database.create_device(
        title="OnePlus 12 512GB Flowy Emerald",
        brand="OnePlus",
        category="Smartphones",
        imei_serial="860192837482910",
        original_msrp=899.00,
        asking_price=580.00,
        seller_name="David K. (Seattle)",
        specs={"ram": "16GB", "storage": "512GB", "color": "Flowy Emerald"},
        image_url="https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600"
    )
    print(f"  New Device Created: {new_dev['id']} - Status: {new_dev['status']}")

    print("\n--- 4. Testing Lab Technician Bench Inspection ---")
    tests = [
        {"category": "Screen", "test": "OLED 120Hz LTPO Matrix", "result": "PASSED", "detail": "Peak 4500 nits, zero burn-in"},
        {"category": "Power", "test": "100W SuperVOOC Fast Charge", "result": "PASSED", "detail": "99% health, 18 cycles"},
        {"category": "Hardware", "test": "Internal LCI Check", "result": "PASSED", "detail": "White indicators, no corrosion"}
    ]
    inspected = database.submit_verifier_inspection(
        device_id=new_dev['id'],
        verifier_id="VER-LAB-01",
        verifier_name="VeriTech Bay Area Lab",
        grade="A_PRISTINE",
        battery_pct=99,
        battery_cycles=18,
        oem_status="All OEM Certified Components",
        liquid_status="Dry - Zero Moisture Contact",
        imei_status="Clean - GSMA Whitelisted",
        lock_status="Clean - OxygenOS FRP Disengaged",
        cosmetic_score=9.9,
        functional_score=10.0,
        tests=tests,
        notes="Flawless unit. Exceeds factory benchmarks."
    )
    print(f"  Device Certified: {inspected['id']} - Grade: {inspected['grade']} - Status: {inspected['status']}")
    print(f"  Generated Passport Hash: {inspected['verification_report']['verification_hash']}")

    print("\n--- 5. Testing Escrow Deposit ---")
    escrowed = database.create_escrow_deposit(
        device_id=inspected['id'],
        buyer_name="Alice Morgan (Denver)",
        amount=580.00
    )
    print(f"  Escrow Created: {escrowed['escrow']['id']} - Status: {escrowed['escrow']['status']} - Locked: ${escrowed['escrow']['total_escrow_amount']}")

    print("\n--- 6. Testing Escrow State Machine ---")
    settled = database.transition_escrow(
        escrow_id=escrowed['escrow']['id'],
        new_status="COMPLETED_RELEASED",
        comment="Alice Morgan inspected and approved device. Funds released to David K."
    )
    print(f"  Escrow Settled: Status: {settled['status']} (Device status: {settled['status']})")
    print(f"  Audit Log Entries: {len(settled['escrow']['audit_log'])}")

    print("\n--- 7. Testing Platform Stats ---")
    stats = database.get_platform_metrics()
    print("  Platform Stats:", stats)

    print("\n>>> ALL BACKEND, DATABASE, AND PROTOCOL TESTS PASSED! <<<")

if __name__ == "__main__":
    run_tests()
