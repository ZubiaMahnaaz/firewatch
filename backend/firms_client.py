import os
import requests
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional
from backend.csv_validator import validate_and_parse_csv

from dotenv import load_dotenv

# Explicit project root and root .env path resolution
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DOTENV_PATH = PROJECT_ROOT / ".env"

def load_firms_env() -> None:
    """Explicitly loads or refreshes environment variables from the root .env file."""
    if DOTENV_PATH.is_file():
        load_dotenv(dotenv_path=DOTENV_PATH, override=True)
    else:
        backend_env = Path(__file__).resolve().parent / ".env"
        if backend_env.is_file():
            load_dotenv(dotenv_path=backend_env, override=True)
        else:
            load_dotenv(override=True)

# Initial load on module import
load_firms_env()

FIRMS_BASE_URL = "https://firms.modaps.eosdis.nasa.gov/api/area/csv"

def get_firms_map_key() -> str:
    """
    Retrieves the configured NASA FIRMS key dynamically from environment.
    Primary expected variable name: FIRMS_MAP_KEY
    Supported alias: NASA_FIRMS_API_KEY
    Reloads dotenv if key is empty to capture runtime additions to .env without restart.
    Never caches, prints, or logs the secret key.
    """
    key = (os.environ.get("FIRMS_MAP_KEY") or os.environ.get("NASA_FIRMS_API_KEY") or "").strip()
    if not key:
        load_firms_env()
        key = (os.environ.get("FIRMS_MAP_KEY") or os.environ.get("NASA_FIRMS_API_KEY") or "").strip()
    return key

def is_firms_configured() -> bool:
    """
    Returns True if a plausible NASA FIRMS MAP_KEY is configured in the environment.
    NASA MAP_KEYs are typically 32-character hexadecimal tokens.
    Excludes dummy placeholder values.
    """
    key = get_firms_map_key()
    if not key or len(key) < 10:
        return False
    placeholders = ["your_", "enter_", "placeholder", "key_here", "xxx"]
    if any(p in key.lower() for p in placeholders):
        return False
    return True

def get_masked_firms_key() -> Optional[str]:
    """
    Returns a masked preview of the key (e.g. '3a1f...9b2c') for safe UI verification.
    Never exposes or logs the full secret key.
    """
    key = get_firms_map_key()
    if not is_firms_configured() or len(key) < 8:
        return None
    return f"{key[:4]}...{key[-4:]}"

def verify_firms_connection() -> Dict[str, Any]:
    """
    Tests live connectivity with the NASA FIRMS API using the configured key.
    Queries a narrow sector for 1 day to verify authorization without consuming excess quota.
    Returns: {"success": bool, "status": str, "message": str, "http_code": Optional[int]}
    """
    if not is_firms_configured():
        return {
            "success": False,
            "status": "unconfigured",
            "message": "FIRMS_MAP_KEY is not configured in local .env or environment variables.",
            "http_code": None
        }

    key = get_firms_map_key()
    test_url = f"{FIRMS_BASE_URL}/{key}/VIIRS_NOAA20_NRT/-121,37,-120,38/1"

    try:
        response = requests.get(test_url, timeout=12)
        body = response.text.strip()

        # Check invalid/pending key responses (NASA returns HTTP 400 or 401 with 'Invalid MAP_KEY.')
        if "invalid map_key" in body.lower() or "invalid map key" in body.lower():
            return {
                "success": False,
                "status": "invalid_key",
                "message": "NASA FIRMS server responded: Invalid MAP_KEY. If you recently requested this key from NASA, note that newly issued keys can take 15-30 minutes to propagate across NASA EOSDIS servers.",
                "http_code": response.status_code
            }

        if response.status_code in (401, 403):
            return {
                "success": False,
                "status": "unauthorized",
                "message": "NASA FIRMS API returned Unauthorized (HTTP 401/403). Your key may be pending activation or expired. Newly issued NASA keys can take 15-30 minutes to propagate.",
                "http_code": response.status_code
            }
        if response.status_code == 429:
            return {
                "success": False,
                "status": "rate_limited",
                "message": "NASA FIRMS API rate limit reached (HTTP 429). NASA limits transactions to 10 queries per 10 minutes per MAP_KEY.",
                "http_code": 429
            }
        if response.status_code != 200:
            return {
                "success": False,
                "status": "http_error",
                "message": f"NASA FIRMS API request failed with HTTP {response.status_code}: {body[:150]}",
                "http_code": response.status_code
            }

        return {
            "success": True,
            "status": "connected",
            "message": "Successfully connected to NASA FIRMS API. Key is authorized and active.",
            "http_code": 200
        }
    except requests.exceptions.Timeout:
        return {
            "success": False,
            "status": "timeout",
            "message": "NASA FIRMS API connection timed out after 12 seconds. Upstream server may be slow or temporarily unreachable.",
            "http_code": None
        }
    except Exception as exc:
        return {
            "success": False,
            "status": "exception",
            "message": f"Network error connecting to NASA FIRMS: {str(exc)}",
            "http_code": None
        }


