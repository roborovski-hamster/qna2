import { CACHE_DURATION } from "./config.js";

let sheetCache = null;
let sheetCacheTime = 0;

// 구글시트 조회 및 캐시
// 구글시트 조회 및 2단계 캐시
export async function getSheetData(env, requestUrl) {
  const cacheDuration = CACHE_DURATION;

  if (sheetCache && Date.now() - sheetCacheTime < cacheDuration) {
    console.log("CACHE HIT: 메모리");
    return sheetCache;
  }

  // 사용자 질문, 토큰 등을 포함하지 않는 공통 캐시 키
  const cacheKey = new Request(
    new URL("/__internal_faq_cache_v1", requestUrl).href,
    { method: "GET" }
  );

  const cache = caches.default;

  try {
    const cached = await cache.match(cacheKey);

    if (cached) {
      const saved = await cached.json();

      if (Array.isArray(saved.data) &&
          Number.isFinite(saved.savedAt) &&
          Date.now() - saved.savedAt < cacheDuration) {

        sheetCache = saved.data;
        sheetCacheTime = saved.savedAt;

        console.log("CACHE HIT: Cloudflare Cache API");

        return sheetCache;
      }
    }
  } catch {
    console.warn("Cloudflare 캐시 조회 실패");
  }

  console.log("CACHE MISS: Google Sheet 직접 조회");

  const apiUrl = new URL(env.SHEET_API_URL);
  apiUrl.searchParams.set("token", env.TOKEN);

  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new Error("구글시트 조회 실패");
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    throw new Error("FAQ 데이터 형식 오류");
  }

  sheetCache = data;
  sheetCacheTime = Date.now();

  try {
    await cache.put(
      cacheKey,
      new Response(JSON.stringify({
        data,
        savedAt: sheetCacheTime
      }), {
        headers: {
          "Content-Type": "application/json; charset=UTF-8",
          "Cache-Control": "public, max-age=300"
        }
      })
    );

    console.log("Cloudflare 캐시 저장 완료");

  } catch {
    console.warn("Cloudflare 캐시 저장 실패");
  }

  return data;
}
