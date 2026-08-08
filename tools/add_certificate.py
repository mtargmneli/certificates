#!/usr/bin/env python3
"""
TS Certificate record generator.

Usage:
  python tools/add_certificate.py
or:
  python tools/add_certificate.py --id TS-2026-0001 --name-ka "სახელი გვარი" --name-en "Name Surname" --date 2026-08-08
"""
from pathlib import Path
import argparse, hashlib, json

ROOT = Path(__file__).resolve().parents[1]
RECORDS = ROOT / "records"

def normalize(value: str) -> str:
    return value.strip().upper().replace("–","-").replace("—","-").replace("−","-").replace(" ","")

def make_record(cert_id, name_ka, name_en, issue_date, course, issued_by, status, note):
    cert_id = normalize(cert_id)
    data = {
        "id": cert_id,
        "nameKa": name_ka.strip(),
        "nameEn": name_en.strip(),
        "course": course.strip(),
        "issueDate": issue_date.strip(),
        "issuedBy": issued_by.strip(),
        "status": status.strip().lower(),
    }
    if note.strip():
        data["note"] = note.strip()

    digest = hashlib.sha256(cert_id.encode("utf-8")).hexdigest()
    RECORDS.mkdir(exist_ok=True)
    out = RECORDS / f"{digest}.json"
    out.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return out, digest

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--id")
    p.add_argument("--name-ka")
    p.add_argument("--name-en", default="")
    p.add_argument("--date")
    p.add_argument("--course", default="პრაქტიკული კურსი მთარგმნელებისთვის: მთარგმნელის პროფესიული სტარტი")
    p.add_argument("--issued-by", default="თარჯიმნის პროფესიული სტარტი")
    p.add_argument("--status", default="valid", choices=["valid","revoked","expired"])
    p.add_argument("--note", default="")
    a = p.parse_args()

    cert_id = a.id or input("სერთიფიკატის ნომერი: ")
    name_ka = a.name_ka or input("სახელი და გვარი ქართულად: ")
    name_en = a.name_en if a.name_en else input("სახელი და გვარი ინგლისურად (შეიძლება ცარიელი): ")
    issue_date = a.date or input("გაცემის თარიღი (YYYY-MM-DD): ")

    out, digest = make_record(cert_id, name_ka, name_en, issue_date, a.course, a.issued_by, a.status, a.note)
    normalized = normalize(cert_id)
    print(f"შეიქმნა: {out}")
    print(f"QR ბმულის დასასრული: ?id={normalized}")
    print(f"SHA-256: {digest}")

if __name__ == "__main__":
    main()
