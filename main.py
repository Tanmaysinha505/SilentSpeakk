"""
AirOS — Gesture-Controlled Computer Interface
Main Entry Point Launcher
"""
import os
import sys
import time
import socket
import logging
import threading
import webbrowser
import uvicorn

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("AirOS.Main")


def is_port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0


def find_free_port(start_port: int = 8000, max_attempts: int = 20) -> int:
    for p in range(start_port, start_port + max_attempts):
        if not is_port_in_use(p):
            return p
    return start_port


def open_browser_delayed(url: str, delay_sec: float = 1.2):
    time.sleep(delay_sec)
    logger.info("Opening AirOS Dashboard in browser: %s", url)
    webbrowser.open(url)


def main():
    try:
        if hasattr(sys.stdout, 'reconfigure'):
            sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        if hasattr(sys.stderr, 'reconfigure'):
            sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

    print("=" * 60)
    print("           [AirOS] Gesture-Controlled Computer Interface")
    print("           Touchless Computer Control Powered by Computer Vision")
    print("=" * 60)

    port = find_free_port(8000)
    url = f"http://127.0.0.1:{port}"

    # Spawn delayed browser opener
    threading.Thread(target=open_browser_delayed, args=(url,), daemon=True).start()

    logger.info("Starting AirOS Web Server on %s...", url)
    try:
        from ui.server import app
        uvicorn.run(app, host="127.0.0.1", port=port, log_level="warning", ws_ping_interval=None, ws_ping_timeout=None)
    except KeyboardInterrupt:
        logger.info("Shutting down AirOS...")
    except Exception as e:
        logger.error("AirOS Server encountered an error: %s", e)
        sys.exit(1)


if __name__ == "__main__":
    main()
