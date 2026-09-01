# Webcomic Reading Tracker

A personal tracker for the latest chapter you've completed on every webcomic,
manga, or manhwa you're reading. Paste a chapter URL, confirm the detected
title/chapter/website, and it's saved straight to your Google Sheet.

**Stack:** React + TypeScript + Tailwind CSS (frontend) → Google Apps Script
(API) → Google Sheets (database).

Your sheet: https://docs.google.com/spreadsheets/d/1cakHbYQpSCNhnenp8U848xdhLtFxMGsd2If-DEVxPCg/edit

```
webcomic-tracker/
├── apps-script/
│   └── Code.gs          ← paste this into your Apps Script project
├── frontend/             ← React + TS + Tailwind app (Vite)
└── README.md             ← you are here
```

---

## 1. Set up the Google Apps Script backend

1. Open your Google Sheet (the URL above).
2. Click **Extensions → Apps Script**. This opens a new Apps Script project
   already bound to your spreadsheet — no need to enter a spreadsheet ID
   manually (though `Code.gs` also hardcodes the ID as a fallback).
3. Delete any placeholder code in `Code.gs`, then paste in the full contents
   of `apps-script/Code.gs` from this project.
4. Click **Save** (the disk icon), then in the function dropdown at the top
   select `setupSheets` and click **Run**. The first run will ask you to
   authorize the script — click **Review permissions**, choose your Google
   account, click **Advanced → Go to (project name)**, then **Allow**.
   This creates the `Comics` and `History` tabs with the correct headers if
   they don't already exist.

## 2. Deploy it as a Web App

1. In the Apps Script editor, click **Deploy → New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Fill in:
   - **Description:** anything, e.g. "Webcomic Tracker API v1"
   - **Execute as:** **Me** (your account) — this is what lets the script
     write to your sheet without exposing your credentials to the frontend.
   - **Who has access:** **Only myself**, if you're the only user, or
     **Anyone with the link** if you want to reach the tracker from a device
     that isn't logged into your Google account (e.g. a public URL bookmark).
     "Anyone with the link" does **not** expose your spreadsheet — the script
     runs as you, and it does not print secrets back to the client.
4. Click **Deploy**, authorize again if prompted, then copy the **Web app
   URL** shown (it looks like
   `https://script.google.com/macros/s/AKfycb.../exec`). This is your
   `VITE_APPS_SCRIPT_URL`.

Whenever you edit `Code.gs` later, you must create a **new version** via
**Deploy → Manage deployments → Edit (pencil) → New version** for the changes
to take effect on the existing Web app URL.

### Test it directly

Paste this in a browser tab (with your deployed URL):

```
https://script.google.com/macros/s/YOUR_ID/exec?action=getComics
```

You should get back `{"success":true,"data":[],"error":null}` (empty array
until you add your first comic).

## 3. Configure the frontend

```bash
cd frontend
cp .env.example .env
```

Edit `.env` and set:

```
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_ID/exec
```

Then install and run:

```bash
npm install
npm run dev
```

Open the printed local URL. You should see the dashboard load (an empty
state at first) with no "Backend not configured" banner.

## 4. Try the core workflow

1. Paste one of these into "Paste latest chapter URL" (or any chapter URL
   from a manga/manhwa/webtoon site):
   - `https://vortexscans.org/series/barbarian's-adventure-in-a-fantasy-world/chapter-68`
   - `https://www.mangaread.org/manga/solo-farming-in-the-tower/chapter-141/`
   - `https://www.topmanhua.fan/manhua/it-starts-with-a-mountain/chapter-376`
2. Confirm the detected title/chapter/website (correct anything wrong).
3. Click **Add / Update**. A row appears in your `Comics` sheet and an entry
   in `History`.
4. Paste a later chapter of the same comic (e.g. `chapter-142` for the same
   slug) — it updates the existing row instead of creating a new one.
5. Paste an earlier chapter number — you'll see the "replace it?" warning
   before anything is overwritten.

### Browsing a large list

Once you're tracking a lot of comics, the toolbar above your list gives you
a few ways to manage that:

- **List / Cards toggle** (top-right of the list) switches between the
  compact table and a larger card grid (up to 3 cards per row) with bigger
  cover thumbnails.
- **A–Z index bar** lets you jump straight to comics whose title starts
  with a given letter; letters with no matches are grayed out. Click **All**
  to clear it.
- **Pagination controls**, above the list, let you pick how many comics show
  per page — 10, 15, 30, or 50 — and step through pages. Your view and
  per-page choice are remembered between visits.

### Row actions and Alternate source

To keep the list and card views uncluttered, each row/card only shows
**Open** (the chapter link) and a pencil **Edit** button. **History** and
**Delete** moved into the edit window — click the pencil, then use the
buttons next to "Edit comic" at the top of that dialog.

When adding or updating a comic, there's an optional **Alternate source**
field — a backup link (a mirror site, raw scans, a Discord post, etc.).
Behind the scenes this is stored in the same `Notes` column the sheet
already had, so no spreadsheet changes are needed. Whenever a comic has
something saved there, an **Alt** button appears next to Open that opens
it as a link.

