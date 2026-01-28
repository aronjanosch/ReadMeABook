# E-book Sidecar

**Status:** ✅ Implemented | Optional e-book downloads from Anna's Archive

## Overview
Automatically downloads e-books from Anna's Archive to accompany audiobooks, placing them in the same folder.

## Key Details
- **When:** Runs during file organization (after audiobook copied, after cover art)
- **Matching:** ASIN-based search (exact match)
- **Non-blocking:** Failures don't affect audiobook download
- **Atomic:** Either succeeds or fails gracefully
- **Location:** E-book placed in same directory as audiobook
- **Filename:** `[Title] - [Author].[format]` (sanitized)

## Configuration

**Admin Settings → E-book Sidecar tab**

| Key | Default | Options | Description |
|-----|---------|---------|-------------|
| `ebook_sidecar_enabled` | `false` | `true/false` | Enable feature |
| `ebook_sidecar_preferred_format` | `epub` | `epub, pdf, mobi, azw3, any` | Preferred format |
| `ebook_sidecar_base_url` | `https://annas-archive.li` | URL | Base URL (mirror resilience) |
| `ebook_sidecar_flaresolverr_url` | `` (empty) | URL | FlareSolverr proxy URL (optional) |

**Stored in:** `Configuration` table (database)

## FlareSolverr Integration

Anna's Archive uses Cloudflare protection which may block direct scraping requests. FlareSolverr solves this by using a headless browser to bypass the protection.

### What is FlareSolverr?
- Proxy server using headless Chrome/Chromium
- Automatically solves Cloudflare challenges
- Returns HTML content after challenge is solved
- Open source: https://github.com/FlareSolverr/FlareSolverr

