import { safeImageUrl } from "./utils.js";

// 카카오 답변 형식 생성
export function createResponse2(category, row) {

  // 적절한 FAQ가 없는 경우
  if (!row) {

    return createResponse(
      `[${category}]\n해당 질문에 대한 답변을 찾을 수 없습니다.\n\n질문을 구체적으로 입력하거나 선택한 카테고리를 확인해 주세요.`
    );
  }

  const outputs = [];

  const imageUrl = safeImageUrl(row.imageUrl);

  // 이미지가 포함된 답변
  if (imageUrl) {

    return Response.json({
      version: "2.0",
      template: {
        outputs: [
          {
            basicCard: {
              title: `[${row.category}] ${row.question}`,
              description: String(row.answer || ""),

              thumbnail: {
                imageUrl: imageUrl
              },

              buttons: [
                {
                  action: "webLink",
                  label: "이미지 크게 보기",
                  webLinkUrl: imageUrl
                }
              ]
            }
          }
        ]
      }
    });

  // 일반 텍스트 답변
  } else if (row.answer) {

    outputs.push({
      simpleText: {
        text: `📂 ${row.category}\n📌 ${row.question}\n\n${row.answer}`
      }
    });

  } else {

    return createResponse(
      "해당 질문에 대한 안내 내용을 확인할 수 없습니다."
    );
  }

  return Response.json({
    version: "2.0",
    template: {
      outputs
    }
  });
}


// 일반 메시지 답변 형식 생성
export function createResponse(text) {

  return Response.json({
    version: "2.0",
    template: {
      outputs: [
        {
          simpleText: {
            text
          }
        }
      ]
    }
  });
}
