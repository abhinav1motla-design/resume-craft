# Part 3 — Login, Profiles & Admin Panel

**Team member:** __________

## What this part does
- **Login screen:** built-in admins **Abhinav** and **Abhishek**.
- **Password security:** passwords are never stored as plain text. Each one gets a random *salt* and is stored as a **SHA-256 hash**.
- **Separate data per profile:** every profile has its own saved resume, auto-saved as the user types.
- **Admin panel:**
  - **Resumes:** see every user's resume as a thumbnail; search, view, download PDF, or **edit as that user**, with a yellow banner while doing so.
  - **Profiles:** create users (optionally as admins), reset passwords, make or remove admin, delete. The last admin and your own account are protected.
  - **Backup:** download all profiles and resumes as a file, and restore them on another computer.
- **Account:** any user can change their own password (click your name in the header).

## Files
| File | Contents |
|------|----------|
| `style.css` | Login card, admin window, profile list, resume gallery, viewer, edit banner |
| `script.js` | Accounts, hashing, saving/loading, admin tools, backup |
| `index.html` (shared) | Sections marked `PART 3`: login, admin window, viewer, account, banner |

## Key functions (`script.js`)
| Function | What it does |
|----------|--------------|
| `sha256()` / `hashPw(salt, pw)` / `newSalt()` | Password hashing |
| `ensureSeedAdmins()` | Creates the two built-in admins on first run |
| `doLogin()` / `startSession()` / `logout()` | Sign in and out |
| `collectProfileState()` / `applyProfileState()` | Turn the form into saved data and back |
| `scheduleSave()` / `flushSave()` / `loadProfile()` | Auto-save and load each profile's resume (`localStorage`) |
| `createUser()` / `toggleAdmin()` / `deleteUser()` / `showReset()` | Admin user management |
| `renderResumeGallery()` / `viewProfile()` / `adminEditProfile()` / `backToMine()` | Admin access to all resumes |
| `changeOwnPassword()` | Change your own password |
| `downloadBackup()` / `restoreBackup()` | Export and import all data |
| `esc()` | Escapes text for safe display |
| `initAuth()` | Runs at start-up: restores the session or shows login |

## How it connects to other parts
- **Saves:** whatever Part 1's form contains, plus Part 4's AI results, per profile.
- **Displays:** uses Part 2's `buildResumeHTML()` for thumbnails and the viewer.
- **AI settings:** the AI settings tab in the admin window is Part 4.

## Demo / talking points
1. **Separate data:** log in as Abhinav, create a user, log out, log in as that user and show the resume is empty.
2. **Admin access:** as an admin, open **Resumes**, view a user's resume and edit it as them.
3. **Hashing:** open the browser DevTools → Application → Local Storage and show that passwords appear only as hashes.
4. **Backup:** download a backup and restore it in another browser.
