export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") {
      return Response.json({
        status: "ok"
      });
    }

    if (request.method === "POST" && url.pathname === "/skill") {
      const body = await request.json();

      console.log(JSON.stringify(body, null, 2));

      return Response.json({
        version: "2.0",
        template: {
          outputs: [
            {
              simpleText: {
                text: "카카오 스킬 호출 성공"
              }
            }
          ]
        }
      });
    }

    return Response.json(
      { error: "Not Found" },
      { status: 404 }
    );
  }
};
