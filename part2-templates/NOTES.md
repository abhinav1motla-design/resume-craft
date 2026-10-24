# Part 2 — Resume Templates & PDF Export

**Team member:** __________

## What this part does
- **10 resume designs:** Classic, Modern Sidebar, Creative Split, Minimal, Executive, Timeline, Spotlight, ATS Compact, Developer and Fresher.
- **Template picker (Step 1):** category filters and live thumbnail previews, drawn from sample data.
- **Accent colours:** six colours that recolour the templates.
- **Preview & Download (Step 3):** a live preview of the resume, a template switcher and **PDF download**.
- **Safe rendering:** everything the user typed is escaped before it is shown, so code typed into a field can't run (`escDeep`).

## Files
| File | Contents |
|------|----------|
| `style.css` | Template picker, preview page, and the CSS for all 10 resume designs (`.tpl-classic`, `.tpl-executive`, …) |
| `script.js` | Template list, the HTML for each design, picker, colours, PDF export |
| `index.html` (shared) | Sections marked `PART 2`: Step 1 picker, Step 3 preview |

## Key functions (`script.js`)
| Function | What it does |
|----------|--------------|
| `TEMPLATES` | The list of all templates (id, name, description, category) |
| `buildResumeHTML(data, template, colour)` | Builds the resume HTML for any template; used by the preview, picker thumbnails and admin gallery |
| `TPL_EXTRA.executive()`, `.timeline()`, … | The 6 newer designs, one function each |
| `renderResume()` | Draws the current user's resume in Step 3 |
| `renderTemplatePicker()` / `setTemplateFilter()` | Draws the template cards and category filters |
| `fitTemplateThumbs()` | Scales each A4 preview down to fit its card |
| `setColorTheme()` / `switchTpl()` | Change colour or template |
| `exportPDF()` / `downloadPDF()` | Converts the resume to an A4 PDF using the html2pdf library |
| `escDeep()` | Escapes user text before it goes into the HTML (security) |

## How it connects to other parts
- **Reads:** form data via `getData()` (Part 1).
- **Used by:** the admin gallery and viewer (Part 3) to show anyone's resume.
- **Colours:** passed into templates as CSS variables (`--ac`, `--acb`, …), so one design works in all 6 colours.

## Demo / talking points
1. **Filters and colours:** filter the templates by category, then switch the accent colour and show every design recolouring.
2. **One data object, many designs:** switch templates in Step 3 and show the same data rendered 10 ways.
3. **PDF:** download it and show the A4 output.
4. **ATS:** explain why ATS Compact is plain. Applicant-tracking systems read simple single-column text best.
