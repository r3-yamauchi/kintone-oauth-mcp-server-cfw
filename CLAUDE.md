# CLAUDE.md

このファイルは、Claude Code（claude.ai/code）がこのリポジトリ内のコードを扱う際のガイダンスを提供します。

## プロジェクト概要

Cloudflare Workers上で動作する、kintone OAuth認証を備えたModel Context Protocol (MCP)サーバーです。MCPクライアントに対してはOAuthサーバーとして、kintoneに対してはOAuthクライアントとして動作します。

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
   - 利用可能なツール（getRecords、addRecord、getApp等）を定義
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

### ファイル構造とアーキテクチャ

#### ディレクトリ構造

```
src/
├── index.ts              # MCPサーバーのエントリーポイント（MyMCPクラス定義とOAuthProvider設定）
├── cybozu-handler.ts     # kintone OAuthフローハンドラー
├── utils.ts              # OAuthユーティリティ関数（kintone用に変更）
├── workers-oauth-utils.ts # OAuth UI/承認ヘルパー
├── types/                # 型定義
│   ├── index.ts         # 型定義のエクスポート
│   ├── kintone.ts       # kintone API関連の型（KintoneErrorResponse、KintoneRecord等）
│   └── mcp.ts           # MCP関連の型（Props）
└── tools/               # MCPツール実装
    ├── index.ts         # registerTools関数（全ツールの登録）
    ├── records.ts       # レコード操作ツール（CRUD操作、コメント、アクセス権評価）
    ├── apps.ts          # アプリ設定・情報ツール（設定、レイアウト、ビュー、グラフ等）
    ├── files.ts         # ファイル操作ツール（アップロード、ダウンロード）
    ├── acl.ts           # アクセス権管理ツール（アプリ、レコード、フィールド）
    ├── notifications.ts # 通知設定ツール（条件通知、リマインダー）
    └── deploy.ts        # デプロイ管理ツール（カスタマイズ更新、デプロイ実行）
```

#### ツールの実装パターン

各ツールは以下のパターンで実装されています：

1. **スキーマ定義**（Zodを使用）

```typescript
export const getRecordSchema = z.object({
  appId: z.union([z.number(), z.string()]).describe("The kintone app ID"),
  id: z.union([z.number(), z.string()]).describe("The record ID")
});
```

2. **実装関数**

```typescript
async getRecord(params: z.infer<typeof getRecordSchema>, props: { subdomain: string; accessToken: string }) {
  // 実装
}
```

3. **ツール登録**（`tools/index.ts`）

```typescript
server.tool(
  "getRecord",
  "Get a single record from a kintone app by ID",
  getRecordSchema.shape,
  async (params) => recordTools.getRecord(params, props)
);
```

#### Zodの使用目的

- MCPツールのパラメータスキーマ定義とバリデーション
- TypeScriptの型推論（`z.infer`）による型安全性
- パラメータの説明文（`.describe()`）によるドキュメント生成
- 実行時のパラメータ検証

### kintone OAuth固有の事項

kintone OAuthを扱う際：

1. **エンドポイント**: `https://{subdomain}.cybozu.com/oauth2/authorization`と`/oauth2/token`を使用
2. **認証**: 資格情報はBasic Authヘッダーではなく、リクエストボディに含める
3. **スコープ**: `k:app_record:read`のようなkintone固有のスコープを使用
4. **リダイレクトURI**: Cybozu Developer Networkに登録されたものと完全に一致する必要がある

### 必要なOAuthスコープ

現在設定されているスコープ（`src/cybozu-handler.ts`）:

- `k:app_record:read` - レコード読み取り
- `k:app_record:write` - レコード書き込み
- `k:app_settings:read` - アプリ設定読み取り
- `k:app_settings:write` - アプリ設定書き込み
- `k:file:read` - ファイル読み取り
- `k:file:write` - ファイル書き込み

**注意**: デプロイ管理関連のツール（deploy.ts）はプレビューAPIを使用しますが、専用のOAuthスコープは存在しません。これらのAPIは`k:app_settings:write`スコープでアクセス可能です。

### よくある問題

- **401エラー**: 通常、クライアント資格情報が正しくないか、リダイレクトURIの不一致を意味する
- **403エラー**: 必要なOAuthスコープが不足している
- **invalid_scope エラー**: 要求されたスコープが無効。kintoneのOAuthで利用可能なスコープは6つのみ（k:app_record:read/write、k:app_settings:read/write、k:file:read/write）
- **トークン交換**: kintoneは`grant_type=authorization_code`とともにリクエストボディに資格情報を期待する

## 利用可能なMCPツール（全28ツール）

### レコード操作（records.ts - 8ツール）

1. **getRecords** - レコード一覧を取得
   - 必須: `appId`
   - オプション: `fields`、`query`

2. **getRecord** - 単一レコードを取得
   - 必須: `appId`、`id`

3. **addRecord** - レコードを追加
   - 必須: `appId`、`record`

4. **addRecords** - 複数レコードを一括追加（最大100件）
   - 必須: `appId`、`records`

5. **updateRecord** - レコードを更新
   - 必須: `appId`、`id`、`record`
   - オプション: `revision`

6. **getRecordComments** - レコードのコメントを取得
   - 必須: `appId`、`recordId`
   - オプション: `order`、`offset`、`limit`

7. **addRecordComment** - レコードにコメントを投稿
   - 必須: `appId`、`recordId`、`comment`（text、mentions）

8. **evaluateRecordsAcl** - レコードのアクセス権を評価
   - 必須: `appId`、`ids`（レコードID配列）

