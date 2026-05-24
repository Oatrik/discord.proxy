const CLIENT_ID = "TVOJE_CLIENT_ID";
const CLIENT_SECRET = "TVOJ_CLIENT_SECRET";
const ROLE_ID = "TVOJA_ROLE_ID";
const SERVER_ID = "TVOJ_SERVER_ID";
const REDIRECT_URI = "http://localhost:7842/callback";

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname !== "/exchange") {
      return new Response("Not found", { status: 404 });
    }

    const code = url.searchParams.get("code");
    if (!code) {
      return new Response(JSON.stringify({ error: "Missing code" }), { status: 400 });
    }

    try {
      // Vymení code za token
      const tokenResp = await fetch("https://discord.com/api/v10/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          grant_type: "authorization_code",
          code: code,
          redirect_uri: REDIRECT_URI,
        }),
      });
      const tokenData = await tokenResp.json();
      const accessToken = tokenData.access_token;

      if (!accessToken) {
        return new Response(JSON.stringify({ error: "Token failed", data: tokenData }), { status: 200 });
      }

      // Zisti username a avatar
      const userResp = await fetch("https://discord.com/api/v10/users/@me", {
        headers: { Authorization: "Bearer " + accessToken },
      });
      const userData = await userResp.json();
      const username = userData.username || "Unknown";
      const userId = userData.id || "";
      const avatar = userData.avatar || "";

      // Skontroluj rolu
      const memberResp = await fetch(
        `https://discord.com/api/v10/users/@me/guilds/${SERVER_ID}/member`,
        { headers: { Authorization: "Bearer " + accessToken } }
      );
      const memberData = await memberResp.json();
      const hasRole = Array.isArray(memberData.roles) && memberData.roles.includes(ROLE_ID);

      return new Response(
        JSON.stringify({
          token: accessToken,
          username: username,
          has_role: hasRole,
          user_id: userId,
          avatar: avatar,
        }),
        { headers: { "Content-Type": "application/json" } }
      );

    } catch (e) {
      return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
    }
  }
};