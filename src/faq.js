import { escapeHtml, safeImageUrl } from "./utils.js";

// 전체 FAQ 페이지 생성
export function createHtml(data) {

  const categories = [...new Set(
    data
      .map(row => row.category)
      .filter(v => v)
  )];

  let html = `
<!DOCTYPE html>
<html lang="ko">
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
      border-radius: 20px;
      padding: 3px 8px;
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

  <select id="categoryFilter"
          aria-label="카테고리 선택"
          onchange="filterCategory()">

    <option value="전체">전체</option>

`;

  categories.forEach(category => {

    html += `
      <option value="${escapeHtml(category)}">
        ${escapeHtml(category)}
      </option>
    `;
  });

  html += `
    </select>
  `;

  data.forEach(row => {

    const imageUrl = safeImageUrl(row.imageUrl);

    html += `

      <div class="item"
           data-category="${escapeHtml(row.category)}">

        <div class="category">
          ${escapeHtml(row.category)}
        </div>

        <div class="question">
          Q. ${escapeHtml(row.question || row.keyword)}
        </div>

        <div class="answer">${escapeHtml(row.answer)}</div>

        ${imageUrl
          ? `<img src="${escapeHtml(imageUrl)}" alt="FAQ 관련 안내 이미지" loading="lazy">`
          : ""}

      </div>
    `;
  });

  html += `

  <script>

    function filterCategory() {

      const selected =
        document.getElementById("categoryFilter").value;

      const items =
        document.querySelectorAll(".item");

      items.forEach(item => {

        const category =
          item.getAttribute("data-category");

        if (
          selected === "전체" ||
          category === selected
        ) {

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
