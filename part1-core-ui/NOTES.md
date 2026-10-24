# Part 1 — Core UI, Theme & Resume Form

**Team member:** __________

## What this part does
- **Liquid-glass theme:** the frosted, see-through panels, the slowly moving colour background, the gradient buttons and all shared colours (the CSS variables in `:root`).
- **Page layout:** the floating header, the 4-step navigation (Template → Details → Download → Jobs) and the mobile layout.
- **Resume form (Step 2):** personal info, summary, experience, education, skills and projects. Experience, education and project entries can be added and removed.
- **Resume-strength meter:** a % score with a hint about what to add next.
- **Toast messages:** the small pop-up notifications (styling only).
- **App start-up:** what runs when the page loads.

## Files
| File | Contents |
|------|----------|
| `style.css` | Theme variables, liquid background, glass panels, header, step pills, form fields, buttons, toast, strength meter, mobile layout |
| `script.js` | Form logic and navigation |
| `index.html` (shared) | Sections marked `PART 1`: background, header, Step 2 form |

## Key functions (`script.js`)
| Function | What it does |
|----------|--------------|
| `goToStep(n)` | Switches between the 4 steps and highlights the step pill |
| `showFormSection(id)` | Switches between form sections (Personal Info, Summary…) |
| `addExperience()` / `removeExp()` / `renderExpEntries()` | Add, remove and draw job entries (same pattern for education and projects) |
| `addSkill()` / `renderSkills()` | Add skills (comma-separated works) and draw them as tags |
| `getData()` | Collects everything typed in the form into one object, which the other parts use |
| `parseBullets()` | Turns lines starting with • or - into a bullet list |
| `resumeStrength()` / `updateStrength()` | Scores the resume out of 100 and shows the next tip |
| `liveUpdate()` | Runs on every keystroke: saves (Part 3), updates strength, refreshes the preview (Part 2) |

## How it connects to other parts
- **Calls:** `scheduleSave()` (Part 3), `renderResume()` and `renderTemplatePicker()` (Part 2), `initAuth()` (Part 3).
- **Used by:** Part 4's AI features read `getData()`.

## Demo / talking points
1. **Glass effect:** show it, and explain `backdrop-filter: blur() saturate()` together with semi-transparent white gradients and inset highlights.
2. **Form:** add a job and a skill, then watch the strength meter change.
3. **Mobile:** resize the window to show the mobile layout (the `@media (max-width: 960px)` rules).
