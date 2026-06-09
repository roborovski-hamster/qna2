
//답변 읽어오기
async function getAnswer(category, keyword, env) {
  const response = await fetch(
    `${env.SHEET_API_URL}?token=${env.TOKEN}`
  );

  // 구글시트 전체 데이터 가져오기
  const data = await response.json();

  const userText = String(keyword || "").replace(/\s/g, "").toLowerCase();
  const selectedCategory = String(category || "").replace(/\s/g, "").toLowerCase();

  for (const row of data) {
    const categories = String(row.category || "")
      .split(",")
      .map(v => v.replace(/\s/g, "").toLowerCase());

    if (!categories.includes(selectedCategory)) continue;

    const keywords = String(row.keyword || "")
      .split(",")
      .map(v => v.replace(/\s/g, "").toLowerCase());

    if (keywords.some(keyword => userText.includes(keyword))) {
      return row.answer;
    }
  }

  return "해당 질문에 대한 답변이 없습니다.";
}

// 답변 형식 생성
function createResponse(text) {
  return Response.json({
    version: "2.0",
    template: {
      outputs: [{simpleText: {text}}]
    }
  });
}

//out 컨텍스트 읽어오기
function getContextName(body) {
  const contexts = body.contexts || body.userRequest?.contexts || body.bot?.contexts || body.action?.contexts || [];
  return contexts[0]?.name || "";
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/skill") {
      try {
        const body = await request.json();
        const context = getContextName(body); //out컨텍스트

        let category = body.action?.params?.category || "";
        if (category === "!없는카테고리") {
          category = getContextName(body) || "";
        }
        if(category == "") {
          return createResponse("카테고리를 다시 선택해주세요. (현수막 등..)");
        }
        
        const keyword = body.action?.params?.keyword || body.userRequest?.utterance || ""; //키워드
        
        const answer = await getAnswer(category,keyword,env); //답변
        return createResponse(answer);
      } catch (error) {
        return createResponse("오류가 발생했습니다.");
      }
    }

    return Response.json(
      { error: "Not Found" },
      { status: 404 }
    );
  }
};