### Reading status, favorites, and "chapter unlocked"

The tracker uses a small manga/comic-inspired visual language — a
cream/ink/red-orange palette, condensed display type, and a few motion
touches — kept mostly neutral so color stays reserved for status and
actions rather than decoration.

- **Reading status.** Every comic has a status — `Reading`, `Completed`,
  `On Hold`, or `Dropped` — set from the dropdown in the Edit window.
  `Reading` is the default and shows no badge; the other three get a small
  colored badge next to the title in every view.
- **Favorites.** Click the star on any comic — in the list, on a card, or
  in the Edit window — to pin it. Favoriting is independent of the
  add/update flow: pasting a new chapter URL for a comic never changes its
  favorite state either way. Starred comics show up in a **Favorites**
  rail on the right side of the page as mid-sized quick-access cards, with
  a direct Open link and edit shortcut — no need to search or paginate to
  reach the titles you check most often. The rail collapses below its own
  content on narrower screens.
- **"Chapter Unlocked" flash.** Saving a new chapter (not just refreshing
  the same one) shows a bold, book-themed toast instead of the usual
  quieter confirmation, held on screen long enough to actually read.
- **"It's been N days…" narration.** Once a comic hasn't been updated in
  30+ days, its "Last Updated" column switches from a plain date to a
  narrated line like *"It's been 92 days…"* — a nudge that it's gone quiet,
  without needing a separate stale filter.

All of this respects `prefers-reduced-motion` — the flash animation is
skipped for anyone with that preference set.

## 5. Deploy the frontend (optional)

`npm run build` produces a static `dist/` folder you can host anywhere
(Netlify, Vercel, GitHub Pages, Cloudflare Pages, or your own server). Set
the `VITE_APPS_SCRIPT_URL` environment variable in your hosting provider's
build settings to the same Apps Script Web App URL — it's baked in at build
time, so rebuild after changing it.

Since the Apps Script executes "as you" and never exposes secrets to the
frontend, it's safe to host the built frontend publicly even with "Anyone
with the link" access — the worst a stranger could do is read/write your
tracker sheet, so keep the deployment link private if you'd rather avoid
that, or set access to "Only myself" and only use the tracker while signed
into your Google account in that browser.

### Hosting on GitHub Pages (step-by-step, no command line needed)

This repo already includes a GitHub Actions workflow
(`.github/workflows/deploy.yml`) that builds the site and publishes it to
GitHub Pages automatically every time you push to the `main` branch.

1. **Create a GitHub account** at github.com if you don't have one.
2. **Create a new repository**: click the **+** in the top-right corner →
   **New repository**. Name it anything (e.g. `webcomic-tracker`), leave it
   **Public**, and do **not** check "Add a README file" (this project
   already has one). Click **Create repository**.
3. **Upload the project**: on the new repo's empty page, click
   **"uploading an existing file"**. Unzip the file I sent you on your
   computer, then drag the folder's entire contents (all of `apps-script/`,
   `frontend/`, `.github/`, `README.md`, `.gitignore` — not the outer
   zip folder itself) into the browser upload area. Modern browsers keep
   the folder structure when you drag folders in, so `.github/workflows/`
   should still show up nested. Scroll down and click **Commit changes**.
4. **Turn on Pages**: go to the repo's **Settings** tab → **Pages** (left
   sidebar) → under "Build and deployment", set **Source** to
   **GitHub Actions**.
5. **Add your Apps Script URL as a secret**: still in **Settings**, click
   **Secrets and variables → Actions** → **New repository secret**. Name it
   `VITE_APPS_SCRIPT_URL` and paste your deployed Apps Script Web App URL
   (from step 2 of this guide) as the value. Click **Add secret**.
6. **Run the deployment**: go to the **Actions** tab. If a run isn't already
   in progress, click **"Deploy Webcomic Tracker to GitHub Pages"** on the
   left, then **Run workflow → Run workflow**. This picks up the secret you
   just added and builds the site.
7. **Find your live link**: once the run finishes (a green checkmark, about
   1–2 minutes), go back to **Settings → Pages** — your site's URL will be
   shown at the top, looking like
   `https://your-username.github.io/webcomic-tracker/`. Open it and try
   pasting a chapter URL.

From then on, any time you upload changed files to this repo (or edit them
directly on GitHub), the site rebuilds and redeploys automatically — you
never need to run a build command yourself.

---

## How it works

### Add / Update Comic From URL (the core operation)

1. The frontend parses the pasted URL client-side (`services/parser.ts`) to
   guess title, chapter, website, and domain — this is instant and doesn't
   touch the network. You can correct any field before saving.
2. On **Add / Update**, the frontend calls the Apps Script `addOrUpdateComic`
   action with the (possibly corrected) values.
