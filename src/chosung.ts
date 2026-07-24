// 한글 초성 검색: 이름 부분 일치 또는 초성(ㄱㅅㅊ) 일치
const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";

export function chosungOf(s: string): string {
  let out = "";
  for (const ch of s) {
    const code = ch.charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) {
      out += CHO[Math.floor((code - 0xac00) / 588)];
    } else {
      out += ch;
    }
  }
  return out;
}

export function matchName(name: string, q: string): boolean {
  const query = q.trim();
  if (!query) return true;
  return name.includes(query) || chosungOf(name).includes(query);
}
