#!/usr/bin/env node
/**
 * skep.co — build script
 *
 * Usage:
 *   node build.js
 *
 * What it does:
 *   1. Reads books.json
 *   2. Regenerates all library/*.html pages
 *   3. Regenerates the library grid in index.html (between LIBRARY:START / LIBRARY:END markers)
 *
 * To add a book:
 *   1. Add an entry to books.json  (copy the structure of an existing entry)
 *   2. Run: node build.js
 *   3. Run: git add . && git commit -m "add book: <title>" && git push
 *      Cloudflare Pages picks up the push and deploys automatically.
 *
 * Audio / Video:
 *   - YouTube:    set "video": { "youtubeId": "dQw4w9WgXcQ" }
 *   - SoundCloud: set "audio": { "type": "soundcloud", "embedCode": "<iframe ...></iframe>" }
 *   - Direct MP3: set "audio": { "type": "file", "url": "audio/book-name.mp3" }
 *   - Not ready:  leave as null
 */

const fs   = require('fs');
const path = require('path');

const ROOT    = __dirname;
const LIBRARY = path.join(ROOT, 'library');

// ── Load data ────────────────────────────────────────────────────────────────

const books = JSON.parse(fs.readFileSync(path.join(ROOT, 'books.json'), 'utf8'));

// ── Helpers ──────────────────────────────────────────────────────────────────

function esc(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function audioBlock(audio) {
  if (!audio) {
    return `    <div class="media-block">
      <h3>Audio Summary</h3>
      <p class="media-placeholder">Coming soon</p>
    </div>`;
  }
  if (audio.type === 'soundcloud' && audio.embedCode) {
    return `    <div class="media-block">
      <h3>Audio Summary</h3>
      ${audio.embedCode}
    </div>`;
  }
  if (audio.type === 'file' && audio.url) {
    return `    <div class="media-block">
      <h3>Audio Summary</h3>
      <audio controls style="width:100%;margin-top:8px;">
        <source src="../${audio.url}" type="audio/mpeg" />
      </audio>
    </div>`;
  }
  return `    <div class="media-block">
      <h3>Audio Summary</h3>
      <p class="media-placeholder">Coming soon</p>
    </div>`;
}

function videoBlock(video) {
  if (!video) {
    return `    <div class="media-block">
      <h3>Video Breakdown</h3>
      <p class="media-placeholder">Coming soon</p>
    </div>`;
  }
  if (video.youtubeId) {
    return `    <div class="media-block">
      <h3>Video Breakdown</h3>
      <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;margin-top:16px;">
        <iframe
          src="https://www.youtube.com/embed/${esc(video.youtubeId)}"
          style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen loading="lazy">
        </iframe>
      </div>
    </div>`;
  }
  return `    <div class="media-block">
      <h3>Video Breakdown</h3>
      <p class="media-placeholder">Coming soon</p>
    </div>`;
}

// ── Generate library/*.html ───────────────────────────────────────────────────

if (!fs.existsSync(LIBRARY)) fs.mkdirSync(LIBRARY);

books.forEach(book => {
  const descHtml = book.description
    .map(p => `    <p>${esc(p)}</p>`)
    .join('\n');

  const takeawaysHtml = book.takeaways
    .map(t => `      <li>${esc(t)}</li>`)
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(book.title)} — skep.co Library</title>
  <link rel="icon" type="image/svg+xml" href="../favicon.svg" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;500;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Barlow:wght@300;400&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="../css/style.css" />
</head>
<body>
  <nav>
    <a href="/#tools">Tools</a>
    <a href="/#manifesto">Manifesto</a>
    <a href="/#library">Library</a>
  </nav>

  <div class="page-header">
    <a href="/#library" class="page-back">Library</a>
    <h1 class="page-title">${esc(book.title)}</h1>
    <p class="page-author">${esc(book.author)}</p>
  </div>

  <div class="page-content">
    <h2>The Book</h2>
${descHtml}

    <div class="page-divider"></div>

    <h2>Key Takeaways</h2>
    <ul>
${takeawaysHtml}
    </ul>

${audioBlock(book.audio)}

${videoBlock(book.video)}
  </div>

  <footer>
    skep.co · sovereignty lab · privacy absolute · <a href="https://x.com/bigskepper" target="_blank" rel="noopener">@BigSkepper</a>
  </footer>
</body>
</html>
`;

  const outPath = path.join(LIBRARY, `${book.id}.html`);
  fs.writeFileSync(outPath, html, 'utf8');
  console.log(`  ✓ library/${book.id}.html`);
});

// ── Update index.html library grid ───────────────────────────────────────────

const indexPath  = path.join(ROOT, 'index.html');
let   indexHtml  = fs.readFileSync(indexPath, 'utf8');

const START_TAG  = '<!-- LIBRARY:START -->';
const END_TAG    = '<!-- LIBRARY:END -->';

const startIdx = indexHtml.indexOf(START_TAG);
const endIdx   = indexHtml.indexOf(END_TAG);

if (startIdx === -1 || endIdx === -1) {
  console.error('\n  ✗ Could not find LIBRARY:START / LIBRARY:END markers in index.html');
  console.error('    Add them around the library-grid div content and re-run.\n');
  process.exit(1);
}

const gridHtml = books.map((book, i) => {
  const indexTakeawaysHtml = book.indexTakeaways
    .map(t => `              <li>${esc(t)}</li>`)
    .join('\n');

  return `      <a href="library/${book.id}.html" class="book-entry reveal">
        <div class="book-num">${esc(book.num)}</div>
        <div class="book-content">
          <div class="book-header">
            <span class="book-title">${esc(book.title)}</span>
            <span class="book-author">${esc(book.author)}</span>
          </div>
          <p class="book-summary">${esc(book.summary)}</p>
          <div class="book-takeaways">
            <h5>Key takeaways</h5>
            <ul>
${indexTakeawaysHtml}
            </ul>
          </div>
        </div>
      </a>`;
}).join('\n\n');

indexHtml =
  indexHtml.slice(0, startIdx + START_TAG.length) +
  '\n\n' + gridHtml + '\n\n    ' +
  indexHtml.slice(endIdx);

fs.writeFileSync(indexPath, indexHtml, 'utf8');
console.log('  ✓ index.html library grid updated');

console.log(`\n  Done — ${books.length} books built.\n`);
