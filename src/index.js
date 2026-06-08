async function getAnswer(question, category, env) {
  const response = await fetch(`${env.SHEET_API_URL}?token=${env.TOKEN}`);
  const data = await response.json();

  const userText = String(question || "").replace(/\s/g, "").toLowerCase();
  const selectedCategory = String(category || "").replace(/\s/g, "").toLowerCase();

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

function getContexts(body) {
  return (
    body.contexts ||
    body.userRequest?.contexts ||
    body.bot?.contexts ||
    body.action?.contexts ||
    []
  );
}

function getContextNames(body) {
  const contexts = getContexts(body);

  return contexts
    .map(c => c.name || c.id || JSON.stringify(c))
    .filter(v => v);
}

function getCategoryFromContext(body) {
  const contextNames = getContextNames(body);

  const categoryList = ["현수막", "해수", "종량제"];

  for (const category of categoryList) {
    const matched = contextNames.some(name =>
      String(name).replace(/\s/g, "").toLowerCase() ===
      category.replace(/\s/g, "").toLowerCase()
    );

    if (matched) return category;
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

        const contextNames = getContextNames(body);

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
                  text:
`${answer}

[디버그]
입력 keyword: ${utterance}
인식 category: ${category || "없음"}
넘어온 context 이름: ${contextNames.length ? contextNames.join(", ") : "없음"}`
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

    return Response.json({ error: "Not Found" }, { status: 404 });
  }
};