def fetch_firms_nrt_data(
    source: str = "VIIRS_NOAA20_NRT",
    area_bbox: str = "-125,30,-100,50",
    day_range: int = 1
) -> Tuple[bool, str, List[Dict[str, Any]], Dict[str, Any]]:
    """
    Fetches real active fire detections from the NASA FIRMS Area API.
    Returns: (success: bool, message: str, valid_records: List, summary: Dict)
    """
    if not is_firms_configured():
        return (
            False,
            "NASA FIRMS API key ('FIRMS_MAP_KEY') is not configured in environment variables. Real-time satellite ingestion is dormant. Operating with synthetic demonstration data.",
            [],
            {"status": "unconfigured"}
        )

    map_key = get_firms_map_key()
    url = f"{FIRMS_BASE_URL}/{map_key}/{source}/{area_bbox}/{day_range}"

    try:
        response = requests.get(url, timeout=20)

        if response.status_code in (401, 403):
            return (
                False,
                "NASA FIRMS API returned Unauthorized (401/403). Your FIRMS_MAP_KEY credentials were not accepted. If you just received the key, note that NASA keys can take 15-30 minutes to activate.",
                [],
                {"status": "unauthorized", "http_code": response.status_code}
            )

        if response.status_code == 429:
            return (
                False,
                "NASA FIRMS rate limit exceeded (HTTP 429). NASA limits queries to 10 requests per 10-minute window per MAP_KEY.",
                [],
                {"status": "rate_limited", "http_code": 429}
            )

        if response.status_code != 200:
            content = response.text.strip()
            if "invalid map_key" in content.lower() or "invalid map key" in content.lower():
                return (
                    False,
                    "NASA FIRMS API responded: Invalid MAP_KEY. If this is a newly issued key, please allow 15-30 minutes for NASA EOSDIS propagation.",
                    [],
                    {"status": "invalid_key", "http_code": response.status_code}
                )
            return (
                False,
                f"NASA FIRMS API request failed with status HTTP {response.status_code}: {response.text[:200]}",
                [],
                {"status": "error", "http_code": response.status_code}
            )


        content = response.text.strip()
        if not content or "latitude" not in content.lower():
            if "invalid" in content.lower() or "transaction" in content.lower():
                return (
                    False,
                    f"NASA FIRMS response rejected: {content[:200]}",
                    [],
                    {"status": "error", "response": content[:200]}
                )
            return (
                True,
                f"NASA FIRMS API query succeeded, but 0 thermal anomalies were detected in the queried sector ({area_bbox}) over the past {day_range} day(s).",
                [],
                {"status": "empty", "total_rows": 0}
            )

        # Validate and parse CSV with LIVE_FIRMS provenance tag
        valid_records, invalid_rows, summary = validate_and_parse_csv(
            file_content=content,
            filename=f"firms_{source}_{day_range}d.csv",
            source_type="LIVE_FIRMS"
        )

        return (
            True,
            f"Successfully retrieved and validated {len(valid_records)} live active fire observations from NASA FIRMS.",
            valid_records,
            summary
        )

    except requests.exceptions.Timeout:
        return (
            False,
            "NASA FIRMS API request timed out after 20 seconds. NASA EOSDIS servers may be temporarily degraded.",
            [],
            {"status": "timeout"}
        )
    except Exception as exc:
        return (
            False,
            f"Error communicating with NASA FIRMS API: {str(exc)}",
            [],
            {"status": "exception", "error": str(exc)}
        )

