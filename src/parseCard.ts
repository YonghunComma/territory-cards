// 업로드한 구역카드 엑셀(.xlsx)을 파싱한다. rebuild_migration.py 와 동일한 규칙:
//   - name = B1 (구역명)
//   - start_point_url = A6 의 =HYPERLINK("url","구역시작 지점") 에서 url
//   - units = 12행부터 B열(번지·호수) 중 값이 있는 것 (순서대로)
//   - legacy_number = 파일명 접두어 숫자 (예: "108_장대푸르지오.xlsx" -> 108)
// xlsx 라이브러리는 이 파일에서만 동적 로드되어 기본 번들을 키우지 않는다.

export interface ParsedCard {
  legacy_number: number | null;
  name: string;
  start_point_url: string | null;
  units: string[];
}

export async function parseCardFile(file: File): Promise<ParsedCard> {
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" }); // 수식은 기본으로 .f 에 담김
  const ws = wb.Sheets["카드"] ?? wb.Sheets[wb.SheetNames[0]];
  if (!ws) throw new Error("엑셀 시트를 읽을 수 없습니다.");

  const val = (addr: string): unknown => (ws as Record<string, { v?: unknown; f?: string }>)[addr]?.v;
  const formula = (addr: string): string | undefined =>
    (ws as Record<string, { v?: unknown; f?: string }>)[addr]?.f;

  // 파일명 접두어 번호
  const prefix = file.name.split("_")[0];
  const legacy_number = /^\d+$/.test(prefix) ? parseInt(prefix, 10) : null;

  // 구역명
  const b1 = val("B1");
  const name =
    (b1 != null ? String(b1).trim() : "") ||
    file.name.replace(/\.xlsx$/i, "").split("_").slice(1).join("_") ||
    file.name;

  // A6 시작점 링크
  let start_point_url: string | null = null;
  const a6f = formula("A6");
  if (a6f) {
    const m = a6f.match(/HYPERLINK\("([^"]+)"/i);
    if (m) start_point_url = m[1].trim();
  }

  // 12행부터 B열 = 번지·호수
  const units: string[] = [];
  for (let r = 12; r <= 250; r++) {
    const v = val("B" + r);
    let s = "";
    if (typeof v === "number") s = String(v);
    else if (v != null) s = String(v).trim();
    if (s !== "") units.push(s);
  }

  return { legacy_number, name, start_point_url, units };
}
