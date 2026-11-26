import { GEMINI_MODEL, GEMINI_TIMEOUT } from "./config.js";
import { SYSTEM_PROMPT } from "./prompt.js";
import { normalize } from "./utils.js";

// Gemini를 이용한 FAQ 답변 검색
export async function getAnswer(data, category, question, env) {

  // 선택한 카테고리의 FAQ만 추출
  const rows = data.filter(row =>
    normalize(row.category) === normalize(category)
    && (row.answer || row.imageUrl)
  );

  if (rows.length === 0) {

    console.log("해당 카테고리 FAQ 없음");

    return null;
  }

  if (!env.GEMINI_API_KEY) {
    throw new Error("Gemini API Key 미설정");
  }

  // Gemini에 전달할 FAQ 목록
  // 임시 번호를 부여하므로 구글시트 수정 불필요
  const faqData = rows.map((row, index) => ({
    id: index + 1,
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
                category: category,
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
                id: {
                  type: "integer",
                  minimum: 0,
                  maximum: rows.length
                }
              },
              required: ["id"]
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
    const matchedId = JSON.parse(text).id;

    // 적합한 FAQ가 없는 경우
    if (matchedId === 0) {

      console.log("Gemini 검색 결과 없음");

      return null;
    }

    // FAQ 번호 유효성 검사
    if (
      !Number.isInteger(matchedId) ||
      matchedId < 1 ||
      matchedId > rows.length
    ) {

      console.log("Gemini FAQ 번호 오류");

      throw new Error("잘못된 FAQ 번호");
    }

    // 구글시트 원본 데이터 추출
    const matchedRow = rows[matchedId - 1];

    // 카테고리 재검증
    if (
      normalize(matchedRow.category) !== normalize(category)
    ) {

      console.log("FAQ 카테고리 불일치");

      return null;
    }

    console.log("Gemini 검색 성공");
    console.log("선택된 FAQ 번호:", matchedId);

    // Gemini 생성 답변이 아닌
    // 구글시트 원본 행 반환
    return matchedRow;

  } catch (error) {

    console.log(
      "Gemini 검색 오류:",
      error.name || "Error"
    );

    throw error;
  }
}
