const https = require('https');
const http = require('http');
const url = require('url');

const CLIENT_ID = '1508099085087801486';
const CLIENT_SECRET = '_ACucwq3VxfAVvcLviJ-BQqDHHXOq_Q3'; // toto zostane len na serveri
const ROLE_ID = '1483751118461992981';
const SERVER_ID = '1483721115426885735';
const REDIRECT_URI = 'http://localhost:7842/callback';

function httpsGet(options) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        });
        req.on('error', reject);
        req.end();
    });
}

function httpsPost(options, body) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

const server = http.createServer(async (req, res) => {
    const parsed = url.parse(req.url, true);

    if (parsed.pathname !== '/exchange') {
        res.writeHead(404);
        res.end('Not found');
        return;
    }

    const code = parsed.query.code;
    const hwid = parsed.query.hwid || '';

    if (!code) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Missing code' }));
        return;
    }

    try {
        // Vymení code za token
        const tokenBody = new URLSearchParams({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: REDIRECT_URI
        }).toString();

        const tokenResp = await httpsPost({
            hostname: 'discord.com',
            path: '/api/v10/oauth2/token',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(tokenBody)
            }
        }, tokenBody);

        const tokenData = JSON.parse(tokenResp);
        const accessToken = tokenData.access_token;

        if (!accessToken) {
            res.writeHead(200);
            res.end(JSON.stringify({ error: 'Token exchange failed: ' + tokenResp }));
            return;
        }

        // Zisti username
        const userResp = await httpsGet({
            hostname: 'discord.com',
            path: '/api/v10/users/@me',
            headers: { 'Authorization': 'Bearer ' + accessToken }
        });
        const userData = JSON.parse(userResp);
        const username = userData.username || 'Unknown';

        // Skontroluj rolu
        const memberResp = await httpsGet({
            hostname: 'discord.com',
            path: `/api/v10/users/@me/guilds/${SERVER_ID}/member`,
            headers: { 'Authorization': 'Bearer ' + accessToken }
        });
        const memberData = JSON.parse(memberResp);
        const hasRole = memberData.roles && memberData.roles.includes(ROLE_ID);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            token: accessToken,
            username: username,
            has_role: hasRole
        }));

    } catch (e) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: e.message }));
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Proxy running on port ' + PORT));