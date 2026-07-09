# setu-workflows — Render Workflow Tasks

Five chained, independently retryable tasks for Setu's government application pipeline:

```
intake → document_collection → validation → form_generation → notify_user
```

Triggered per-user-utterance by `setu-audio`. Durable state lives in Supabase, not in a long-running task.

## Local Development

See the main project README for full setup. Quick test:

```bash
pip install -r requirements.txt
cp .env.example .env   # fill in SARVAM_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
python test_pipeline.py
```

## Deploying to Render

| Option | Value |
|--------|-------|
| Build command | `pip install -r requirements.txt` |
| Start command | `python main.py` |
| Plan | Standard (or higher for WeasyPrint) |

After deploy, get the trigger URL from Render Dashboard → Workflow service → Triggers, and set it as `RENDER_WORKFLOWS_TRIGGER_URL` in `setu-audio/.env`.
