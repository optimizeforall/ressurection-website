# Church of the Resurrection of Christ

Static website for the Russian Orthodox parish and skete in Fridley, Minnesota.

There is no build step to publish: what you push is what GitHub Pages serves.

```
index.html          Home
about.html          Our parish
services.html       Schedule
visit.html          First visit
contact.html        Address and directions
gallery.html        Photographs
bulletins.html      Weekly bulletins
donate.html         Giving
saints.html         Patron saints
links.html          Further links
404.html            Missing-page page (also redirects old reading URLs)
readings/           Homilies and readings — index and one page each
assets/             Icons, photographs, illustrations
data/               JSON for the schedule, gallery, bulletins and reading list
files/              Bulletin PDFs and the choir recording
styles.css, script.js
```

## Preview on GitHub Pages

After you push `main` to GitHub:

1. Open **Settings → Pages** on this repository:
   [github.com/optimizeforall/ressurection-website/settings/pages](https://github.com/optimizeforall/ressurection-website/settings/pages)
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
3. Set **Branch** to `main` and the folder to `/ (root)`. Save.
4. Wait a minute. The site will be at:

   **https://optimizeforall.github.io/ressurection-website/**

GitHub will also add a **Pages** check on the commit; a green check means it is live.

A later custom domain (for example `resurrectionskete.org`) is set on that same Pages screen. No change to the site files is needed: every link is relative.

## Local preview

From this folder:

```
python -m http.server 8000
```

Then open http://localhost:8000/

## What is not in this repository

- `scrape/` — downloaded copies of the old site and the scripts that built the readings
- `assets/gallery/` — full-resolution originals of the photographs (the site uses `assets/gallery-web/`)
- `screenshots/` — local layout checks
