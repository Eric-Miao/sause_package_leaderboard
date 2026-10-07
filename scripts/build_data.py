import json
import html
import re
import sys
import zipfile
from datetime import datetime, timedelta
from pathlib import Path
from xml.etree import ElementTree as ET


MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PACKAGE_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
NS = {"m": MAIN_NS, "r": REL_NS}
FIELDS = {
    "日期": "date",
    "期数": "episode",
    "品牌": "brand",
    "料包": "name",
    "色香味": "flavor",
    "还原度": "fidelity",
    "易用性": "ease",
    "料力评分": "score",
    "评语": "comment",
    "视频链接": "video_url",
}


def _cell_value(cell: ET.Element, shared_strings: list[str]) -> str:
    cell_type = cell.get("t")
    if cell_type == "inlineStr":
        return "".join(node.text or "" for node in cell.findall(".//m:t", NS))
    value = cell.find("m:v", NS)
    if value is None or value.text is None:
        return ""
    if cell_type == "s":
        return shared_strings[int(value.text)]
    return value.text


def _episode_number(value: str) -> int:
    match = re.search(r"\d+", value)
    return int(match.group()) if match else sys.maxsize


def _excel_date(value: str) -> str:
    return (datetime(1899, 12, 30) + timedelta(days=float(value))).date().isoformat()


def _first_url(value: str) -> str:
    match = re.search(r"https?://\S+", value or "")
    return match.group(0).rstrip("，。；;）)") if match else ""


def extract_records(path: Path) -> list[dict]:
    with zipfile.ZipFile(path) as archive:
        names = set(archive.namelist())
        shared_strings: list[str] = []
        if "xl/sharedStrings.xml" in names:
            root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            shared_strings = [
                "".join(node.text or "" for node in item.findall(".//m:t", NS))
                for item in root.findall("m:si", NS)
            ]

        workbook = ET.fromstring(archive.read("xl/workbook.xml"))
        relationships = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        targets = {
            item.get("Id"): item.get("Target")
            for item in relationships.findall(f"{{{PACKAGE_REL_NS}}}Relationship")
        }
        sheets = workbook.findall("m:sheets/m:sheet", NS)
        sheet_root = None
        for sheet in sheets:
            target = targets[sheet.get(f"{{{REL_NS}}}id")]
            target = target.lstrip("/")
            sheet_path = target if target.startswith("xl/") else f"xl/{target}"
            candidate = ET.fromstring(archive.read(sheet_path))
            if candidate.findall(".//m:sheetData/m:row", NS):
                sheet_root = candidate
                break
        if sheet_root is None:
            return []

        rows = []
        for row in sheet_root.findall(".//m:sheetData/m:row", NS):
            values = {}
            for cell in row.findall("m:c", NS):
                column = re.match(r"[A-Z]+", cell.get("r", ""))
                if column:
                    values[column.group()] = _cell_value(cell, shared_strings)
            rows.append(values)

    if not rows:
        return []
    header_row = next((row for row in rows if "日期" in row.values() and "料力评分" in row.values()), None)
    if header_row is None:
        return []
    columns = {column: FIELDS[value] for column, value in header_row.items() if value in FIELDS}
    header_index = rows.index(header_row)
    records = []
    for row in rows[header_index + 1 :]:
        record = {field: row.get(column, "").strip() for column, field in columns.items()}
        required = ("brand", "name", "flavor", "fidelity", "ease", "score")
        if not all(record.get(field) and not record[field].startswith("#") for field in required):
            continue
        try:
            record["date"] = _excel_date(record["date"])
            record["video_url"] = _first_url(record.get("video_url", ""))
            for field in ("flavor", "fidelity", "ease", "score"):
                record[field] = float(record[field])
        except (TypeError, ValueError):
            continue
        records.append(record)

    return sorted(records, key=lambda item: (-item["score"], _episode_number(item["episode"])))


def write_data(records: list[dict], output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(records, ensure_ascii=False, separators=(",", ":"))
    output.write_text(f"globalThis.LIAOLI_DATA = {payload};\n", encoding="utf-8")


def write_fallback(records: list[dict], index_path: Path) -> None:
    source = index_path.read_text(encoding="utf-8")
    start = "<!-- NOSCRIPT_START -->"
    end = "<!-- NOSCRIPT_END -->"
    if start not in source or end not in source:
        raise ValueError("noscript markers missing from index.html")
    items = "".join(
        "<li>"
        f"<strong>{rank}. {html.escape(record['brand'])} · {html.escape(record['name'])}</strong>"
        f"<span>{record['score']:.1f} 分</span>"
        f"<p>{html.escape(record.get('comment', ''))}</p>"
        "</li>"
        for rank, record in enumerate(records, start=1)
    )
    fallback = (
        f"{start}<noscript><section class=\"noscript-board\">"
        "<h2>完整料力榜</h2><p>当前浏览器未启用 JavaScript，以下为按总分排列的基础榜单。</p>"
        f"<ol>{items}</ol></section></noscript>{end}"
    )
    before, remainder = source.split(start, 1)
    _, after = remainder.split(end, 1)
    index_path.write_text(before + fallback + after, encoding="utf-8")


if __name__ == "__main__":
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("料力榜.xlsx")
    destination = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("dist/data.js")
    records = extract_records(source)
    write_data(records, destination)
    index_path = destination.with_name("index.html")
    if index_path.exists():
        write_fallback(records, index_path)
