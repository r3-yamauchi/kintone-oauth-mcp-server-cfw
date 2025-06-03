# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Model Context Protocol (MCP) server with kintone OAuth authentication, deployed to Cloudflare Workers. It acts as both an OAuth server to MCP clients and an OAuth client to kintone.

### Project Origin

This project was initially created from the Cloudflare GitHub OAuth template:
```bash
npm create cloudflare@latest -- kintone-oauth-mcp-server-cfw --template=cloudflare/ai/demos/remote-mcp-github-oauth
```

The original template (documented at https://developers.cloudflare.com/agents/guides/remote-mcp-server/) provided GitHub OAuth integration. We have modified it to use **Cybozu/kintone OAuth** instead, requiring significant changes to the authentication flow and configuration.

## Development Commands

### Local Development
```bash
npm install              # Install dependencies
npm run dev             # Start local dev server with HTTPS on port 8788
npm run type-check      # Run TypeScript type checking
```

**Note**: The `npm run dev` command automatically runs with HTTPS enabled (`--local-protocol https`) as required by Cybozu OAuth.

### Deployment
```bash
npm run deploy          # Deploy to Cloudflare Workers
npm run cf-typegen      # Generate Cloudflare types
```

### Setting Secrets (Production)
```bash
wrangler secret put CYBOZU_CLIENT_ID
wrangler secret put CYBOZU_CLIENT_SECRET
wrangler secret put CYBOZU_SUBDOMAIN
wrangler secret put COOKIE_ENCRYPTION_KEY
```

### KV Namespace Setup
```bash
wrangler kv:namespace create "OAUTH_KV"  # Create KV namespace
# Update wrangler.jsonc with the generated KV ID
```

## Architecture

### Core Components

1. **OAuth Provider** (`@cloudflare/workers-oauth-provider`)
   - Handles dual OAuth flow (server to clients, client to kintone)
   - Manages token issuance and validation
   - Stores auth state in KV storage

2. **MCP Server** (`src/index.ts`)
   - Extends `McpAgent` from `agents/mcp`
   - Defines available tools (add, userInfoOctokit, generateImage)
   - Access control via `ALLOWED_USERNAMES` for restricted tools
   - Props context includes: login, name, email, accessToken, subdomain

3. **kintone OAuth Handler** (`src/cybozu-handler.ts`)
   - Manages authorization flow with kintone
   - Handles approve/callback endpoints
   - Exchanges codes for access tokens
   - Stores user metadata in OAuth tokens
   - Implements kintone-specific OAuth requirements

4. **Configuration** (`wrangler.jsonc`)
   - Durable Objects binding for MCP persistence
   - KV namespace for OAuth state storage
   - AI binding for image generation
   - Environment variables for OAuth credentials (CYBOZU_*)

### Authentication Flow
1. MCP client connects to `/sse` endpoint
2. User redirected to `/authorize` for approval
3. After approval, redirected to kintone OAuth (`https://{subdomain}.cybozu.com/oauth2/authorization`)
4. kintone callback to `/callback` with authorization code
5. Code exchanged for access token at kintone token endpoint
6. User data stored in OAuth token props
7. Client receives authenticated connection

### Key Files
- `src/index.ts` - Main MCP server and tool definitions
- `src/cybozu-handler.ts` - kintone OAuth flow handlers
- `src/utils.ts` - OAuth utility functions (modified for kintone)
- `src/workers-oauth-utils.ts` - OAuth UI/approval helpers

### kintone OAuth Specifics

When working with kintone OAuth:
1. **Endpoints**: Use `https://{subdomain}.cybozu.com/oauth2/authorization` and `/oauth2/token`
2. **Authentication**: Credentials go in request body, not Basic Auth header
3. **Scopes**: Use kintone-specific scopes like `k:app_record:read`
4. **Redirect URI**: Must match exactly what's registered in Cybozu Developer Network

### Common Issues
- **401 Error**: Usually means client credentials are incorrect or redirect URI mismatch
- **Token Exchange**: kintone expects credentials in request body with `grant_type=authorization_code`

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.