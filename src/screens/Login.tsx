import { useState } from "react";
import { supabase } from "../supabase";
import { ID_TO_EMAIL } from "../config";

const IDS = Object.keys(ID_TO_EMAIL);

function savedPwKey(id: string) {
  return "savedPw_" + id;
}

export default function Login() {
  const [loginId, setLoginId] = useState(() => {
    const last = localStorage.getItem("lastLoginId");
    return last && IDS.includes(last) ? last : IDS[0];
  });
  const [password, setPassword] = useState(
    () => localStorage.getItem(savedPwKey(localStorage.getItem("lastLoginId") ?? IDS[0])) ?? ""
  );
  const [savePw, setSavePw] = useState(() => password !== "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function selectId(id: string) {
    setLoginId(id);
    // 이 아이디로 저장해둔 비밀번호가 있으면 자동으로 채움
    const saved = localStorage.getItem(savedPwKey(id));
    setPassword(saved ?? "");
    setSavePw(saved !== null);
    setError("");
  }

  async function signIn() {
    setBusy(true);
    setError("");
    const email = ID_TO_EMAIL[loginId];
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("로그인에 실패했습니다. 비밀번호를 확인해 주세요.");
    } else {
      localStorage.setItem("lastLoginId", loginId);
      if (savePw) localStorage.setItem(savedPwKey(loginId), password);
      else localStorage.removeItem(savedPwKey(loginId));
    }
    setBusy(false);
  }

  return (
    <div className="login-wrap">
      <h1>구역카드 관리</h1>
      <div className="field">
        <label>아이디 선택</label>
        <div className="round-tabs">
          {IDS.map((id) => (
            <button
              key={id}
              className={loginId === id ? "active" : ""}
              onClick={() => selectId(id)}
            >
              {id}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label>비밀번호</label>
        <input
          type="password"
          value={password}
          autoComplete="current-password"
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && signIn()}
          placeholder="비밀번호"
        />
      </div>
      <label
        style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, fontWeight: 600 }}
      >
        <input
          type="checkbox"
          checked={savePw}
          onChange={(e) => setSavePw(e.target.checked)}
          style={{ width: 24, height: 24, minHeight: 0 }}
        />
        비밀번호 저장 (이 기기에서 자동으로 채워짐)
      </label>
      {error && <div className="error-msg">{error}</div>}
      <button className="btn-primary" onClick={signIn} disabled={busy || !password}>
        {busy ? "로그인 중..." : "로그인"}
      </button>
    </div>
  );
}
