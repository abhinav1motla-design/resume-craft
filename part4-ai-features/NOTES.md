# Part 4 — AI Assistant, Jobs & Resume Upload

**Team member:** __________

## What this part does
- **AI connection (Admin → AI settings):** choose **Claude, OpenAI or Gemini**, paste an API key and test the connection.
- **AI writing help:**
  - write or improve the summary
  - rewrite job and project descriptions as strong bullet points
  - suggest skills
  - every change can be undone
- **AI resume review (Step 3):** a score out of 100, strengths and improvements.
- **Jobs (Step 4):** AI suggests matching roles with a match %, why each fits, missing skills and a salary range. Each role links to live searches on LinkedIn, Naukri, Indeed and Google Jobs. **Quick search** works without AI.
- **Tailor to a job post:** paste a job description to get a match %, missing keywords, suggested edits, a tailored summary and a **cover letter**.
- **Upload old resume:** PDF, Word (.docx), photo or .txt.
  - The text is read in the browser.
  - Scanned or Canva PDFs are sent to the AI as a file, or read with **OCR** (text recognition) when there is no key.
  - The AI suggests changes, and the resume can be imported into the form in one click.

## Files
| File | Contents |
|------|----------|
| `style.css` | AI buttons, review score ring, job cards, upload window, suggestions, tailoring |
| `script.js` | AI provider calls, prompts, jobs, upload/OCR, tailoring |
| `index.html` (shared) | Sections marked `PART 4`: upload window, Step 4 Jobs, and the AI settings tab |

## Key functions (`script.js`)
| Function | What it does |
|----------|--------------|
| `callAI(system, prompt, {attachment})` | Sends a request to Claude, OpenAI or Gemini (with an optional PDF/image) and returns the text |
| `parseAIJSON()` | Safely reads the JSON the AI returns |
| `aiSummary()` / `aiImproveEntry()` / `aiSuggestSkills()` | AI writing help |
| `aiReview()` | Resume score and feedback |
| `aiFindJobs()` / `quickJobs()` / `jobLinks()` | Job suggestions and job-site search links |
| `aiTailor()` / `aiCoverLetter()` | Compare against a job post, write a cover letter |
| `readResumeFile()` | Reads PDF (pdf.js), Word (mammoth.js), images and text files |
| `ocrResume()` | Text recognition for scans (Tesseract.js) |
| `handleResumeFile()` / `importUploaded()` | Upload flow and importing into the form |
| `saveAISettings()` / `testAISettings()` | Store and test the API key |

## How it connects to other parts
- **Reads:** the resume through `getData()` (Part 1) and writes AI results back into the form, then calls `liveUpdate()`.
- **Saves:** AI results (jobs, review, tailoring) with each profile through Part 3.
- **Libraries:** pdf.js, mammoth.js and Tesseract.js are loaded only when someone uploads a file.

## Demo / talking points
1. **Connect:** add a key in AI settings → **Test connection**.
2. **Writing help:** write a summary with AI, improve a job's bullets, then undo.
3. **Upload:** upload an old PDF resume, show the suggestions, then import it.
4. **Jobs:** find jobs, open a LinkedIn or Naukri link, paste a job post and generate a cover letter.
5. **Prompting:** explain how the AI is told to return JSON and never to invent facts, using `[X%]` placeholders instead.
