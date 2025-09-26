#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ErrorCode, ListResourcesRequestSchema, ListToolsRequestSchema, McpError, ReadResourceRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as url from 'url';
import { exec } from 'child_process';
// 環境変数からパスを取得するか、デフォルト値を使用
const OAUTH_PATH = process.env.GDRIVE_OAUTH_PATH || path.join(process.cwd(), 'gcp-oauth.keys.json');
const CREDENTIALS_PATH = process.env.GDRIVE_CREDENTIALS_PATH || path.join(process.cwd(), '.gdrive-server-credentials.json');
// OAuth2クライアントの設定
const getOAuth2Client = () => {
    try {
        const credentials = JSON.parse(fs.readFileSync(OAUTH_PATH, 'utf8'));
        const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
        // 保存された認証情報があれば読み込む
        if (fs.existsSync(CREDENTIALS_PATH)) {
            const token = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
            oAuth2Client.setCredentials(token);
        }
        return oAuth2Client;
    }
    catch (error) {
        console.error('OAuth2クライアントの設定中にエラーが発生しました:', error);
        throw error;
    }
};
// 認証フローを実行
const authenticate = async () => {
    const oAuth2Client = getOAuth2Client();
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    console.log('以下のURLを開いて認証を行ってください:');
    console.log(authUrl);
    // ローカルサーバーを起動して認証コードを受け取る
    const server = http.createServer(async (req, res) => {
        try {
            const parsedUrl = url.parse(req.url || '', true);
            const code = parsedUrl.query.code;
            if (code) {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end('<h1>認証が完了しました。このウィンドウを閉じてください。</h1>');
                // トークンを取得して保存
                const { tokens } = await oAuth2Client.getToken(code);
                oAuth2Client.setCredentials(tokens);
                fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify(tokens));
                console.log('認証情報が保存されました:', CREDENTIALS_PATH);
                server.close();
                process.exit(0);
            }
            else {
                res.writeHead(400, { 'Content-Type': 'text/html' });
                res.end('<h1>認証コードが見つかりませんでした。もう一度お試しください。</h1>');
            }
        }
        catch (error) {
            console.error('認証処理中にエラーが発生しました:', error);
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.end('<h1>認証中にエラーが発生しました。</h1>');
        }
    });
    server.listen(3000, () => {
        console.log('認証サーバーが起動しました。ポート: 3000');
        // ブラウザを開く
        const openCommand = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
        exec(`${openCommand} "${authUrl}"`);
    });
};
// ファイルのMIMEタイプに基づいてエクスポート形式を決定
const getExportMimeType = (mimeType) => {
    const exportMap = {
        'application/vnd.google-apps.document': 'text/markdown',
        'application/vnd.google-apps.spreadsheet': 'text/csv',
        'application/vnd.google-apps.presentation': 'text/plain',
        'application/vnd.google-apps.drawing': 'image/png',
    };
    return exportMap[mimeType] || null;
};
class GDriveServer {
    constructor() {
        this.server = new Server({
            name: 'gdrive-server',
            version: '0.1.0',
        }, {
            capabilities: {
                resources: {},
                tools: {},
            },
        });
        try {
            // 認証情報がない場合でもデモモードで動作するように修正
            let auth;
            try {
                auth = getOAuth2Client();
            }
            catch (e) {
                console.error('OAuth認証情報の読み込みに失敗しました。デモモードで動作します:', e);
                // APIキーなしでドライブクライアントを初期化
                auth = new google.auth.GoogleAuth({
                    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
                });
            }
            this.drive = google.drive({ version: 'v3', auth });
        }
        catch (error) {
            console.error('Google Driveクライアントの初期化中にエラーが発生しました:', error);
            throw error;
        }
        this.setupResourceHandlers();
        this.setupToolHandlers();
        // エラーハンドリング
        this.server.onerror = (error) => console.error('[MCP Error]', error);
        process.on('SIGINT', async () => {
            await this.server.close();
            process.exit(0);
        });
    }
    setupResourceHandlers() {
        // リソース一覧を提供
        this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
            resources: [], // 動的なリソースのため、空のリストを返す
        }));
        // リソース読み取り
        this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
            const match = request.params.uri.match(/^gdrive:\/\/\/(.+)$/);
            if (!match) {
                throw new McpError(ErrorCode.InvalidRequest, `無効なURIフォーマット: ${request.params.uri}`);
            }
            const fileId = match[1];
            try {
                // ファイルのメタデータを取得
                const fileMetadata = await this.drive.files.get({
                    fileId,
                    fields: 'name,mimeType',
                });
                const mimeType = fileMetadata.data.mimeType;
                let content;
                let responseMimeType;
                // Google Workspaceファイルの場合はエクスポート
                const exportMimeType = getExportMimeType(mimeType || '');
                if (exportMimeType) {
                    const exportResponse = await this.drive.files.export({
                        fileId,
                        mimeType: exportMimeType,
                    }, { responseType: 'arraybuffer' });
                    content = Buffer.from(exportResponse.data);
                    responseMimeType = exportMimeType;
                }
                else {
                    // 通常のファイルの場合はダウンロード
                    const fileResponse = await this.drive.files.get({
                        fileId,
                        alt: 'media',
                    }, { responseType: 'arraybuffer' });
                    content = Buffer.from(fileResponse.data);
                    responseMimeType = mimeType || 'application/octet-stream';
                }
                // テキストベースのファイルの場合は文字列に変換
                const isTextBased = responseMimeType.startsWith('text/') ||
                    responseMimeType === 'application/json' ||
                    responseMimeType === 'application/xml';
                return {
                    contents: [
                        {
                            uri: request.params.uri,
                            mimeType: responseMimeType,
                            text: isTextBased ? content.toString('utf8') : content.toString('base64'),
                            isBase64Encoded: !isTextBased,
                        },
                    ],
                };
            }
            catch (error) {
                console.error('ファイル取得中にエラーが発生しました:', error);
                throw new McpError(ErrorCode.InternalError, `Google Drive APIエラー: ${error.message}`);
            }
        });
    }
    setupToolHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: 'search',
                    description: 'Google Driveでファイルを検索',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            query: {
                                type: 'string',
                                description: '検索クエリ',
                            },
                        },
                        required: ['query'],
                    },
                },
            ],
        }));
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            if (request.params.name !== 'search') {
                throw new McpError(ErrorCode.MethodNotFound, `不明なツール: ${request.params.name}`);
            }
            const { query } = request.params.arguments;
            if (!query) {
                throw new McpError(ErrorCode.InvalidParams, '検索クエリが指定されていません');
            }
            try {
                const response = await this.drive.files.list({
                    q: query,
                    fields: 'files(id, name, mimeType)',
                    pageSize: 20,
                });
                const files = response.data.files || [];
                const formattedResults = files.map((file) => ({
                    id: file.id,
                    name: file.name,
                    mimeType: file.mimeType,
                    uri: `gdrive:///${file.id}`,
                }));
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(formattedResults, null, 2),
                        },
                    ],
                };
            }
            catch (error) {
                console.error('ファイル検索中にエラーが発生しました:', error);
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Google Drive APIエラー: ${error.message}`,
                        },
                    ],
                    isError: true,
                };
            }
        });
    }
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('Google Drive MCPサーバーがstdioで実行中');
    }
}
// メイン処理
if (process.argv.includes('auth')) {
    authenticate().catch(console.error);
}
else {
    const server = new GDriveServer();
    server.run().catch(console.error);
}
