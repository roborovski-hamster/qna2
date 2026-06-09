async function getAnswer(question, category, env) {
  const response = await fetch(`${env.SHEET_API_URL}?token=${env.TOKEN}`);
  const data = await response.json();

  const userText = String(question || "").replace(/\s/g, "").toLowerCase();
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

function getContextName(body) {
  const contexts =
    body.contexts ||
    body.userRequest?.contexts ||
    body.bot?.contexts ||
    body.action?.contexts ||
    [];

  return contexts[0]?.name || "";
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") {
      return Response.json({ status: "ok" });
    }

    if (request.method === "POST" && url.pathname === "/skill") {
      try {
        const body = await request.json();
        const contextName = getContextName(body); //이름

        const CATEGORY_LIST = [
          "현수막",
          "종량제",
          "해수"
        ];
        
        let category =
          body.action?.params?.category || "";

        let keyword =
          body.action?.params?.keyword ||
          body.userRequest?.utterance ||
          "";

        const normalizedCategory = category.trim();
        
        if (!CATEGORY_LIST.includes(normalizedCategory) && keyword != "") {
          keyword = category;
          category = contextName;
        }

        category = "현수막";

        const answer = await getAnswer(keyword, category, env);

        return Response.json({
          version: "2.0",
          template: {
            outputs: [
              {
                simpleText: {
                  text: JSON.stringify({answer: answer, contextName: contextName})
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
                  text: "오류가 발생했습니다."
                }
              }
            ]
          }
        });
      }
    }

    return Response.json({ error: "Not Found" }, { status: 404 });
  }
};
