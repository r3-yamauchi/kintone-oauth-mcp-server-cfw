# リモート Model Context Protocol (MCP) サーバー for kintone via OAuth on Cloudflare Workers

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/r3-yamauchi/kintone-oauth-mcp-server-cfw)

これは Cloudflare Workers として deploy可能な [kintone](https://kintone.cybozu.co.jp/) 用の [Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction) サーバーのサンプルコードです。

プログラムをローカルにセットアップする必要がなく、Webブラウザー版の Claude からも使用することができます。

OAuth認証により、APIキーなどの機密情報をローカルに保存することなく、安全にkintoneとの連携を実現します。
一度デプロイすれば、同じcybozu.comドメインを使用する全てのユーザーが共有して利用できます。

## 🚀 対応確認済みプラットフォーム

- [Claude Web版](https://claude.ai/settings/integrations)
- [Claude Desktop](https://claude.ai/download) (macOS/Windows)
- [Postman](https://www.postman.com/)
- [Cloudflare AI Playground](https://playground.ai.cloudflare.com/)
- [ChatGPT Web版](https://platform.openai.com/docs/guides/developer-mode)

2025年9月11日現在 [ChatGPT Web版](https://platform.openai.com/docs/guides/developer-mode) においては ChatGPT の Pro または Plus アカウントで 設定 → コネクタ→ 詳細設定 → 開発者モード を有効にすることにより ベータ版として利用できるという状況のようです。

## 📋 必要な環境

- Cloudflareアカウント
- cybozu.comドメインの管理者権限（OAuthクライアント作成用）
- Node.js 18以上
- Wrangler CLI

## 🔧 セットアップ手順

### 1. cybozu.com共通管理でOAuthクライアントを作成

[Cybozuの公式ドキュメント](https://cybozu.dev/ja/common/docs/oauth-client/add-client/)に従ってOAuthクライアントを追加します。

**設定項目：**
- **クライアント名**: 分かりやすい名前（例：「kintone MCP Server」）
- **リダイレクトエンドポイント**: 一時的に `https://localhost:8788/callback` を設定
- **スコープ**: 以下を選択
  - `k:app_record:read` - レコード読み取り
  - `k:app_record:write` - レコード書き込み
  - `k:app_settings:read` - アプリ設定読み取り
  - `k:app_settings:write` - アプリ設定書き込み
  - `k:file:read` - ファイル読み取り
  - `k:file:write` - ファイル書き込み

<!-- markdownlint-disable MD033 -->
<img height="400" src="png/kintone-oauth-mcp-server-cfw1.png" alt="OAuthクライアントを追加" />
<!-- markdownlint-enable MD033 -->

- 保存後に表示される「クライアントID」と「クライアントシークレット」を控えておきます。
- OAuthクライアントの「利用者の設定」で、この MCP Server を利用させるユーザーを指定してください。

### 2. プロジェクトのセットアップ

```bash
# リポジトリのクローン
git clone https://github.com/r3-yamauchi/kintone-oauth-mcp-server-cfw.git
cd kintone-oauth-mcp-server-cfw

# 依存関係のインストール
npm install
```

### 3. 環境変数の設定

- OAuthクライアントを作成した際に控えた値を Wranglerの設定ファイル（ `wrangler.jsonc` ）内に記入します。：

```json
"vars": {
   "CYBOZU_CLIENT_ID": "<your cybozu.com client id>",
   "CYBOZU_CLIENT_SECRET": "<your cybozu.com client secret>",
   "CYBOZU_SUBDOMAIN": "<your cybozu.com sub domain>", # your cybozu.com subdomain
   "COOKIE_ENCRYPTION_KEY": "<your cookie encryption key>", # add any random string here e.g. openssl rand -hex 32
   "WORKER_URL": "<your worker url>"
},
```

### 4. KV名前空間の作成

- wrangler CLI で以下を実行して KV名前空間を作成します。:

`wrangler kv:namespace create "OAUTH_KV"`

- Wranglerの設定ファイル（wrangler.jsonc）内の `<your cloudflare kv id>` 欄に、作成された KV の ID を記入してください。

- 以下のコマンドを実行して Cloudflare Workers へ deploy してください。

`wrangler deploy`

- deploy が完了したら Workers の URL を cybozu.com共通管理画面の OAuthクライアントの「リダイレクトエンドポイント」欄にセットし、末尾に `/callback` を付けてください。 `https://<your-subdomain>.workers.dev/callback` と入力することになります。

### Claude WebアプリからリモートMCPサーバーにアクセス

- [Claude Webアプリのインテグレーション管理画面](https://claude.ai/settings/integrations) にアクセスし
「インテグレーションを追加」をクリックします。

- 「連携名」は MCP Server を識別する際の名前になるので、分かりやすいものを付けます。

- 「連携URL」に `https://<your-subdomain>.workers.dev/sse` と入力してください。

<!-- markdownlint-disable MD033 -->
<img height="400" src="png/kintone-oauth-mcp-server-cfw2.png" alt="インテグレーションを追加" />
<!-- markdownlint-enable MD033 -->

- 「追加」ボタンをクリックしたのち、「連携/連携させる」をクリックします。 OAuthの確認画面が表示されるので「Approve」「許可」をクリックします。

<!-- markdownlint-disable MD033 -->
<img height="400" src="png/kintone-oauth-mcp-server-cfw3.png" alt="OAuthクライアントを追加" />
<!-- markdownlint-enable MD033 -->

<!-- markdownlint-disable MD033 -->
<img height="400" src="png/kintone-oauth-mcp-server-cfw4.png" alt="OAuthクライアントを追加" />
<!-- markdownlint-enable MD033 -->

- Claude WebアプリからリモートMCPサーバーを利用できるようになります。

<!-- markdownlint-disable MD033 -->
<img height="400" src="png/kintone-oauth-mcp-server-cfw5.png" alt="OAuthクライアントを追加" />
<!-- markdownlint-enable MD033 -->

### Claude DesktopからリモートMCPサーバーにアクセス

Claude Desktopで、Settings -> Developer -> Edit Configを開き、以下の設定を追加。Claude Desktopを再起動すると、OAuthログイン画面が表示され、認証フローを完了するとClaudeがMCPサーバーにアクセスできるようになります。

```json
{
  "mcpServers": {
    "kintone": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://<your-subdomain>.workers.dev/sse"
      ]
    }
  }
}
```

## 解説

### 🎯 これは何をするものか

AIアシスタント（Claudeなど）がkintoneのAPIに安全にアクセスできるようにするサーバーです。

Cloudflare Workers上で動作し、認証情報をローカルに保存することなく、OAuth認証を通じてkintoneとの連携を実現します。

### 🔧 主な機能

#### 1. 利用可能なツール（全28ツール）

**レコード操作**
- getRecords - レコード一覧を取得
- getRecord - 単一レコードを取得
- addRecord - レコードを追加
- addRecords - 複数レコードを一括追加
- updateRecord - レコードを更新
- getRecordComments - レコードのコメントを取得
- addRecordComment - レコードにコメントを投稿
- evaluateRecordsAcl - レコードのアクセス権を評価

**アプリ設定**
- getApp - アプリ基本情報を取得
- getAppFields - フィールド一覧を取得
- searchApps - アプリを検索
- getAppSettings - アプリの一般設定を取得
- getFormLayout - フォームレイアウトを取得
- getViews - 一覧（ビュー）設定を取得
- getProcessManagement - プロセス管理設定を取得
- getAppReports - グラフ設定を取得
- getAppCustomize - JavaScript/CSSカスタマイズ設定を取得
- getAppActions - アクション設定を取得

**ファイル操作**
- uploadFile - ファイルアップロード
- downloadFile - ファイルダウンロード

**アクセス権**
- getAppAcl - アプリのアクセス権を取得
- getRecordAcl - レコードのアクセス権設定を取得
- getFieldAcl - フィールドのアクセス権を取得

**通知設定**
- getAppNotificationsGeneral - アプリの条件通知を取得
- getAppNotificationsPerRecord - レコードの条件通知を取得
- getAppNotificationsReminder - リマインダー通知を取得

**デプロイ管理**
- updateAppCustomize - JavaScript/CSSカスタマイズを更新
- deployApp - アプリ設定を運用環境へ反映

#### 2. 二重OAuth認証

- MCPクライアント（Claude）との認証
- kintone/Cybozuアカウントとの認証

#### 3. 認証フロー

1. MCPクライアントが接続
2. ユーザーが承認画面で許可
3. kintoneのOAuth画面へリダイレクト
4. kintoneでの認証完了後、アクセストークンを取得
5. 安全な接続が確立

### 🏗️ アーキテクチャ

- Cloudflare Workers - サーバーレスでスケーラブル
- KV Storage - OAuth状態の永続化
- 暗号化されたCookie - 承認済みクライアントの記憶

### 💡 メリット

1. セキュア - APIキーの共有不要
2. マルチユーザー対応 - 1つのデプロイで複数ユーザーが利用可能
3. ブラウザ/デスクトップ対応 - Claude WebやClaude Desktopから利用可能
4. コスト効率 - サーバーレスで必要な時だけ実行

このプロジェクトは、GitHubのOAuthテンプレートをベースに、kintone専用にカスタマイズされた本格的なMCPサーバー実装となっています。

## このプロジェクトの由来

このプロジェクトは、もともとCloudflareのGitHub OAuthテンプレートを使用して作成されました：

```bash
npm create cloudflare@latest -- kintone-oauth-mcp-server-cfw --template=cloudflare/ai/demos/remote-mcp-github-oauth
```

このテンプレート（[CloudflareのRemote MCP Serverガイド](https://developers.cloudflare.com/agents/guides/remote-mcp-server/)で説明あり）は、OAuth認証を備えたMCPサーバーの構築基盤を提供します。本プロジェクトでは、このテンプレートを Cybozu/kintone OAuth 用に改修し、CybozuのOAuth 2.0実装に対応した認証フローを実現しています。

## 元のテンプレートからの主な変更点

GitHub OAuthテンプレートをkintoneに対応させるため、以下の変更を行いました：

1. **OAuthハンドラー**: `src/cybozu-handler.ts` を新規作成し、kintoneのOAuthフローを処理（ `github-handler.ts` を置き換え）
2. **OAuthエンドポイント**: Cybozu OAuthのエンドポイントに変更：
   - 認可: `https://{subdomain}.cybozu.com/oauth2/authorization`
   - トークン: `https://{subdomain}.cybozu.com/oauth2/token`
3. **認証方式**: kintoneのOAuth 2.0仕様に合わせ（クレデンシャルはリクエストボディに含める）
4. **環境変数**: GitHub用からkintone用に変更：
   - `GITHUB_CLIENT_ID` → `CYBOZU_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET` → `CYBOZU_CLIENT_SECRET`
   - `CYBOZU_SUBDOMAIN` を追加（kintoneのサブドメイン用）
5. **スコープ**: kintone APIのスコープを使用
   - `k:app_record:read` - レコード読み取り権限
   - `k:app_record:write` - レコード書き込み権限
   - `k:app_settings:read` - アプリ設定読み取り権限
   - `k:app_settings:write` - アプリ設定書き込み権限（カスタマイズ更新用）
   - `k:file:read` - ファイル読み取り権限
   - `k:file:write` - ファイル書き込み権限

## ローカル開発とテスト

HTTPSを有効にしてサーバーを起動:

```bash
wrangler dev --local-protocol https
```

Inspectorで `https://localhost:8788/sse` に接続してテスト。

**注意**: 初回アクセス時には、ブラウザで自己署名証明書の警告を受け入れる必要があります。

## OAuth設定トラブルシューティング

### 401エラーが発生する場合

以下の点を確認してください：

1. **Cybozu Developer Networkでの設定**
   - リダイレクトURIが完全一致していることを確認
     - 本番環境: `https://<your-subdomain>.workers.dev/callback`
     - 開発環境: `https://localhost:8788/callback`
   - OAuthアプリケーションが「有効」になっている
   - client_idとclient_secretが正しくコピーされている
   - 必要なスコープが設定されている: `k:app_record:read k:app_record:write k:app_settings:read k:app_settings:write k:file:read k:file:write`

2. **環境変数の確認**

   ```bash
   # .dev.varsファイルまたはwrangler secretsで以下を確認
   CYBOZU_CLIENT_ID=<your-client-id>
   CYBOZU_CLIENT_SECRET=<your-client-secret>
   CYBOZU_SUBDOMAIN=<your-subdomain>
   COOKIE_ENCRYPTION_KEY=<random-32-char-string>
   ```

3. **ログの確認**
   開発サーバー起動時のコンソールで以下を確認：
   - `OAuth Callback Received` - コールバックが正しく受信されているか
   - `Starting Token Exchange` - トークン交換が開始されているか
   - エラーレスポンスの詳細内容

4. **kintone OAuth仕様**
   - 認可エンドポイント: `https://{subdomain}.cybozu.com/oauth2/authorization`
   - トークンエンドポイント: `https://{subdomain}.cybozu.com/oauth2/token`
   - 認証方式: リクエストボディにclient_idとclient_secretを含める
   - レスポンス形式: JSON

5. **デバッグモード**
   詳細なログを確認するには、開発サーバーを起動して実行できます：

   ```bash
   npm run dev
   ```

## 仕組みの概要

### OAuthプロバイダー

OAuth Providerライブラリは、Cloudflare Workers向けのOAuth 2.1サーバー実装です。
このライブラリがOAuthフロー全体（トークン発行、検証、管理）を担当しています。具体的には：

- MCPクライアントの認証
- kintone OAuthサービスへの接続管理
- KVストレージでのトークン・認証状態の安全な保存

### MCP Remote

MCP Remoteライブラリは、サーバーがクライアントにツールを提供できるようにします：

- クライアントとサーバー間の通信プロトコルを定義
- ツールの定義方法を提供
- リクエスト/レスポンスのシリアライズ・デシリアライズを管理
- クライアントとサーバー間のServer-Sent Events (SSE)接続を維持

## MCP Server を使用するリスク

他人が作成・実装した MCP server を使用する際には一定のリスクがあることを必ず念頭において利用してください。

- [kintone AIラボ と kintone用 MCP Server の現在地](https://www.r3it.com/blog/kintone-ai-lab-20250501-yamauchi)

**「kintone」はサイボウズ株式会社の登録商標です。**

ここに記載している内容は情報提供を目的としており、個別のサポートはできません。
設定内容についてのご質問やご自身の環境で動作しないといったお問い合わせをいただいても対応はできませんので、ご了承ください。
