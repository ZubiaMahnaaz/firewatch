import io
import csv
import re
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Tuple, Optional
from backend.scoring import normalize_confidence

EXPECTED_COLUMNS = [
    "latitude", "longitude", "brightness", "scan", "track",
    "acq_date", "acq_time", "satellite", "instrument",
    "confidence", "version", "bright_t31", "frp", "daynight"
]

def validate_and_parse_csv(
    file_content: str,
    filename: str = "upload.csv",
    source_type: str = "csv_upload"
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], Dict[str, Any]]:
    """
    Parses and validates CSV text content.
    Returns:
      valid_records: List of sanitized dicts ready for insertion
      invalid_rows: List of dicts describing each error with row number
      summary: Metadata summary including counts and duplicate info
    """
    batch_id = f"batch-{uuid.uuid4().hex[:8]}"
    reader = csv.DictReader(io.StringIO(file_content))
    
    if not reader.fieldnames:
        return [], [{"row_number": 0, "field": "header", "error": "CSV file is empty or missing header", "value": ""}], {
            "batch_id": batch_id,
            "filename": filename,
            "total_rows": 0,
            "valid_rows": 0,
            "invalid_rows": 1,
            "duplicate_rows": 0,
            "status": "failed"
        }

    # Normalize header names (lowercase, stripped)
    normalized_headers = {col: col.strip().lower() for col in reader.fieldnames if col}
    
    # Check for required columns
    required_cols = ["latitude", "longitude", "acq_date", "acq_time"]
    found_cols = [c.lower() for c in normalized_headers.values()]
    missing_required = [rc for rc in required_cols if rc not in found_cols]
    
    if missing_required:
        return [], [{
            "row_number": 0,
            "field": "headers",
            "error": f"Missing mandatory columns: {', '.join(missing_required)}. Found: {', '.join(found_cols)}",
            "value": list(normalized_headers.keys())
        }], {
            "batch_id": batch_id,
            "filename": filename,
            "total_rows": 0,
            "valid_rows": 0,
            "invalid_rows": 1,
            "duplicate_rows": 0,
            "status": "failed"
        }

    valid_records: List[Dict[str, Any]] = []
    invalid_rows: List[Dict[str, Any]] = []
    seen_fingerprints = set()
    duplicate_count = 0
    total_rows = 0

    # Remap row keys
    for row_idx, raw_row in enumerate(reader, start=2): # 1 is header
        total_rows += 1
        row = {normalized_headers.get(k, k).lower(): (v.strip() if v else "") for k, v in raw_row.items() if k}
        
        row_errors = []

        # 1. Latitude validation
        lat_raw = row.get("latitude", "")
        lat_val = None
        try:
            lat_val = float(lat_raw)
            if not (-90.0 <= lat_val <= 90.0):
                row_errors.append({"field": "latitude", "error": f"Latitude {lat_val} out of range [-90, 90]", "value": lat_raw})
        except (ValueError, TypeError):
            row_errors.append({"field": "latitude", "error": "Invalid or missing numeric latitude", "value": lat_raw})

        # 2. Longitude validation
        lon_raw = row.get("longitude", "")
        lon_val = None
        try:
            lon_val = float(lon_raw)
            if not (-180.0 <= lon_val <= 180.0):
                row_errors.append({"field": "longitude", "error": f"Longitude {lon_val} out of range [-180, 180]", "value": lon_raw})
        except (ValueError, TypeError):
            row_errors.append({"field": "longitude", "error": "Invalid or missing numeric longitude", "value": lon_raw})

        # 3. Acquisition Date validation (YYYY-MM-DD)
        date_raw = row.get("acq_date", "")
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", date_raw):
            row_errors.append({"field": "acq_date", "error": "acq_date must be formatted as YYYY-MM-DD", "value": date_raw})

        # 4. Acquisition Time validation (HHMM or HH:MM)
        time_raw = row.get("acq_time", "")
        clean_time = time_raw.replace(":", "").zfill(4)
        if not (len(clean_time) == 4 and clean_time.isdigit() and 0 <= int(clean_time[:2]) <= 23 and 0 <= int(clean_time[2:]) <= 59):
            row_errors.append({"field": "acq_time", "error": "acq_time must be HHMM (0000-2359)", "value": time_raw})

        # 5. FRP validation (if present, must be non-negative)
        frp_raw = row.get("frp", "0")
        frp_val = 0.0
        if frp_raw:
            try:
                frp_val = float(frp_raw)
                if frp_val < 0:
                    row_errors.append({"field": "frp", "error": f"FRP {frp_val} cannot be negative", "value": frp_raw})
            except ValueError:
                row_errors.append({"field": "frp", "error": "FRP must be a valid number", "value": frp_raw})

        # 6. Brightness validation (if present, must be positive)
        bright_raw = row.get("brightness") or row.get("bright_ti4") or row.get("bright_ti5") or ""
        bright_val = None
        if bright_raw:
            try:
                bright_val = float(bright_raw)
                if bright_val <= 0:
                    row_errors.append({"field": "brightness", "error": "Brightness must be greater than zero", "value": bright_raw})
            except ValueError:
                row_errors.append({"field": "brightness", "error": "Brightness must be a valid number", "value": bright_raw})

        # If any errors, record and skip insertion
        if row_errors:
            for err in row_errors:
                invalid_rows.append({
                    "row_number": row_idx,
                    "field": err["field"],
                    "error": err["error"],
                    "value": err["value"]
                })
            continue

        # Check duplicate fingerprint: (round(lat, 4), round(lon, 4), acq_date, clean_time, satellite)
        sat = row.get("satellite", "VIIRS").upper()
        fingerprint = (round(lat_val, 4), round(lon_val, 4), date_raw, clean_time, sat)
        if fingerprint in seen_fingerprints:
            duplicate_count += 1
            invalid_rows.append({
                "row_number": row_idx,
                "field": "record",
                "error": "Duplicate observation in this batch (identical spatio-temporal stamp and sensor)",
                "value": f"{lat_val}, {lon_val} @ {date_raw} {clean_time}"
            })
            continue
        seen_fingerprints.add(fingerprint)

        # Generate a distinct observation ID if none exists
        existing_id = row.get("obs_id") or row.get("id")
        obs_id = existing_id if existing_id else f"FW-{uuid.uuid4().hex[:6].upper()}-{sat}"

        # Determine region heuristically if not provided
        region = row.get("region")
        if not region:
            if 36.0 <= lat_val <= 42.0 and -124.0 <= lon_val <= -119.0:
                region = "Northern California / Sierra"
            elif 42.0 < lat_val <= 46.5 and -124.5 <= lon_val <= -116.0:
                region = "Oregon / Cascades"
            elif 46.5 < lat_val <= 49.0 and -125.0 <= lon_val <= -117.0:
                region = "Washington / Olympic"
            elif 31.0 <= lat_val < 37.0 and -114.5 <= lon_val <= -103.0:
                region = "Southwest / Gila"
            else:
                region = "Western US Corridor"

        conf_raw = row.get("confidence", "nominal")
        conf_score = normalize_confidence(conf_raw)

        # Build clean record
        rec = {
            "obs_id": obs_id,
            "latitude": lat_val,
            "longitude": lon_val,
            "brightness": bright_val,
            "scan": float(row.get("scan", 1.0)) if row.get("scan") else 1.0,
            "track": float(row.get("track", 1.0)) if row.get("track") else 1.0,
            "acq_date": date_raw,
            "acq_time": clean_time,
            "acq_datetime": f"{date_raw}T{clean_time[:2]}:{clean_time[2:4]}:00Z",
            "satellite": sat,
            "instrument": row.get("instrument", "VIIRS").upper(),
            "confidence": conf_raw,
            "confidence_score": conf_score,
            "version": row.get("version", "2.0NRT"),
            "bright_t31": float(row.get("bright_t31", 295.0)) if row.get("bright_t31") else None,
            "frp": frp_val,
            "daynight": row.get("daynight", "D").upper()[:1] or "D",
            "region": region,
            "source_type": source_type,
            "validation_status": "valid",
            "review_status": "unreviewed",
            "review_notes": "",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        valid_records.append(rec)

    summary = {
        "batch_id": batch_id,
        "filename": filename,
        "total_rows": total_rows,
        "valid_rows": len(valid_records),
        "invalid_rows": len(invalid_rows),
        "duplicate_rows": duplicate_count,
        "status": "completed" if len(valid_records) > 0 else "rejected"
    }

    return valid_records, invalid_rows, summary

def preview_csv_content(
    file_content: str,
    filename: str = "upload.csv",
    max_preview_rows: int = 5
) -> Dict[str, Any]:
    """
    Parses and checks the header and top rows of a CSV file for pre-import analyst inspection.
    """
    lines = file_content.strip().splitlines()
    total_data_lines = max(0, len(lines) - 1)

    reader = csv.DictReader(io.StringIO(file_content))
    if not reader.fieldnames:
        return {
            "filename": filename,
            "total_rows_estimate": 0,
            "headers": [],
            "required_columns_found": [],
            "missing_required_columns": ["latitude", "longitude", "acq_date", "acq_time"],
            "optional_columns_found": [],
            "is_valid_header": False,
            "preview_rows": [],
            "preview_errors": [{"row_number": 0, "field": "header", "error": "CSV file is empty or missing headers"}]
        }

    normalized_headers = {col: col.strip().lower() for col in reader.fieldnames if col}
    found_cols = [c.lower() for c in normalized_headers.values()]
    required_cols = ["latitude", "longitude", "acq_date", "acq_time"]
    missing_required = [rc for rc in required_cols if rc not in found_cols]
    required_found = [rc for rc in required_cols if rc in found_cols]
    optional_cols = ["frp", "confidence", "satellite", "instrument", "brightness", "scan", "track", "daynight", "bright_t31", "version"]
    optional_found = [oc for oc in optional_cols if oc in found_cols]

    preview_rows = []
    preview_errors = []

    for idx, raw_row in enumerate(reader, start=2):
        if len(preview_rows) >= max_preview_rows:
            break
        row_dict = {k: v for k, v in raw_row.items() if k}
        preview_rows.append(row_dict)

        # Quick validation of preview row
        row_clean = {normalized_headers.get(k, k).lower(): (v.strip() if v else "") for k, v in raw_row.items() if k}
        try:
            lat = float(row_clean.get("latitude", 0))
            if not (-90.0 <= lat <= 90.0):
                preview_errors.append({"row_number": idx, "field": "latitude", "error": f"Latitude {lat} out of range [-90, 90]"})
        except ValueError:
            preview_errors.append({"row_number": idx, "field": "latitude", "error": "Invalid numeric latitude"})

        try:
            lon = float(row_clean.get("longitude", 0))
            if not (-180.0 <= lon <= 180.0):
                preview_errors.append({"row_number": idx, "field": "longitude", "error": f"Longitude {lon} out of range [-180, 180]"})
        except ValueError:
            preview_errors.append({"row_number": idx, "field": "longitude", "error": "Invalid numeric longitude"})

    return {
        "filename": filename,
        "total_rows_estimate": total_data_lines,
        "headers": reader.fieldnames or [],
        "required_columns_found": required_found,
        "missing_required_columns": missing_required,
        "optional_columns_found": optional_found,
        "is_valid_header": len(missing_required) == 0,
        "preview_rows": preview_rows,
        "preview_errors": preview_errors
    }

