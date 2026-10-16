import pytest
from backend.csv_validator import validate_and_parse_csv

def test_valid_csv_parsing():
    content = """latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_t31,frp,daynight
39.8241,-121.4429,384.2,0.38,0.36,2026-05-18,1427,Suomi-NPP,VIIRS,high,2.0NRT,312.4,142.6,D
44.1523,-122.1892,328.1,0.39,0.37,2026-05-18,1332,Suomi-NPP,VIIRS,nominal,2.0NRT,294.1,38.4,D
"""
    valid_recs, errors, summary = validate_and_parse_csv(content, filename="test.csv")
    assert len(valid_recs) == 2
    assert len(errors) == 0
    assert summary["valid_rows"] == 2
    assert summary["invalid_rows"] == 0
    assert valid_recs[0]["latitude"] == 39.8241
    assert valid_recs[0]["confidence_score"] > 0.8

def test_invalid_coordinates():
    content = """latitude,longitude,acq_date,acq_time,frp
195.0,-121.4429,2026-05-18,1427,10.0
-39.8241,250.0,2026-05-18,1427,10.0
"""
    valid_recs, errors, summary = validate_and_parse_csv(content, filename="test_coords.csv")
    assert len(valid_recs) == 0
    assert len(errors) == 2
    assert any("out of range" in e["error"] for e in errors)

def test_missing_required_headers():
    content = """latitude,brightness,frp
39.8241,384.2,142.6
"""
    valid_recs, errors, summary = validate_and_parse_csv(content, filename="test_headers.csv")
    assert len(valid_recs) == 0
    assert summary["status"] == "failed"
    assert "Missing mandatory columns" in errors[0]["error"]

def test_duplicate_row_detection():
    content = """latitude,longitude,acq_date,acq_time,satellite,frp
39.8241,-121.4429,2026-05-18,1427,VIIRS,142.6
39.8241,-121.4429,2026-05-18,1427,VIIRS,142.6
"""
    valid_recs, errors, summary = validate_and_parse_csv(content, filename="test_dups.csv")
    assert len(valid_recs) == 1
    assert summary["duplicate_rows"] == 1
    assert any("Duplicate" in e["error"] for e in errors)
