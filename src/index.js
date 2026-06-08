const SHEET_API_URL = "https://script.google.com/macros/s/AKfycbw8uzwp_8sAawPNPAIl8XEdpU24GwjK96vIpFYYTatYSmVwyaNk1vikH61xh8MWYZSf3g/exec";

async function getAnswer(question) {
  const response = await fetch(SHEET_API_URL);
  const data = await response.json();

  const userText = question.replace(/\s/g, "").toLowerCase();

  for (const row of data) {
    const keywords = String(row.keyword || "")
      .split(",")
      .map(v => v.replace(/\s/g, "").toLowerCase());

    for (const keyword of keywords) {
      if (userText.includes(keyword)) {
        return row.answer;
      }
    }
  }

  return "해당 질문에 대한 답변이 없습니다.";
}

export default {
  async fetch(request) {

    const url = new URL(request.url);

    if (request.method === "POST" &&
        url.pathname === "/skill") {

      const body = await request.json();

      const utterance =
        body.userRequest.utterance;

      const answer =
        await getAnswer(utterance);

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
    }

    return Response.json({
      status: "ok"
    });
  }
};
