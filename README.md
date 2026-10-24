# RésuméCraft — Group Project

An online resume builder with a liquid-glass design, logins with admin users, 10 resume templates, PDF export, AI writing help, job suggestions and old-resume upload.

## How to run

Open **`index.html`** in Chrome, Edge or Safari (double-click it). No installation or server is needed. An internet connection is needed for fonts, PDF export and the AI features.

Built-in admin logins:

| Username | Password  |
|----------|-----------|
| Abhinav  | Motla@123 |
| Abhishek | Kumar@123 |

Admins can create more profiles from **Admin → Profiles**.

## Team & parts

The project is divided into 4 parts. Each part has its own folder with its own `style.css`, `script.js` and `NOTES.md` explaining what it does.

| Part | Folder | What it covers | Team member |
|------|--------|----------------|-------------|
| 1 | `part1-core-ui/` | Liquid-glass theme, layout, step navigation, resume form, resume-strength meter | __________ |
| 2 | `part2-templates/` | 10 resume templates, template picker, colours, preview, PDF download | __________ |
| 3 | `part3-accounts-admin/` | Login, passwords, per-profile data, admin panel, backup & restore | __________ |
| 4 | `part4-ai-features/` | AI assistant, resume review, job suggestions, cover letters, old-resume upload | __________ |

## Folder structure

```
resume-craft/
├── index.html                  ← page structure (each section is labelled with its part)
├── part1-core-ui/
│   ├── style.css
│   ├── script.js
│   └── NOTES.md
├── part2-templates/
│   ├── style.css
│   ├── script.js
│   └── NOTES.md
├── part3-accounts-admin/
│   ├── style.css
│   ├── script.js
│   └── NOTES.md
└── part4-ai-features/
    ├── style.css
    ├── script.js
    └── NOTES.md
```

## How the parts fit together

`index.html` loads the four stylesheets and then the four scripts in order (Part 1 → 4). All parts share one page, so a function written in one part can be called from another. For example, when the user types in the form (Part 1), `liveUpdate()` saves the profile (Part 3) and refreshes the preview (Part 2). The app starts when the page finishes loading: Part 1 draws the template picker (Part 2) and shows the login screen (Part 3).

```
 User types in form (Part 1)
        │  liveUpdate()
        ├──► saves to this profile (Part 3: scheduleSave)
        ├──► updates strength meter (Part 1)
        └──► redraws resume preview (Part 2: renderResume)

 AI buttons (Part 4) read the form via getData() (Part 1)
 and write results back into the form, then call liveUpdate().
```

## Where data is stored

All profiles and resumes are saved in the browser (`localStorage`), so they stay on the computer and browser where they were created. Use **Admin → Backup** to move data to another computer.