3. The backend (`Code.gs`) takes a script lock, normalizes the title, and
   searches the `Comics` sheet for a matching normalized title.
   - **No match:** a new row is appended with a stable `comic_<id>`, and a
     `History` entry is recorded.
   - **Match found, new chapter ≥ saved chapter:** the row is updated in
     place (title, chapter, URL, website, domain, last-updated date), and a
     `History` entry is appended if anything material changed (chapter,
     URL, or website).
   - **Match found, new chapter < saved chapter:** the backend returns a
     `needs_confirmation` status instead of writing anything. The frontend
     shows the warning dialog; confirming resends the request with
     `forceOverwrite: true`.
4. The backend returns the resulting comic record, and the frontend reloads
   the dashboard from the sheet.

### Cover images

When you paste a chapter URL for a **brand-new** comic, the frontend asks
the backend to fetch that page and pull a cover image out of its `og:image`
(or similar) meta tag — this happens automatically, in the background,
while you're checking the detected title/chapter. If that lookup fails (the
site blocks scraping, has no usable image, etc.), you can upload your own
image file or click the cover box and paste one from your clipboard (works
right after you copy an image, e.g. with a screenshot tool). Either way, the
image is uploaded to a folder named **"Webcomic Tracker Covers"** in the
Google Drive belonging to whoever owns the Apps Script deployment, and a
direct-link URL to it is stored in the sheet.

The cover prompt only appears for new comics — when you paste a URL for a
comic you're already tracking (used to log a new chapter), the form
recognizes it by its normalized title and skips straight to confirming the
chapter update, keeping the existing cover. You can still change a comic's
cover at any time from the **Edit** button on its row.

Because this feature uses Google Drive, the first time you redeploy
`Code.gs` after adding it, Google will likely ask you to re-authorize the
script (it now needs Drive access in addition to Sheets access) — just
review and accept the permissions screen when it appears.

### Duplicate matching

Titles are normalized (lowercased, punctuation stripped, hyphens/underscores
turned into spaces, whitespace collapsed) on both the frontend and backend,
so `"Solo Farming in the Tower"` and `solo-farming-in-the-tower` match. This
means a comic that moves to a new website updates the existing row instead
of creating a duplicate.

### Concurrency

Every write path (`addComic`, `updateComic`, `deleteComic`,
`addOrUpdateComic`, `addHistoryEntry`) takes a `LockService` script lock for
its full duration, so the duplicate-title lookup and the row write happen
atomically even if two requests arrive close together.

### Sheets schema

**`Comics`** (one row per tracked comic — always the latest state):

| Column | Field |
|---|---|
| A | ID |
| B | Webcomic Name |
| C | Latest Completed Chapter |
| D | Latest Chapter URL |
| E | Website |
| F | Domain |
| G | Date First Added |
| H | Date Last Updated |
| I | Notes |
| J | Normalized Title |
| K | Cover Image URL |
| L | Status |
| M | Favorite |

`Status` is one of `Reading`, `Completed`, `On Hold`, or `Dropped` (defaults
to `Reading`). It's added automatically to existing sheets the next time the
backend runs — no manual spreadsheet edit needed. Saving a genuinely new
chapter for a comic resets its status back to `Reading` unless you set it
explicitly in the Edit window; re-saving the same chapter number preserves
whatever status it already had (so a `Completed` comic doesn't flip back to
`Reading` just because a refresh ran).

`Favorite` is `TRUE`/`FALSE` (defaults to `FALSE`), also added automatically.
Unlike `Status`, it is never touched by the add/update-from-URL flow —
pasting a new chapter link only ever changes title/chapter/URL/status; the
favorite flag only changes when you explicitly click the star.

**`History`** (append-only log of every chapter update):

| Column | Field |
|---|---|
| A | History ID |
| B | Comic ID |
| C | Webcomic Name |
| D | Chapter |
| E | Chapter URL |
| F | Website |
| G | Date Completed |
| H | Date Recorded |

Both sheets are created automatically (with headers) the first time the
backend runs, if they don't already exist.

### Project structure

```
frontend/src/
├── components/    Dashboard, AddComicForm, ComicTable, EditComicModal,
│                  HistoryModal, SearchAndFilters, StatsCards, Toast,
│                  ConfirmDialog
├── services/      api.ts (fetch wrapper), parser.ts (URL → title/chapter/
│                  website), normalization.ts (title normalization, date
│                  helpers), export.ts (JSON/CSV export + JSON import)
└── types/         Comic, HistoryEntry, APIResponse
```

### Troubleshooting

- **"Backend not configured" banner:** `.env` is missing or
  `VITE_APPS_SCRIPT_URL` is empty — set it and restart `npm run dev` (Vite
  only reads `.env` at startup).
- **"Could not reach the Google Sheets backend":** the Apps Script URL is
  wrong, the deployment was deleted, or you're offline.
- **HTTP 401/403 from the Apps Script URL:** re-check the deployment's
  "Who has access" setting, or that you're signed into the right Google
  account if access is "Only myself".
- **Changes to `Code.gs` don't show up:** you edited the script but didn't
  create a new deployment version (see step 2 above).
