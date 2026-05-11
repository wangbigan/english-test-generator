# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

This project uses **pnpm** as the package manager (`packageManager: pnpm@10.13.1` in `package.json`).

```bash
# Install dependencies
pnpm install

# Start development server (Next.js 15, App Router)
pnpm dev

# Production build
pnpm build

# Run linter (ESLint)
pnpm lint

# Start production server
pnpm start
```

There is no test runner configured in this project.

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 15 with App Router, React 19, TypeScript
- **Styling**: Tailwind CSS 3.4 + shadcn/ui (components in `components/ui/`)
- **AI Integration**: Vercel AI SDK (`ai`, `@ai-sdk/openai`, `@ai-sdk/deepseek`)
- **Document Parsing**: mammoth.js (Word), JSZip + xml2js (PPT), pdf-parse (PDF)

### Server Actions vs API Routes

The codebase uses **two distinct server-side patterns**:

- **Server Actions** (`app/actions/`): Used for AI model calls that generate content. `generateTestPaper()` in `app/actions/generate-test.ts` is the main entry point for test paper generation. It calls the AI SDK's `generateText()` directly.

- **API Routes** (`app/api/`): Used for document upload and processing:
  - `POST /api/parse-document` — parses uploaded DOC/DOCX/PPT/PPTX/PDF files and returns extracted text
  - `POST /api/extract-knowledge-points` — sends extracted text to AI and returns summarized knowledge points

This split exists because file uploads with `FormData` are handled more naturally through API Routes, while AI generation calls are cleaner as Server Actions.

### AI Model Support Logic

Model creation is centralized in `lib/ai-provider.ts`:

- `createLanguageModel(config)` creates the provider instance:
  - If `baseUrl` hostname is `api.deepseek.com` → uses `createDeepSeek()` (DeepSeek official SDK)
  - All other hosts (Kimi, 智谱, MiniMax, SiliconFlow, OpenAI, etc.) → uses `createOpenAI()` with a custom `baseURL` for OpenAI-compatible APIs
- `getModelGenerationParams(config)` handles parameter naming differences:
  - Kimi (`kimi*`, `moonshot*`) and Doubao use `max_tokens`
  - All others use `maxTokens`

Both `app/actions/generate-test.ts` and `app/api/extract-knowledge-points/route.ts` import from `lib/ai-provider.ts`; the previously duplicated logic no longer exists.

### Prompt Template System

Prompts are constructed in `app/actions/generate-test.ts` via `buildMessages()`:

1. A fixed `systemMessage` sets the role (elementary English teacher) and output constraints
2. The `userMessage` comes from a template selected in `app/components/prompt-config-dialog.tsx`
3. Templates support variable substitution: `{{grade}}`, `{{difficulty}}`, `{{theme}}`, `{{knowledgePoints}}`, plus per-question-type counts/scores/totals (e.g., `{{listeningCount}}`, `{{multipleChoiceTotalScore}}`)
4. `getFinalPromptTemplate()` resolves the selected template (standard/custom) and appends a JSON schema example

### JSON Response Parsing

AI responses are cleaned (removing `\`\`\`json` fences) then parsed by `safeJsonParse()` in `app/actions/generate-test.ts`. This function:
- Strips control characters outside of string values
- Attempts parsing up to 3 times, handling cases where the model returns a JSON string wrapped in extra string quotes
- Throws if parsing fails after 3 attempts

### Fallback Behavior

If the AI API call fails (missing key, network error, invalid response), the system silently falls back to a locally generated sample paper via `buildSamplePaper()` in `app/actions/build-sample-paper.ts`. This ensures the UI never crashes even without API credentials.

### Document Parsing Pipeline

`app/api/parse-document/route.ts` handles multiple file formats with format-specific parsers and a shared post-processing pipeline:

1. **Format detection** by MIME type or file extension fallback
2. **Parsing**: mammoth.js for DOCX/DOC, JSZip+XML for PPTX, binary heuristics for legacy PPT, pdf-parse for PDF
3. **Validation**: `isGarbledText()` checks valid character ratio; garbled content is rejected
4. **Cleaning**: `cleanExtractedText()` removes control chars, image filenames, XML tags,超长 random strings
5. **Truncation**: hard cap at 30,000 characters

### State Management

All application state lives in `app/page.tsx` (a client component) using React `useState`. There is no external state library. Key state slices:
- `config` — test paper parameters (grade, difficulty, question types with counts/scores)
- `openaiConfig` — API key, base URL, model (loaded from encrypted `localStorage` via `lib/ai-config-storage.ts`)
- `promptConfig` — selected template ID and custom template text (persisted to `localStorage`)
- `generatedTest` / `prompt` / `rawResponse` — results from the server action

### Shared Libraries (`lib/`)

Previously duplicated or page-embedded code has been extracted into shared `lib/` modules:

- `lib/types.ts` — Global TypeScript interfaces (`TestConfig`, `AIProviderConfig`, `PromptConfig`, `TestPaperData`, `GenerateTestResult`, etc.)
- `lib/test-schema.ts` — Zod schemas for runtime validation of AI-generated JSON (`testPaperSchema`, `questionSchema`, etc.)
- `lib/ai-providers.ts` — Provider registry: `PROVIDERS`, `DEFAULT_PROVIDER`, `findProviderByBaseUrl()`. Holds model lists, base URLs, descriptions, and key-application links for each vendor.
- `lib/ai-provider.ts` — AI SDK provider factory (`createLanguageModel`, `getModelGenerationParams`). Hostname-based routing decides whether to use `createDeepSeek` or `createOpenAI`.
- `lib/ai-config-storage.ts` — Encrypted localStorage persistence for multi-provider API keys. Uses Web Crypto AES-GCM + PBKDF2 (100k iterations). Keys are isolated per provider (`encryptedKeys[providerId]`). Automatically migrates the legacy plaintext `openai-config` key.

### Component Organization

- `components/ui/` — shadcn/ui primitives (Button, Dialog, Tabs, etc.). Do not modify styling conventions here.
- `app/components/` — domain-specific components:
  - `test-paper.tsx` — renders generated test paper and answer key
  - `file-upload.tsx` — handles file selection and upload to `/api/parse-document`
  - `openai-config-dialog.tsx` — API key / model / baseURL configuration
  - `prompt-config-dialog.tsx` — prompt template selection and custom editing

## Important Code Patterns

- Path alias `@/*` maps to the project root (`./`)
- The project uses `target: "ES6"` in `tsconfig.json` but `module: "esnext"` with Next.js bundler resolution
- `next.config.mjs` externalizes `pdf-parse` via both `serverExternalPackages` and webpack `externals`
- When adding a new question type, update both the `TestConfig` interface in `lib/types.ts` and the variable substitution table in `app/actions/generate-test.ts`
- Provider registry (`lib/ai-providers.ts`) and model routing (`lib/ai-provider.ts`) are centralized; add new vendors or models there rather than in UI components