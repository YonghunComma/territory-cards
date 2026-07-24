import { useEffect, useMemo, useState } from "react";
import { fetchLetterHistory, letterUnassign } from "../api";
import type { LetterHistoryRow } from "../api";
import type { Publisher } from "../types";
import { matchName } from "../chosung";
import { friendlyError } from "../errors";

function fmtDate(d: string): string {
  const [y, m, day] = d.split("-");
  return `${y.slice(2)}.${Number(m)}.${Number(day)}`;
}
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

type Batch = {
  key: string;
  written_date: string;
  created_at: string;
  publisher_name: string | null;
  rows: LetterHistoryRow[];
};

export default function LetterHistory({ publishers }: { publishers: Publisher[] }) {
  const [history, setHistory] = useState<LetterHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [busy, setBusy] = useState(false);
  const [pubQuery, setPubQuery] = useState("");
  const [filterPubId, setFilterPubId] = useState("");
  const [filterDate, setFilterDate] = useState("");

  async function load() {
    setLoading(true);
    try {
      setHistory(await fetchLetterHistory());
    } catch (e) {
      setError(friendlyError(e));
    }
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const filteredPubs = useMemo(
    () => publishers.filter((p) => matchName(p.name, pubQuery)),
    [publishers, pubQuery]
  );
  const selectedPubName = publishers.find((p) => p.id === filterPubId)?.name;

  // 같은 배정(전도인+날짜+기록시각)을 묶음으로
  const batches = useMemo(() => {
    let rows = history;
    if (filterPubId) rows = rows.filter((r) => r.publisher_id === filterPubId);
    if (filterDate) rows = rows.filter((r) => r.written_date === filterDate);
    const map = new Map<string, Batch>();
    for (const r of rows) {
      const key = `${r.publisher_id}|${r.written_date}|${r.created_at}`;
      let b = map.get(key);
      if (!b) {
        b = { key, written_date: r.written_date, created_at: r.created_at, publisher_name: r.publisher_name, rows: [] };
        map.set(key, b);
      }
      b.rows.push(r);
    }
    return [...map.values()]; // history가 최신순이라 묶음도 최신순
  }, [history, filterPubId, filterDate]);

  const hasFilter = !!(filterPubId || filterDate);
  const shown = hasFilter ? batches : batches.slice(0, 20);

  async function deleteRecords(ids: string[], label: string) {
    if (!window.confirm(`${label}\n정말 취소(삭제)할까요? 편지 기록이 지워집니다.`)) return;
    setBusy(true);
    setError("");
    setDone("");
    try {
      const n = await letterUnassign(ids);
      setDone(`${n}건의 편지 기록을 삭제했습니다.`);
      await load();
    } catch (e) {
      setError(friendlyError(e));
    }
    setBusy(false);
  }

  if (loading) return <div className="loading">편지 이력을 불러오는 중...</div>;

  return (
    <div>
      <div className="notice">
        편지 배정 기록을 <b>날짜·시간·전도인</b>으로 찾아 취소할 수 있습니다. 묶음
        전체 또는 집 하나씩 지울 수 있어요.
      </div>
      {error && <div className="error-msg">{error}</div>}

      <div className="field">
        <label>
          전도인으로 찾기
          {selectedPubName && <span style={{ color: "var(--c-primary)" }}> — {selectedPubName}</span>}
        </label>
        <input
          type="text"
          value={pubQuery}
          onChange={(e) => setPubQuery(e.target.value)}
          placeholder="이름 또는 초성"
        />
        {pubQuery && (
          <div style={{ maxHeight: 160, overflowY: "auto", border: "1px solid var(--c-border)", borderRadius: 10, marginTop: 6 }}>
            {filteredPubs.map((p) => (
              <button
                key={p.id}
                className={`choice-btn ${filterPubId === p.id ? "selected" : ""}`}
                style={{ marginBottom: 0, borderRadius: 0, border: "none", borderBottom: "1px solid var(--c-border)" }}
                onClick={() => {
                  setFilterPubId(p.id);
                  setPubQuery("");
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="row" style={{ alignItems: "flex-end" }}>
        <div className="field" style={{ flex: 1 }}>
          <label>날짜로 찾기</label>
          <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
        </div>
        {hasFilter && (
          <button
            className="btn-line"
            style={{ flex: 1 }}
            onClick={() => {
              setFilterPubId("");
              setFilterDate("");
              setPubQuery("");
            }}
          >
            필터 지우기
          </button>
        )}
      </div>

      <div className="muted" style={{ margin: "8px 0" }}>
        {hasFilter ? `${batches.length}개 배정` : `최근 배정 ${shown.length}개 (위에서 전도인·날짜로 더 찾기)`}
      </div>

      {shown.length === 0 && <div className="muted">기록이 없습니다.</div>}

      {shown.map((b) => (
        <div key={b.key} className="card-box" style={{ padding: 10, marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <div>
              <b>{fmtDate(b.written_date)}</b> · {fmtTime(b.created_at)} · {b.publisher_name ?? "?"} · {b.rows.length}집
            </div>
            <button
              className="btn-line"
              style={{ color: "var(--c-danger)", borderColor: "var(--c-danger)", flexShrink: 0 }}
              disabled={busy}
              onClick={() => deleteRecords(b.rows.map((r) => r.id), `${b.publisher_name ?? "?"} · ${fmtDate(b.written_date)} · ${b.rows.length}집`)}
            >
              이 배정 취소
            </button>
          </div>
          {b.rows.map((r) => (
            <div key={r.id} className="card-item" style={{ cursor: "default" }}>
              <span className="name">
                {r.building}, {r.ho}호
              </span>
              <button
                className="btn-line"
                style={{ color: "var(--c-danger)", borderColor: "var(--c-danger)", flexShrink: 0, padding: "4px 10px" }}
                disabled={busy}
                onClick={() => deleteRecords([r.id], `${r.building}, ${r.ho}호`)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      ))}

      {done && <div className="notice" style={{ marginTop: 12 }}>{done}</div>}
    </div>
  );
}
