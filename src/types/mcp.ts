// 認証プロセスからのコンテキスト、暗号化されて認証トークンに保存され、
// DurableMCPにthis.propsとして提供されます
export type Props = {
  login: string;
  name: string;
  email: string;
  accessToken: string;
  subdomain: string;
};