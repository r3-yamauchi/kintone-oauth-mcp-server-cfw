# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

これは、Cloudflare Workers上にデプロイされる、kintone OAuth認証を備えたModel Context Protocol (MCP)サーバーです。MCPクライアントに対してはOAuthサーバーとして、kintoneに対してはOAuthクライアントとして動作します。

### プロジェクトの起源

このプロジェクトは、CloudflareのGitHub OAuthテンプレートから作成されました：
```bash
npm create cloudflare@latest -- kintone-oauth-mcp-server-cfw --template=cloudflare/ai/demos/remote-mcp-github-oauth
```

元のテンプレート（https://developers.cloudflare.com/agents/guides/remote-mcp-server/ に記載）はGitHub OAuth統合を提供していました。これを**Cybozu/kintone OAuth**を使用するように変更し、認証フローと設定に大幅な変更を加えています。

## 開発コマンド

### ローカル開発
```bash
npm install              # 依存関係のインストール
npm run dev             # ポート8788でHTTPSを有効にしたローカル開発サーバーを起動
npm run type-check      # TypeScriptの型チェック
```

**注意**: `npm run dev`コマンドは、Cybozu OAuthで必要とされるHTTPSを自動的に有効にして実行されます（`--local-protocol https`）。

### デプロイ
```bash
npm run deploy          # Cloudflare Workersへのデプロイ
npm run cf-typegen      # Cloudflareの型を生成
```

### シークレットの設定（本番環境）
```bash
wrangler secret put CYBOZU_CLIENT_ID
wrangler secret put CYBOZU_CLIENT_SECRET
wrangler secret put CYBOZU_SUBDOMAIN
wrangler secret put COOKIE_ENCRYPTION_KEY
```

### KVネームスペースのセットアップ
```bash
wrangler kv:namespace create "OAUTH_KV"  # KVネームスペースを作成
# 生成されたKV IDをwrangler.jsoncに更新
```

## アーキテクチャ

### コアコンポーネント

1. **OAuthプロバイダー** (`@cloudflare/workers-oauth-provider`)
   - 二重OAuthフローを処理（サーバーからクライアント、クライアントからkintone）
   - トークンの発行と検証を管理
   - KVストレージに認証状態を保存

2. **MCPサーバー** (`src/index.ts`)
   - `agents/mcp`から`McpAgent`を拡張
   - 利用可能なツール（getRecords、addRecord、getApp）を定義
   - プロップスコンテキストには以下が含まれる：login、name、email、accessToken、subdomain

3. **kintone OAuthハンドラー** (`src/cybozu-handler.ts`)
   - kintoneとの認証フローを管理
   - approve/callbackエンドポイントを処理
   - コードをアクセストークンと交換
   - OAuthトークンにユーザーメタデータを保存
   - kintone固有のOAuth要件を実装

4. **設定** (`wrangler.jsonc`)
   - MCP永続化のためのDurable Objectsバインディング
   - OAuth状態ストレージのためのKVネームスペース
   - 画像生成のためのAIバインディング
   - OAuth資格情報のための環境変数（CYBOZU_*）

### 認証フロー
1. MCPクライアントが`/sse`エンドポイントに接続
2. ユーザーが承認のため`/authorize`にリダイレクト
3. 承認後、kintone OAuthにリダイレクト（`https://{subdomain}.cybozu.com/oauth2/authorization`）
4. kintoneが認証コードとともに`/callback`にコールバック
5. kintoneトークンエンドポイントでコードをアクセストークンと交換
6. OAuthトークンのプロップスにユーザーデータを保存
7. クライアントが認証済み接続を受信

### 主要ファイル
- `src/index.ts` - メインMCPサーバーとツール定義
- `src/cybozu-handler.ts` - kintone OAuthフローハンドラー
- `src/utils.ts` - OAuthユーティリティ関数（kintone用に変更）
- `src/workers-oauth-utils.ts` - OAuth UI/承認ヘルパー

### kintone OAuth固有の事項

kintone OAuthを扱う際：
1. **エンドポイント**: `https://{subdomain}.cybozu.com/oauth2/authorization`と`/oauth2/token`を使用
2. **認証**: 資格情報はBasic Authヘッダーではなく、リクエストボディに含める
3. **スコープ**: `k:app_record:read`のようなkintone固有のスコープを使用
4. **リダイレクトURI**: Cybozu Developer Networkに登録されたものと完全に一致する必要がある

### よくある問題
- **401エラー**: 通常、クライアント資格情報が正しくないか、リダイレクトURIの不一致を意味する
- **トークン交換**: kintoneは`grant_type=authorization_code`とともにリクエストボディに資格情報を期待する

## 利用可能なMCPツール

1. **getRecords** - kintoneアプリからレコードを取得
   - 必須パラメータ: `appId`
   - オプション: `fields`、`query`、`totalCount`

2. **addRecord** - kintoneアプリに新しいレコードを追加
   - 必須パラメータ: `appId`、`record`

3. **getApp** - アプリ情報とフィールド定義を取得
   - 必須パラメータ: `appId`

4. **searchApps** - アプリ名で検索して複数のアプリ情報を取得
   - 必須パラメータ: `name` (アプリ名の一部でも検索可能)
   - オプション: `limit` (最大100、デフォルト100)、`offset` (スキップ数、デフォルト0)