import logging
import json
import os
from datetime import datetime, timezone
from logging.handlers import RotatingFileHandler

class AuditLogger:
    def __init__(self):
        self.logger = logging.getLogger("audit")
        self.logger.setLevel(logging.INFO)

        log_dir = os.path.join(os.path.dirname(__file__), "../../../logs")
        os.makedirs(log_dir, exist_ok=True)
        log_file = os.path.join(log_dir, "audit.log")

        handler = RotatingFileHandler(
            log_file,
            maxBytes=10485760,  # 10MB
            backupCount=30,
            encoding="utf-8"
        )
        handler.setFormatter(logging.Formatter("%(asctime)s - %(message)s"))
        if not self.logger.handlers:
            self.logger.addHandler(handler)

    def log_action(self, user_id: int, action: str, details: dict, ip: str = "127.0.0.1"):
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "user_id": user_id,
            "action": action,
            "details": details,
            "ip": ip
        }
        self.logger.info(json.dumps(log_entry, ensure_ascii=False))

audit_logger = AuditLogger()
