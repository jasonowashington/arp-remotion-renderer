# n8n.cloud — Required Environment Variables & Credentials

This repo includes the Render + Remotion service. **n8n remains the orchestrator**.
To run end-to-end "95% automation" you must configure:

## A) n8n Credentials (in n8n.cloud)
1) **Cloudflare R2** (S3 credential)
   - Type: Amazon S3
   - Region: auto
   - Endpoint: https://<ACCOUNT_ID>.r2.cloudflarestorage.com
   - Force Path Style: true
2) **OpenAI** (HTTP Header Auth)
   - Header: Authorization: Bearer <OPENAI_API_KEY>
3) **Slack** (OAuth2 or Bot token)
   - Used for QA approval messages
4) **YouTube** (OAuth2)
   - Used for upload/publish

## B) Workflow Variables (Set Manifest node)
These fields must exist in workflow output JSON:
- renderApiBase: https://arp-remotion-renderer.onrender.com
- R2_BUCKET: arp-video-renders
- R2_PREFIX: ={{ 'runs/' + $json.runId }}
- runId: a unique id per run (timestamp-based)

## C) External platform settings
- Slack App Interactivity URL → points to your n8n webhook that handles Approve/Reject
- YouTube API credentials → enabled in Google Cloud Console
- Render service URL reachable from n8n.cloud

## What cannot be included in the ZIP
For security and because they're account-specific, these are NOT included:
- API keys/secrets
- n8n credentials exports
- Slack App config (signing secret / interactivity settings)
- YouTube OAuth tokens