### When to Use FlareSolverr
- **Required:** When e-book downloads consistently fail with no search results
- **Optional:** If direct requests work (depends on Cloudflare's current state)
- **Recommended:** For reliable, consistent downloads

### Setup
1. Run FlareSolverr via Docker:
   ```bash
   docker run -d --name flaresolverr -p 8191:8191 ghcr.io/flaresolverr/flaresolverr:latest
   ```
2. In Admin Settings → E-book Sidecar, enter: `http://localhost:8191`
3. Click "Test Connection" to verify

### How It Works
1. Requests are routed through FlareSolverr
2. FlareSolverr loads the page in headless Chrome
3. If Cloudflare challenge appears, it waits for solution
4. HTML is returned after page loads
5. Falls back to direct requests if FlareSolverr fails

### Performance Impact
- **First request:** ~5-10 seconds (browser startup)
- **Subsequent requests:** ~2-5 seconds per page
- **Total time:** ~15-30 seconds per e-book (vs ~5-15 without)

## How It Works

### Flow
1. **Trigger:** File organization completes audiobook copy
2. **Check:** `ebook_sidecar_enabled === 'true'`
3. **Search:** Try ASIN first (if available), then fall back to title + author
4. **Extract MD5:** First search result → MD5 hash
5. **Get Download Links:** Find "no waitlist" slow download links
6. **Extract URL:** Parse slow download page for actual file server URL
7. **Download:** Stream file to audiobook directory
8. **Rename:** Sanitize filename based on metadata

### Scraping Strategy

**Method 1: ASIN Search (exact match)**
```
Search: https://annas-archive.li/search?ext=epub&lang=en&q="asin:B09TWSRMCB"
  ↓
MD5 Page: https://annas-archive.li/md5/[md5]
  ↓ (Filter: "slow partner server" links)
Slow Download: https://annas-archive.li/slow_download/[md5]/0/5
  ↓ (Parse for actual download URL)
File Server: http://[server-ip]:port/path/to/file.epub
```

**Method 2: Title + Author Search (fallback)**
```
Search: https://annas-archive.li/search?q=The+Housemaid+Freida+McFadden
        &ext=epub
        &content=book_nonfiction&content=book_fiction&content=book_unknown
        &lang=en
  ↓
(Same flow as ASIN search from MD5 page onwards)
```

### Matching Priority
1. **ASIN** (exact match - most accurate, if available)
2. **Title + Author** (fuzzy match with book/language filters)

### Retry Logic
- **Max attempts:** 5 slow download links
- **Timeout:** 60 seconds per download
- **Delays:** 1.5 seconds between requests
- **Retries:** 3x for 5xx errors with exponential backoff

## Format Support

| Format | Extension | Recommended | Notes |
|--------|-----------|-------------|-------|
| EPUB | `.epub` | ✅ Yes | Most compatible with e-readers |
| PDF | `.pdf` | ⚠️ Sometimes | Best for fixed-layout books |
| MOBI | `.mobi` | ⚠️ Legacy | Kindle (older devices) |
| AZW3 | `.azw3` | ⚠️ Sometimes | Kindle (newer devices) |
| Any | `[first available]` | ❌ No | Downloads first match |

**Recommendation:** Use EPUB for maximum compatibility.

## File Naming

**Pattern:** `[Title] - [Author].[format]`

**Sanitization:**
- Remove invalid chars: `<>:"/\|?*`
- Collapse multiple spaces
- Trim leading/trailing spaces and dots
- Limit to 100 characters

**Examples:**
- `The Housemaid - Freida McFadden.epub`
- `Project Hail Mary - Andy Weir.pdf`

## Error Handling

**Graceful Failures (non-blocking):**
- No ASIN available → Skip silently (log info)
- No search results → Log warning, continue audiobook
- No download links → Log warning, continue audiobook
- All downloads fail → Log error, continue audiobook
- Download timeout → Log error, continue audiobook

**Never Blocks Audiobook:**
- All e-book errors are non-fatal
- Audiobook organization completes regardless
- Errors logged to job events (visible in admin)

## Logging

**Success (with FlareSolverr):**
```
E-book sidecar enabled, searching for e-book...
Using FlareSolverr at http://localhost:8191
Searching by ASIN: B09TWSRMCB (format: epub)...
Found via ASIN: 3b6f9c0f1665c4ba6e3214d43c37e1de
Found MD5: 3b6f9c0f1665c4ba6e3214d43c37e1de
Found 8 download link(s)
Attempting download link 1/5...
Downloading from: 93.123.118.12
E-book downloaded: The Housemaid - Freida McFadden.epub
```

**Success (ASIN match, direct):**
```
E-book sidecar enabled, searching for e-book...
Searching by ASIN: B09TWSRMCB (format: epub)...
Found via ASIN: 3b6f9c0f1665c4ba6e3214d43c37e1de
Found MD5: 3b6f9c0f1665c4ba6e3214d43c37e1de
Found 8 download link(s)
Attempting download link 1/5...
Downloading from: 93.123.118.12
E-book downloaded: The Housemaid - Freida McFadden.epub
```

**Success (Title fallback):**
```
E-book sidecar enabled, searching for e-book...
Searching by ASIN: B09TWSRMCB (format: epub)...
No results for ASIN, falling back to title + author search...
Searching by title + author: "The Housemaid" by Freida McFadden...
Found via title search: 3b6f9c0f1665c4ba6e3214d43c37e1de
Found MD5: 3b6f9c0f1665c4ba6e3214d43c37e1de
Found 8 download link(s)
E-book downloaded: The Housemaid - Freida McFadden.epub
```

**Failure:**
```
E-book sidecar enabled, searching for e-book...
Searching by ASIN: B09TWSRMCB (format: epub)...
No results for ASIN, falling back to title + author search...
Searching by title + author: "The Housemaid" by Freida McFadden...
No search results found for title: "The Housemaid" by Freida McFadden
E-book download failed: No search results found (tried ASIN and title+author)
```

## Troubleshooting

### E-book Not Downloaded

**Cause:** No matching e-book in Anna's Archive (tried ASIN and title+author)
**Solution:** Not all audiobooks have e-book equivalents, this is expected

**Cause:** ASIN mismatch (Anna's Archive has different ASIN)
**Solution:** Feature now automatically falls back to title + author search

**Cause:** All download links failed
**Solution:** Check job logs for errors, may be temporary server issues

### Wrong Format Downloaded

**Cause:** Preferred format not available
**Solution:** Anna's Archive doesn't have that format, falls back to available format

### Download Timeout

**Cause:** Slow file server or large file
**Solution:** Automatic retry with next download link

### Feature Not Working

**Cause:** Feature disabled
**Solution:** Admin Settings → E-book Sidecar → Enable toggle

### Cloudflare Blocking

**Cause:** Anna's Archive has Cloudflare protection enabled
**Solution:** Configure FlareSolverr (see FlareSolverr Integration section)

**Symptoms:**
- No search results found
- Requests timing out
- Errors about Cloudflare challenge

### FlareSolverr Not Working

**Cause:** FlareSolverr not running or unreachable
**Solution:**
1. Verify FlareSolverr is running: `docker ps | grep flaresolverr`
2. Check URL is correct (usually `http://localhost:8191`)
3. Test connection in Admin Settings

**Cause:** FlareSolverr timing out
**Solution:** FlareSolverr may need more time; check container logs for errors

## Security & Legal

**Important Notes:**
- Anna's Archive is a shadow library
- Use at your own discretion and responsibility
- Ensure compliance with local laws and regulations
- Feature is optional and disabled by default
- No API key required (web scraping)

**Privacy:**
- User-Agent: `ReadMeABook/1.0 (Audiobook Automation)`
- No tracking or analytics
- Distributed (each user scrapes for themselves)

## Technical Implementation

**Files:**
- Service: `src/lib/services/ebook-scraper.ts`
- Integration: `src/lib/utils/file-organizer.ts` (line 265+)
- Settings API: `src/app/api/admin/settings/ebook/route.ts`
- FlareSolverr Test API: `src/app/api/admin/settings/ebook/test-flaresolverr/route.ts`
- UI: `src/app/admin/settings/page.tsx` (ebook tab)

**Dependencies:**
- axios (HTTP requests)
- cheerio (HTML parsing)
- fs/promises (file operations)

**Caching:**
- MD5 lookups cached in-memory (prevents re-scraping same ASIN)
- Cache cleared on service restart

## Performance

**Impact:**
- **Network:** 3-5 requests per e-book (search, MD5, slow download pages)
- **Time:** ~5-15 seconds per e-book (depends on file server)
- **Storage:** E-books typically 1-50 MB
- **CPU:** Minimal (streaming download)

## Limitations

1. **Match Accuracy:** Title + author search may return wrong book if title is common
2. **Format Availability:** Depends on Anna's Archive catalog
3. **Download Speed:** Depends on file server load
4. **Language:** Title search filters for English books only
5. **Success Rate:** ~70-90% (ASIN has higher accuracy, title fallback is less precise)

## Future Enhancements

- ISBN-13 fallback matching (between ASIN and title search)
- Format preference priority list (try EPUB, then PDF, then MOBI)
- Per-request override (API endpoint)
- Statistics tracking (success rate, formats, match method)
- Rate limit monitoring
- Relevance scoring for title search results

## Related
- [File Organization](../phase3/file-organization.md) - Where e-book download happens
- [Settings Pages](../settings-pages.md) - Configuration UI
- [Configuration Service](../backend/services/config.md) - Settings storage