### アプリ設定（apps.ts - 11ツール）

9. **getApp** - アプリ基本情報を取得
   - 必須: `appId`

10. **getAppFields** - フィールド一覧を取得
    - 必須: `appId`

11. **searchApps** - アプリを検索
    - 必須: `name`
    - オプション: `limit`、`offset`

12. **getAppSettings** - アプリの一般設定を取得
    - 必須: `appId`
    - オプション: `lang`

13. **getFormLayout** - フォームレイアウトを取得
    - 必須: `appId`

14. **getViews** - 一覧（ビュー）設定を取得
    - 必須: `appId`
    - オプション: `lang`

15. **getProcessManagement** - プロセス管理設定を取得
    - 必須: `appId`
    - オプション: `lang`

16. **getAppReports** - グラフ設定を取得
    - 必須: `appId`
    - オプション: `lang`

17. **getAppCustomize** - JavaScript/CSSカスタマイズ設定を取得
    - 必須: `appId`

18. **getAppActions** - アクション設定を取得
    - 必須: `appId`
    - オプション: `lang`

19. **getGeneralNotifications** - アプリ設定の一般通知を取得
    - 必須: `appId`

### ファイル操作（files.ts - 2ツール）

20. **uploadFile** - ファイルアップロード
    - 必須: `file`（name、content、contentType）

21. **downloadFile** - ファイルダウンロード
    - 必須: `fileKey`

### アクセス権（acl.ts - 3ツール）

22. **getAppAcl** - アプリのアクセス権を取得
    - 必須: `appId`

23. **getRecordAcl** - レコードのアクセス権設定を取得
    - 必須: `appId`

24. **getFieldAcl** - フィールドのアクセス権を取得
    - 必須: `appId`

### 通知設定（notifications.ts - 3ツール）

25. **getAppNotificationsGeneral** - アプリの条件通知を取得
    - 必須: `appId`

26. **getAppNotificationsPerRecord** - レコードの条件通知を取得
    - 必須: `appId`

27. **getAppNotificationsReminder** - リマインダー通知を取得
    - 必須: `appId`

### デプロイ管理（deploy.ts - 2ツール）

28. **updateAppCustomize** - JavaScript/CSSカスタマイズを更新（プレビュー）
    - 必須: `appId`
    - オプション: `desktop`、`mobile`、`scope`、`revision`

29. **deployApp** - アプリ設定を運用環境へ反映
    - 必須: `apps`（appとrevisionの配列）
    - オプション: `revert`

### APIエンドポイントのパターン

- 通常API: `https://{subdomain}.cybozu.com/k/v1/{resource}.json`
- プレビューAPI: `https://{subdomain}.cybozu.com/k/v1/preview/{resource}.json`
- GET操作: `X-HTTP-Method-Override: GET`ヘッダーを付けてPOST
- 更新操作: PUT/POSTメソッドを直接使用

### 実装上の注意点

1. **エラーハンドリング**: 全ツールで統一的なエラーレスポンス処理
2. **型安全性**: Zodスキーマによるパラメータ検証と型推論
3. **デバッグログ**: 開発時のトラブルシューティング用に詳細なログ出力
4. **レスポンス形式**: MCPプロトコルに準拠した`content`配列形式

## 重要な指示事項

### コード作成時の注意

- 要求されたことのみを実行し、それ以上でもそれ以下でもない
- 目的達成に絶対必要な場合を除き、新規ファイルを作成しない
- 既存ファイルの編集を常に優先する
- ユーザーから明示的に要求されない限り、ドキュメントファイル（*.md）やREADMEファイルを作成しない

### コードスタイル

- **重要**: ユーザーから要求されない限り、コメントを追加しない
- 既存のコード規約に従う
- 既存のライブラリとパターンを使用する
- セキュリティベストプラクティスに従う

### タスク管理

TodoWriteとTodoReadツールを頻繁に使用してタスクを管理し、進捗状況をユーザーに可視化する。これらのツールは以下の場合に特に有用：

- 複雑なタスクの計画
- 大きなタスクの細分化
- 進捗状況の追跡
- ユーザーへの可視性の提供

タスクが完了したらすぐに完了マークを付けることが重要。複数のタスクをまとめて完了マークを付けないこと。

### デバッグとテスト

開発時のトラブルシューティング：

1. **ログ出力の確認**
   ```bash
   wrangler tail  # 本番環境のログ
   # または開発サーバーのコンソール出力
   ```

2. **型チェック**
   ```bash
   npm run type-check
   ```

3. **ローカルテスト**
   ```bash
   npm run dev
   # https://localhost:8788/sse でテスト
   ```

### 一般的なエラーと対処法

1. **認証エラー（401）**
   - クライアントID/シークレットの確認
   - リダイレクトURIの完全一致確認
   - OAuthアプリケーションの有効化確認

2. **権限エラー（403）**
   - 必要なスコープの確認
   - ユーザーの権限確認

3. **スコープエラー**
   - kintoneで利用可能な6つのスコープのみ使用

### パフォーマンス最適化

1. **並列処理**
   - 複数のツール呼び出しは可能な限り並列実行
   - バッチ処理の活用（addRecords等）

2. **キャッシュ活用**
   - KVストレージの効果的な利用
   - 不要なAPI呼び出しの削減

3. **エラーハンドリング**
   - 適切なリトライ処理
   - ユーザーフレンドリーなエラーメッセージ

このドキュメントは、Claude Codeがこのプロジェクトで作業する際の包括的なガイドとして機能します。プロジェクトの構造、実装パターン、ベストプラクティスに従って、高品質なコードを維持してください。