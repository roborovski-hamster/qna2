const SHEET_API_URL = "https://script.google.com/macros/s/AKfycbzCLyjEUJ9bCycMtsSeTW90dWnHnZYcv_N_f3hjC8lCcZVsW4PneFJVYr8Tc137JHBgRg/exec?token=${env.TOKEN}";
//env.TOKEN 서버 secrets에서 확인

async function getAnswer(question) {
  const response = await fetch(SHEET_API_URL);
  const data = await response.json();

  const userText = String(question || "")
    .replace(/\s/g, "")
    .toLowerCase();

  for (const row of data) {
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") {
      return Response.json({
        status: "ok"
      });
    }

    if (request.method === "POST" && url.pathname === "/skill") {
      try {
        const body = await request.json();

        const utterance =
          body.action?.params?.keyword ||
          body.userRequest?.utterance ||
          "";

        const answer = await getAnswer(utterance, env);

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
                  text: "오류가 발생했습니다."
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
