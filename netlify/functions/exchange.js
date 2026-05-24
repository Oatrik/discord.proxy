const https = require('https');

const CLIENT_ID = "1508099085087801486";
const CLIENT_SECRET = "_ACucwq3VxfAVvcLviJ-BQqDHHXOq_Q3";
const ROLE_ID = "1483751118461992981";
const SERVER_ID = "1483721115426885735";
const REDIRECT_URI = "http://localhost:7842/callback";

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

exports.handler = async (event) => {
    const code = event.queryStringParameters && event.queryStringParameters.code;

    if (!code) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing code' }) };
    }

    try {
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
            return { statusCode: 200, body: JSON.stringify({ error: 'Token failed: ' + tokenResp }) };
        }

        const userResp = await httpsGet({
            hostname: 'discord.com',
            path: '/api/v10/users/@me',
            headers: { 'Authorization': 'Bearer ' + accessToken }
        });
        const userData = JSON.parse(userResp);
        const username = userData.username || 'Unknown';

        const memberResp = await httpsGet({
            hostname: 'discord.com',
            path: `/api/v10/users/@me/guilds/${SERVER_ID}/member`,
            headers: { 'Authorization': 'Bearer ' + accessToken }
        });
        const memberData = JSON.parse(memberResp);
        const hasRole = Array.isArray(memberData.roles) && memberData.roles.includes(ROLE_ID);

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: accessToken, username: username, has_role: hasRole })
        };

    } catch (e) {
        return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
    }
};
