import tempfile
import unittest
import zipfile
from pathlib import Path


def make_workbook(path: Path) -> None:
    workbook = """<?xml version="1.0" encoding="UTF-8"?>
    <workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
      xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
      <sheets><sheet name="榜单" sheetId="1" r:id="rId1"/></sheets>
    </workbook>"""
    relationships = """<?xml version="1.0" encoding="UTF-8"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Target="worksheets/sheet1.xml"
        Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"/>
    </Relationships>"""
    rows = [
        ["日期", "期数", "品牌", "料包", "色香味", "还原度", "易用性", "料力评分", "评语"],
        [46274, "EP2", "甲牌", "好味汁", 4.2, 4.1, 4.0, 4.1, "鲜香"],
        [46275, "EP1", "乙牌", "暖汤底", 4.0, 4.2, 4.1, 4.1, "温和"],
        [46276, "EP3", "", "", "", "", "", "#DIV/0!", ""],
    ]

    def cell(ref: str, value: object) -> str:
        if isinstance(value, str):
            if value.startswith("#"):
                return f'<c r="{ref}" t="e"><v>{value}</v></c>'
            return f'<c r="{ref}" t="inlineStr"><is><t>{value}</t></is></c>'
        return f'<c r="{ref}"><v>{value}</v></c>'

    xml_rows = []
    for row_index, values in enumerate(rows, start=2):
        cells = "".join(cell(f"{chr(66 + col)}{row_index}", value) for col, value in enumerate(values))
        xml_rows.append(f'<row r="{row_index}">{cells}</row>')
    worksheet = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        f'<sheetData>{"".join(xml_rows)}</sheetData></worksheet>'
    )
    with zipfile.ZipFile(path, "w") as archive:
        archive.writestr("xl/workbook.xml", workbook)
        archive.writestr("xl/_rels/workbook.xml.rels", relationships)
        archive.writestr("xl/worksheets/sheet1.xml", worksheet)


class BuildDataTests(unittest.TestCase):
    def test_extracts_complete_records_and_filters_error_rows(self):
        from scripts.build_data import extract_records

        with tempfile.TemporaryDirectory() as directory:
            workbook = Path(directory) / "board.xlsx"
            make_workbook(workbook)
            records = extract_records(workbook)

        self.assertEqual([record["episode"] for record in records], ["EP1", "EP2"])
        self.assertEqual(records[0]["date"], "2026-09-10")
        self.assertEqual(records[0]["brand"], "乙牌")
        self.assertEqual(records[0]["score"], 4.1)
        self.assertNotIn("#DIV/0!", repr(records))

    def test_writes_browser_global(self):
        from scripts.build_data import write_data

        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "data.js"
            write_data([{"brand": "甲牌"}], output)
            text = output.read_text(encoding="utf-8")

        self.assertTrue(text.startswith("globalThis.LIAOLI_DATA = ["))
        self.assertIn("甲牌", text)

    def test_writes_escaped_noscript_fallback(self):
        from scripts.build_data import write_fallback

        source = """<main>
<!-- NOSCRIPT_START --><noscript>old</noscript><!-- NOSCRIPT_END -->
</main>"""
        with tempfile.TemporaryDirectory() as directory:
            index = Path(directory) / "index.html"
            index.write_text(source, encoding="utf-8")
            write_fallback(
                [{"brand": "甲<script>", "name": "好味汁", "score": 4.1, "comment": "鲜香"}],
                index,
            )
            text = index.read_text(encoding="utf-8")

        self.assertIn("甲&lt;script&gt;", text)
        self.assertIn("好味汁", text)
        self.assertNotIn("甲<script>", text)


if __name__ == "__main__":
    unittest.main()
