<img width="4320" height="1440" alt="hh26 main poster 2 with sponsors 3x1 (4320 x 1440 px) (2)" src="https://github.com/user-attachments/assets/c698b2cd-da84-4cb0-9276-125c6a7244aa" />

# 🚀 Setu
> The bridge between citizens and the government services they're entitled to — spoken in their own language.

---

## 📌 Problem & Domain

Hundreds of millions of Indians are entitled to government services — certificates, welfare scheme benefits, identity documents — but are functionally locked out of them by process friction: forms written in English or formal bureaucratic language, unclear document requirements, no way to resume an abandoned application, and no help available in the citizen's own spoken language. This friction disproportionately affects people with lower literacy or limited digital fluency, who often resort to paid middlemen for services that should be free and self-serve.

**Themes Selected (at least one):**
- [x] Human Experience & Productivity
- [ ] Climate & Sustainability Systems
- [ ] HealthTech & Bio Platforms
- [ ] Learning & Knowledge Systems
- [ ] Work, Finance & Digital Economy
- [ ] Infrastructure, Mobility & Smart Systems
- [ ] Trust, Identity & Security
- [ ] Media, Social & Interactive Platforms
- [x] Public Systems, Governance and Civic Tech
- [ ] Developer Tools & Software Infrastructure

---

## 🎯 Objective

Setu is a voice-first AI agent that lets a citizen speak naturally, in Hindi, Tamil, or Hinglish, about the government service they need — and be guided conversationally through the entire process, with progress tracked durably across days, ending in a real, submission-ready filled document.

- **Target users:** citizens who need a specific government certificate or scheme benefit and are more comfortable speaking than typing or reading complex forms — particularly those with limited English fluency or lower digital literacy.
- **The pain point:** navigating government paperwork is confusing, English-heavy, and offers no way to pick up where you left off if you get busy or overwhelmed mid-process.
- **The value:** Setu turns a multi-step bureaucratic process into a single spoken conversation that can be paused and resumed at any time, producing a completed, downloadable form at the end — no typing, no reading dense forms, no starting over.

---

## 🧠 Team & Approach

### Team Name:
`El3ctroKn1ght`

