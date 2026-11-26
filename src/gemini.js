import { GEMINI_MODEL, GEMINI_TIMEOUT } from "./config.js";
import { SYSTEM_PROMPT } from "./prompt.js";

// Gemini를 이용한 FAQ 답변 검색
export async function getAnswer(data, category, question, env) {

  const rows = data.filter(row => row.category && (row.answer || row.imageUrl));
  if (!rows.length) return { status: "NOT_FOUND", row: null };

  if (!env.GEMINI_API_KEY) {
    throw new Error("Gemini API Key 미설정");
  }

  // Gemini에 전달할 FAQ 목록
  // 임시 번호를 부여하므로 구글시트 수정 불필요
  const faqData = rows.map((row, index) => ({
    id: index + 1,
    category: String(row.category),
    question: String(row.question || ""),
    answer: String(row.answer || "")
  }));

  console.log("Gemini 검색 시작");
  console.log("FAQ 개수:", rows.length);

  try {

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": env.GEMINI_API_KEY
        },

        body: JSON.stringify({

          systemInstruction: {
            parts: [{
              text: SYSTEM_PROMPT
            }]
          },

          contents: [{
            role: "user",
            parts: [{
              text: JSON.stringify({
                previousCategory: category,
                question: question,
                faq: faqData
              })
            }]
          }],

          generationConfig: {

            responseMimeType: "application/json",

            responseJsonSchema: {
              type: "object",
              properties: {
                status: { type: "string", enum: ["MATCH", "CLARIFY", "NOT_FOUND"] },
                categories: { type: "array", items: { type: "string" }, maxItems: 10 },
                id: {
                  type: "integer",
                  minimum: 0,
                  maximum: rows.length
                }
              },
              required: ["status", "id", "categories"]
            },

            thinkingConfig: {
              thinkingLevel: "MINIMAL"
            },

            maxOutputTokens: 256
          }
        }),

        signal: AbortSignal.timeout(GEMINI_TIMEOUT)
      }
    );

    // Gemini API 오류 확인
    if (!response.ok) {

      console.log(
        "Gemini HTTP 오류:",
        response.status
      );

      throw new Error("Gemini API 호출 실패");
    }

    const result = await response.json();

    const candidate = result.candidates?.[0];

    if (!candidate || candidate.finishReason !== "STOP") {

      console.log("Gemini 응답 미완료 또는 차단");

      throw new Error("Gemini 응답 오류");
    }

    // Gemini 응답 추출
    const text = candidate.content?.parts
      ?.filter(part => !part.thought)
      .map(part => part.text || "")
      .join("") || "";

    if (!text) {
      throw new Error("Gemini 응답 없음");
    }

    // JSON 응답 분석
    const { status, id, categories } = JSON.parse(text);
    if (!Array.isArray(categories) || !Number.isInteger(id)) throw new Error("잘못된 검색 결과");
    if (status === "NOT_FOUND" && id === 0) return { status, row: null };
    if (status === "CLARIFY" && id === 0) {
      const allowed = [...new Set(rows.map(row => String(row.category)))];
      const selected = allowed.filter(c => categories.includes(c)).slice(0, 10);
      return { status, categories: selected.length ? selected : allowed.slice(0, 10) };
    }
    if (status !== "MATCH" || id < 1 || id > rows.length) throw new Error("잘못된 FAQ 번호");
    console.log("선택된 FAQ 번호:", id);
    return { status, row: rows[id - 1] };

  } catch (error) {

    console.log(
      "Gemini 검색 오류:",
      error.name || "Error"
    );

    throw error;
  }
}
