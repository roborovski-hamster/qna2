//메인
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

  if (request.method === "POST" && url.pathname === "/skill") {
      try {
        const body = await request.json();
        //const context = getContextName(body); //out컨텍스트

        const category = getContextName(body);

        if (category == "") {
          return createResponse("먼저 메뉴에서 '챗봇전환'을 눌러 카테고리를 선택해주세요.");
        }
        //const keyword = body.action?.params?.keyword || body.userRequest?.utterance || ""; //키워드
        const keyword = body.userRequest?.utterance || ""; //키워드

        const answer = await getAnswer(category,keyword,env); //답변
        return createResponse2(answer);
      } catch (error) {
        return createResponse("오류가 발생했습니다.");
      }
    } else if (url.pathname === "/faq") {
      const response = await fetch(`${env.SHEET_API_URL}?token=${env.TOKEN}`);
      const data = await response.json();
      const html = createHtml(data);
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
              title: row.question,
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
        text: `📂 ${row.category}\n📌 ${row.question}\n\n${row.answer}`
      }
    //textCard: {
    //  title: row.question,
    //  description: row.answer
    //}
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
  // 맨 마지막 out 컨텍스트 리턴 
  // return contexts.length > 0? contexts[contexts.length - 1].name : "";
 // 제일 첫번째 out 컨텍스트 리턴
  return contexts.length > 0? contexts[0].name : "";
}

function createHtml(data) {
  const categories = [...new Set(
    data
      .map(row => row.category)
      .filter(v => v)
  )];

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

    h1 {
      font-size: 22px;
      margin-bottom: 12px;
    }

    select {
      width: 100%;
      padding: 10px;
      margin-bottom: 16px;
      border-radius: 8px;
      border: 1px solid #ccc;
      font-size: 15px;
      background: #fff;
    }

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

    .question {
      font-size: 16px;
      font-weight: bold;
      margin: 6px 0 10px 0;
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

  <select id="categoryFilter" onchange="filterCategory()">
    <option value="전체">전체</option>
`;

  categories.forEach(category => {
    html += `<option value="${category}">${category}</option>`;
  });

  html += `
  </select>
`;

  data.forEach(row => {
    html += `
  <div class="item" data-category="${row.category || ""}">
    <div class="category">${row.category || ""}</div>
    <div class="question">Q. ${row.question || row.keyword || ""}</div>
    <div class="answer">${row.answer || ""}</div>
    ${row.imageUrl ? `<img src="${row.imageUrl}">` : ""}
  </div>
`;
  });

  html += `
  <script>
    function filterCategory() {
      const selected = document.getElementById("categoryFilter").value;
      const items = document.querySelectorAll(".item");

      items.forEach(item => {
        const category = item.getAttribute("data-category");

        if (selected === "전체" || category === selected) {
          item.style.display = "block";
        } else {
          item.style.display = "none";
        }
      });
    }
  </script>
</body>
</html>
`;

  return html;
}
