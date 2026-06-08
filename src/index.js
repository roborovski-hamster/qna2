async function getAnswer(question, category, env) {
  const response = await fetch(
    `${env.SHEET_API_URL}?token=${env.TOKEN}`
  );

  const data = await response.json();

  const userText = String(question || "")
    .replace(/\s/g, "")
    .toLowerCase();

  const selectedCategory = String(category || "")
    .replace(/\s/g, "")
    .toLowerCase();

  for (const row of data) {
    const rowCategories = String(row.category || "")
      .split(",")
      .map(v => v.replace(/\s/g, "").toLowerCase())
      .filter(v => v);

    if (!rowCategories.includes(selectedCategory)) continue;

    const keywords = String(row.keyword || "")
      .split(",")
      .map(v => v.replace(/\s/g, "").toLowerCase())
      .filter(v => v);

    for (const keyword of keywords) {
      if (userText.includes(keyword)) {
        return row.answer;
      }
    }
  }

  return "해당 질문에 대한 답변이 없습니다.";
}

function getCategoryFromContext(body) {
  const contexts = body.contexts || [];

  const categoryList = [
    "현수막",
    "해수",
    "종량제",
    "자전거",
    "공원등",
    "보안등",
    "주차장",
    "견인",
    "체육센터",
    "서창",
    "수영장",
    "물빛"
  ];

  for (const category of categoryList) {
    const normalizedCategory = category
      .replace(/\s/g, "")
      .toLowerCase();

    const matched = contexts.some(c => {
      const contextName = String(c.name || "")
        .replace(/\s/g, "")
        .toLowerCase();

      return contextName === normalizedCategory;
    });

    if (matched) {
      return category;
    }
  }

  return "";
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") {
      return Response.json({
        status: "ok",
        hasSheetUrl: !!env.SHEET_API_URL,
        hasToken: !!env.TOKEN
      });
    }

    if (request.method === "POST" && url.pathname === "/skill") {
      try {
        const body = await request.json();

        const category =
          body.action?.params?.category ||
          getCategoryFromContext(body) ||
          "";

        const utterance =
          body.action?.params?.keyword ||
          body.userRequest?.utterance ||
          "";

        const answer = await getAnswer(utterance, category, env);

        return Response.json({
          version: "2.0",
          template: {
            outputs: [
              {
                simpleText: {
                  text: answer
                }
              }
            ]
          }
        });
      } catch (error) {
        return Response.json({
          version: "2.0",
          template: {
            outputs: [
              {
                simpleText: {
                  text: "오류가 발생했습니다: " + error.message
                }
              }
            ]
          }
        });
      }
    }

    return Response.json(
      { error: "Not Found" },
      { status: 404 }
    );
  }
};
