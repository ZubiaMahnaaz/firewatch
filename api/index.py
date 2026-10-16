import os
import sys
from pathlib import Path

# On Vercel serverless, ensure writable database directory in /tmp
os.environ["FIREWATCH_DB_PATH"] = "/tmp/firewatch.db"
os.environ["VERCEL"] = "1"

# Ensure project root is in sys.path
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from backend.main import app