### Team Members:
- Evin Brijesh — [GitHub](https://github.com/evinbrijesh) / [LinkedIn](https://www.linkedin.com/in/evinbrijesh/) / Solo builder (full stack: voice pipeline, orchestration, frontend)

### Your Approach:
- **Why this problem:** bureaucratic friction is one of the most common, large-scale daily frustrations across India, and voice AI in Indic languages is finally mature enough to meaningfully address it.
- **Key challenges addressed:** building a genuinely durable, multi-day-resumable process without a component that can block for days (Render task runs cap at 24 hours and don't natively schedule future runs) — solved by keeping the durable record in Supabase and triggering a fresh, short-lived task run per user turn; and getting a reliable voice round-trip (browser mic → transcode → STT → TTS → playback) working end to end.
- **Pivots/iterations:** the architecture originally planned a hand-rolled Python/TypeScript state machine on Django + DRF or Supabase Edge Functions; this was deliberately replaced with real Render Workflow tasks once the dual-track requirement (Sarvam + Render Workflows) made that the stronger, more track-aligned choice.

*(Placeholder — add any additional breakthroughs or debugging war stories from the build here before submission.)*

---

## 🛠️ Tech Stack

### Core Technologies Used:
- **Frontend:** React + Vite
- **Backend:** FastAPI (voice bridge/audio service) + Render Workflows (durable task orchestration: intake, document collection, validation, form generation, notification)
- **Database:** Supabase (Postgres + Storage)
- **APIs:** Sarvam AI — Saaras v3 (speech-to-text), Bulbul v3 (text-to-speech), Sarvam-30B / Sarvam-105B (conversational reasoning and structured field extraction)
- **Hosting:** Render (Workflow service + web service)

### Additional Technologies Used (Optional):
- [x] AI / ML
- [ ] Web3 / Blockchain
- [ ] Cyber Security
- [x] Cloud

---

## 🏆 Sponsored Track

Setu is a dual-track submission:

- [x] **Sarvam Track** — Saaras v3, Bulbul v3, and Sarvam-30B/105B form the entire conversational core of the product: speech-to-text, structured field extraction from natural spoken language, and text-to-speech responses, across Hindi, Tamil, and Hinglish.

  > Every user utterance flows through Saaras v3 for transcription → Sarvam-30B for structured field extraction (with confidence/threshold-based re-asking when the LLM isn't sure) → Bulbul v3 for the spoken response. The model choice between 30B and 105B is deliberate: 30B handles single-field extraction for low latency, while 105B is wired in for complex, multi-field utterances that need stronger agentic reasoning.

- [x] **Render Workflows Track** — the entire multi-day, multi-stage government process (intake → document collection → validation → form generation → notification) is modeled as chained, independently retryable Render Workflow tasks, with Supabase holding the durable process state that outlives any single task run.

  > The entire application process is modeled as 5 independently retryable tasks visible in the Render Dashboard. Each user utterance triggers a fresh task run — the durable state lives in Supabase, not in a blocking 24-hour execution. The Dashboard shows real stage-by-stage progress: intake → document collection → validation → PDF generation → notification.

---

## ✨ Key Features

- ✅ Fully voice-driven intake and information collection — the core interaction is speaking, not typing or form-filling
- ✅ Multi-session resumability — stop mid-conversation and resume hours or days later without repeating information
- ✅ Automatic eligibility validation against scheme-specific rules
- ✅ Automatic generation of a real, downloadable, filled PDF at the end of the process
- ✅ Live progress visibility ("Step 3 of 5 complete") and a visible, config-driven form-preview panel
- ✅ Config-driven scheme support — adding a new government program requires only a JSON config file and a PDF template, zero new orchestration code
- ✅ Live Render Dashboard visibility showing real stage-by-stage progress of each task pipeline run

*(Add screenshots/GIFs of the mic interaction, live transcript, and form-preview panel here before submission.)*

---

## 📽️ Demo & Deliverables

- **Demo Video Link (Mandatory):** _[Paste link here]_
- **Deployment Link (Recommended):** _[Paste link here]_
- **Pitch Deck / PPT (Optional):** _[Paste link here]_

---

## ✅ Tasks & Bonus Checklist
- [ ] All team members completed the mandatory social task
- [ ] Bonus Task 1 – Badge sharing
- [ ] Bonus Task 2 – Blog/article

---

## 🧪 How to Run the Project

### Requirements:
- Node.js (for `setu-web`)
- Python 3.11+ (for `setu-audio` and `setu-workflows`)
- `ffmpeg` installed and available on PATH (required for audio transcoding)
- A Supabase project (URL + anon key + service-role key)
- A Sarvam AI API key (with access to Saaras v3, Bulbul v3, and Sarvam-30B/105B)
- A Render account (for deploying the Workflow service)

### Local Setup:
```bash
# 1. Clone the repo
git clone https://github.com/evinbrijesh/<repo-name>.git
cd <repo-name>

# 2. Set up setu-audio (voice bridge service)
cd setu-audio
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in SARVAM_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
uvicorn app.main:app --reload --port 8000

# 3. Set up setu-workflows (Render Workflow tasks)
cd ../setu-workflows
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in SARVAM_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
# deploy via Render CLI/dashboard, or run locally per Render's local task runner docs

# 4. Set up setu-web (frontend)
cd ../setu-web
npm install
cp .env.example .env   # fill in VITE_AUDIO_WS_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
npm run dev
```

---

## 🧬 Future Scope

- 📈 Support for additional government schemes and certificates beyond the single fully-polished flow built for this hackathon (config-driven, so this is largely a JSON + template addition, not new orchestration code)
- 🛡️ Real telephony (PSTN) support so users without a smartphone/computer can access Setu via a phone call
- 🌐 Broader language coverage across all 22 official Indian languages supported by Saaras, plus dialect robustness testing
- 🔒 Basic document authenticity checks, to give users earlier warning of likely rejection before physical submission

---

## 📎 Resources / Credits

- [Sarvam AI](https://sarvam.ai) — Saaras v3 (STT), Bulbul v3 (TTS), Sarvam-30B/105B (LLM)
- [Render Workflows](https://render.com) — durable task orchestration
- [Supabase](https://supabase.com) — Postgres, Storage, auth
- WeasyPrint — HTML-to-PDF form generation
- FastAPI, React, Vite

---

## 🏁 Final Words

Getting the multi-day resumability working was the single hardest part of this build — Render's task model doesn't let you just block for three days, so I had to rethink the whole persistence layer around Supabase holding the durable state instead. There's a version of this project that's a much shallower chatbot demo, and I'm glad I pushed through the harder architecture instead, because it's the part I'm proudest of showing off. Solo hackathons are a grind, but this one taught me more about durable systems design than any tutorial could have.
