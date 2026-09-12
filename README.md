# CardCompass

Which AI model is safe for your small business? CardCompass reads the system cards and model cards the AI labs publish, scores 30 models from 16 labs on five plain-English checks (Good at the work, Gets things right, Keeps your data private, Treats people fairly, Hard to trick), and ranks them for a specific business based on an 8-step questionnaire with a preference ranking, type-to-match on every question, and recommended options that adapt to earlier answers. Every score links back to the sentence in the card it came from.

Built at the Generalist World hackathon (12 Sept 2026) for UN SDG 8: decent work and economic growth.

## Run locally

```bash
npm install
npm run dev
```

Live: https://cardcompassai.netlify.app

Optional: set `ANTHROPIC_API_KEY` to enable Claude-written explanations and the "Ask the small print" box. Without it the app still ranks models and shows templated, cited explanations.

## Data pipeline

```bash
npx tsx scripts/ingest.ts     # cards in data/cards -> data/generated/{chunks,index}.json
npx tsx scripts/validate.ts   # resolves every evidence quote to a chunk -> data/scores.resolved.json
npx tsx scripts/smoke-rank.ts # ranks the three personas and checks invariants
```
