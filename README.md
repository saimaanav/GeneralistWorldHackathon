# CardCompass

Which AI model is safe for your small business? CardCompass reads the system cards and model cards the AI labs publish, scores every model on five plain-English checks, and ranks them for a specific business based on an 8-step questionnaire. Every score links back to the sentence in the card it came from.

Built at the Generalist World hackathon (12 Sept 2026) for UN SDG 8: decent work and economic growth.

## Run locally

```bash
npm install
npm run dev
```

Optional: set `ANTHROPIC_API_KEY` to enable Claude-written explanations and the "Ask the small print" box. Without it the app still ranks models and shows templated, cited explanations.

## Data pipeline

```bash
npx tsx scripts/ingest.ts     # cards in data/cards -> data/generated/{chunks,index}.json
npx tsx scripts/validate.ts   # resolves every evidence quote to a chunk -> data/scores.resolved.json
npx tsx scripts/smoke-rank.ts # ranks the three personas and checks invariants
```
