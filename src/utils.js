// 문자열 정규화
export function normalize(text) {

  return String(text || "")
    .replace(/\s/g, "")
    .toLowerCase();
}

// Output Context 읽어오기
export function getContextName(body) {

  const contexts =
    body.contexts ||
    body.userRequest?.contexts ||
    body.bot?.contexts ||
    body.action?.contexts ||
    [];

  if (!Array.isArray(contexts) || contexts.length === 0) {
    return "";
  }

  // lifespan이 가장 많이 남은 카테고리 반환
  const latestContext = contexts.reduce((max, current) => {

    return (current.lifespan || 0) >
           (max.lifespan || 0)
      ? current
      : max;

  });

  return latestContext.name || "";
}


// HTML 특수문자 처리
export function escapeHtml(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}


// HTTPS 이미지 URL 확인
export function safeImageUrl(value) {

  try {

    const url = new URL(value);

    return url.protocol === "https:"
      ? url.href
      : "";

  } catch {

    return "";
  }
}
