"""
Full-stack REST API and Web Server for Second-Hand Electronics Verification Marketplace
Zero external dependencies - powered by Python standard library (http.server, sqlite3, json).
"""

import http.server
import json
import os
import sys
import socket
import urllib.parse
from http import HTTPStatus
import database

STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")

class MarketplaceHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    def _send_json(self, data, status=HTTPStatus.OK):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(body)

    def _read_json_body(self):
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length == 0:
            return {}
        raw_body = self.rfile.read(content_length).decode("utf-8")
        return json.loads(raw_body)

    def do_OPTIONS(self):
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # API Routes
        if path == "/api/stats":
            metrics = database.get_platform_metrics()
            return self._send_json(metrics)

        elif path == "/api/devices":
            status_filter = query.get("status", [None])[0]
            cat_filter = query.get("category", [None])[0]
            devices = database.get_all_devices(status_filter, cat_filter)
            return self._send_json(devices)

        elif path.startswith("/api/devices/"):
            device_id = path.split("/api/devices/")[1]
            device = database.get_device_by_id(device_id)
            if not device:
                return self._send_json({"error": "Device not found"}, HTTPStatus.NOT_FOUND)
            return self._send_json(device)

        # Fallback to serving static SPA
        if not path.startswith("/api"):
            clean_path = path.lstrip("/")
            file_path = os.path.join(STATIC_DIR, clean_path)
            if not os.path.exists(file_path) or os.path.isdir(file_path):
                self.path = "/index.html"

        return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        try:
            body = self._read_json_body()

            # 1. Create New Listing (Seller)
            if path == "/api/devices":
                title = body.get("title")
                brand = body.get("brand")
                category = body.get("category", "Smartphones")
                imei_serial = body.get("imei_serial")
                original_msrp = float(body.get("original_msrp", 999.0))
                asking_price = float(body.get("asking_price", 499.0))
                seller_name = body.get("seller_name", "Anonymous Seller")
                specs = body.get("specs", {})
                image_url = body.get("image_url", "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80")

                new_device = database.create_device(
                    title, brand, category, imei_serial, original_msrp,
                    asking_price, seller_name, specs, image_url
                )
                return self._send_json(new_device, HTTPStatus.CREATED)

            # 2. Verifier Hub: Submit Rigorous 40-Point Inspection
            elif path.startswith("/api/verifications/"):
                device_id = path.split("/api/verifications/")[1]
                verifier_id = body.get("verifier_id", "HUB-TECH-01")
                verifier_name = body.get("verifier_name", "Certified Precision Lab")
                grade = body.get("grade", "A_PRISTINE")
                battery_pct = int(body.get("battery_pct", 95))
                battery_cycles = int(body.get("battery_cycles", 110))
                oem_status = body.get("oem_status", "Original OEM Certified")
                liquid_status = body.get("liquid_status", "Dry - Zero Moisture Contact")
                imei_status = body.get("imei_status", "Clean - GSMA & Carrier Whitelisted")
                lock_status = body.get("lock_status", "Clean - FRP / iCloud Disengaged")
                cosmetic_score = float(body.get("cosmetic_score", 9.5))
                functional_score = float(body.get("functional_score", 10.0))
                tests = body.get("tests", [])
                notes = body.get("notes", "Full bench inspection completed with zero critical defects.")

                result = database.submit_verifier_inspection(
                    device_id, verifier_id, verifier_name, grade, battery_pct,
                    battery_cycles, oem_status, liquid_status, imei_status,
                    lock_status, cosmetic_score, functional_score, tests, notes
                )
                if not result:
                    return self._send_json({"error": "Device not found"}, HTTPStatus.NOT_FOUND)
                return self._send_json(result)

            # 3. Create Escrow Lock (Buyer deposits payment into trust)
            elif path == "/api/escrow/create":
                device_id = body.get("device_id")
                buyer_name = body.get("buyer_name", "Verified Buyer")
                amount = float(body.get("amount", 0.0))
                verif_fee = float(body.get("verification_fee", 25.0))
                ship_fee = float(body.get("shipping_fee", 15.0))

                updated = database.create_escrow_deposit(device_id, buyer_name, amount, verif_fee, ship_fee)
                if not updated:
                    return self._send_json({"error": "Failed to create escrow deposit"}, HTTPStatus.BAD_REQUEST)
                return self._send_json(updated)

            # 4. Escrow State Transitions
            elif path == "/api/escrow/transition":
                escrow_id = body.get("escrow_id")
                new_status = body.get("status")
                comment = body.get("comment", "")

                updated = database.transition_escrow(escrow_id, new_status, comment)
                if not updated:
                    return self._send_json({"error": "Failed to transition escrow"}, HTTPStatus.BAD_REQUEST)
                return self._send_json(updated)

            else:
                return self._send_json({"error": "Endpoint not found"}, HTTPStatus.NOT_FOUND)

        except Exception as e:
            return self._send_json({"error": str(e)}, HTTPStatus.INTERNAL_SERVER_ERROR)

def create_server(host="127.0.0.1", preferred_port=8000):
    """
    Attempts to bind to preferred_port. If Windows WinError 10013 (socket permission denied)
    or Errno 98/10048 (port in use) occurs, automatically tries standard fallback ports.
    """
    candidate_ports = [preferred_port, 8000, 3000, 5000, 8081, 8888, 9000, 5050]
    # Remove duplicates preserving order
    seen = set()
    ports_to_try = []
    for p in candidate_ports:
        if p not in seen:
            seen.add(p)
            ports_to_try.append(p)

    http.server.ThreadingHTTPServer.allow_reuse_address = True

    for p in ports_to_try:
        try:
            httpd = http.server.ThreadingHTTPServer((host, p), MarketplaceHandler)
            return httpd, p
        except (PermissionError, OSError) as err:
            # WinError 10013 or port in use, try next
            continue

    # Fallback to an ephemeral port chosen by the OS
    httpd = http.server.ThreadingHTTPServer((host, 0), MarketplaceHandler)
    assigned_port = httpd.server_address[1]
    return httpd, assigned_port

def run_server():
    database.init_db()

    # Determine requested port from command line or environment variable, defaulting to 8000
    requested_port = 8000
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        requested_port = int(sys.argv[1])
    elif "PORT" in os.environ and os.environ["PORT"].isdigit():
        requested_port = int(os.environ["PORT"])

    host = "0.0.0.0"
    httpd, actual_port = create_server(host=host, preferred_port=requested_port)

    print("=" * 66)
    print(f" Verified Pre-Owned Electronics Marketplace")
    print(f" Server URL: http://localhost:{actual_port}")
    print(f" Direct URL: http://127.0.0.1:{actual_port}")
    print("=" * 66)
    print("Press Ctrl+C to stop the server.\n")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server gracefully...")
        httpd.server_close()

if __name__ == "__main__":
    run_server()
