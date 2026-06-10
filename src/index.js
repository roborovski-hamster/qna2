
//메인
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
          return createResponse("카테고리가 초기화되었습니다. 리스트에서 카테고리를 다시 선택해주세요. (예)종량제 Q&A 등..");
        }
        
        const keyword = body.action?.params?.keyword || body.userRequest?.utterance || ""; //키워드
        
        const answer = await getAnswer(category,keyword,env); //답변
        return createResponse2(answer);
      } catch (error) {
        return createResponse("오류가 발생했습니다.");
      }
    } else if (url.pathname === "/faq") {
      const response = await fetch(`${env.SHEET_API_URL}?token=${env.TOKEN}`);
      const data = await response.json();
      const ttml = createHtml(data);
        return new Response(html, {
        headers: {
      "Content-Type": "text/html; charset=UTF-8"
    }
  });
    } else {
      return Response.json(
        { error: "Not Found" },
        { status: 404 }
      );
    }
  }
};




async function getAnswer(category, userKeyword, env) {
  const response = await fetch(`${env.SHEET_API_URL}?token=${env.TOKEN}`);
  const data = await response.json();

  let bestAnswer = "";
  let bestRow = null;
  let bestScore = 0;

  for (const row of data) {
    if (normalize(row.category) !== normalize(category)) continue;

    const keywords = String(row.keyword || "")
      .split(",")
      .map(v => v.trim())
      .filter(v => v);

    for (const keyword of keywords) {
      const score = getScore(userKeyword, keyword);

      if (score > bestScore) {
        bestScore = score;
        bestAnswer = row.answer;
        bestRow = row;
      }
    }
  }

  if (bestScore >= 3) {
    //return bestAnswer;
    return bestRow;
  }

  //return "해당 질문에 대한 답변이 없습니다.";
  return null;
}


function normalize(text) {
  return String(text || "")
    .replace(/\s/g, "")
    .toLowerCase();
}

function getScore(userText, sheetKeyword) {
  const user = normalize(userText);
  const keyword = normalize(sheetKeyword);

  if (!user || !keyword) return 0;

  if (user === keyword) return 100;
  if (user.includes(keyword)) return 90;
  if (keyword.includes(user)) return 80;

  let score = 0;

  for (const char of user) {
    if (keyword.includes(char)) {
      score += 1;
    }
  }
  return score;
}


// 답변 형식 생성
function createResponse2(row) {
  if (!row) {
    return Response.json({
      version: "2.0",
      template: {
        outputs: [
          {
            simpleText: {
              text: "해당 질문에 대한 답변이 없습니다."
            }
          }
        ]
      }
    });
  }

  const outputs = [];

  if (row.imageUrl) {
    return Response.json({
      version: "2.0",
      template: {
        outputs: [
          {
            basicCard: {
              title: "",
              description: row.answer || "",
              thumbnail: {
                imageUrl: row.imageUrl
              },
              buttons: [
                {
                  action: "webLink",
                  label: "이미지 크게 보기",
                  webLinkUrl: row.imageUrl
                }
              ]
            }
          }
        ]
      }
    });
  } else if (row.answer) {
    outputs.push({
      simpleText: {
        text: row.answer
      }
    });
  }

  return Response.json({
    version: "2.0",
    template: {
      outputs
    }
  });
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

function createHtml(data) {
    let html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>전체 FAQ</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 16px;
        background: #f7f7f7;
        color: #222;
      }
      h1 { font-size: 22px; }
      .item {
        background: #fff;
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 14px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      }
      .category {
        display: inline-block;
        font-size: 12px;
        background: #eee;
        padding: 3px 8px;
        border-radius: 20px;
        margin-bottom: 8px;
      }
      .answer {
        font-size: 15px;
        white-space: pre-wrap;
      }
      img {
        width: 100%;
        height: auto;
        border-radius: 8px;
        margin-top: 12px;
      }
    </style>
  </head>
  <body>
    <h1>전체 FAQ</h1>
  `;

  data.forEach(row => {
    html += `
      <div class="item">
        <div class="category">${row.category || ""}</div>
        <div class="answer">${row.answer || ""}</div>
        ${row.imageUrl ? `<img src="${row.imageUrl}">` : ""}
      </div>
    `;
  });
  return html;
}
