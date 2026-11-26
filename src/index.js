import { getSheetData } from "./sheet.js";
import { getAnswer } from "./gemini.js";
import { createResponse, createResponse2, clarifyResponse, rememberCategory } from "./response.js";
import { containsPersonalInfo } from "./security.js";
import { readCategory } from "./context.js";
import { createHtml } from "./faq.js";

// 메인
export default {
  async fetch(request, env) {

    const url = new URL(request.url);

    // 카카오 챗봇
    if (request.method === "POST" && url.pathname === "/skill") {

      try {

        const body = await request.json();

        // 사용자 질문
        const question = String(
          body.userRequest?.utterance || ""
        ).trim();

        if (!question) {
          return createResponse("질문을 입력해 주세요.");
        }

        if (question.length > 300) {
          return createResponse(
            "질문을 300자 이내로 입력해 주세요."
          );
        }

        // 개인정보 의심 패턴 검사
        if (containsPersonalInfo(question)) {
          return createResponse(
            "개인정보를 제외하고 질문을 다시 입력해 주세요."
          );
        }

        // FAQ 목록 조회
        const sheetStart = Date.now();
        const data = await getSheetData(env, request.url);
        console.log("Google Sheet 조회 시간:", Date.now() - sheetStart, "ms");

        const category = readCategory(body, data);

        // Gemini를 이용한 FAQ 검색
        const geminiStart = Date.now();
        const answer = await getAnswer(
          data,
          category,
          question,
          env
        );
        console.log("Gemini 검색 시간:", Date.now() - geminiStart, "ms");

        // 구글시트 원본 답변 반환
        if (answer.status === "CLARIFY") return clarifyResponse(answer.categories, question);
        const response = createResponse2(category, answer.row);
        return answer.row ? rememberCategory(response, answer.row.category) : response;

      } catch (error) {

        console.error("챗봇 처리 오류:", {
        name: error.name,
        message: error.message,
        stack: error.stack
    });

        return createResponse(
          "현재 답변 서비스 이용이 원활하지 않습니다.\n잠시 후 다시 이용해 주세요."
        );
      }

    // 전체 FAQ 페이지
    } else if (
      request.method === "GET" &&
      url.pathname === "/faq"
    ) {

      try {

        const data = await getSheetData(env, request.url);
        const html = createHtml(data);

        return new Response(html, {
          headers: {
            "Content-Type": "text/html; charset=UTF-8"
          }
        });

      } catch (error) {

        return new Response(`
          <h2>오류가 발생했습니다.</h2>
          <p>잠시 후 다시 이용해 주세요.</p>
        `, {
          status: 500,
          headers: {
            "Content-Type": "text/html; charset=UTF-8"
          }
        });
      }

    } else {

      return Response.json(
        { error: "Not Found" },
        { status: 404 }
      );
    }
  }
};
