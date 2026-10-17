/**
 * Webcomic Reading Tracker — Google Apps Script backend
 * ------------------------------------------------------
 * Deploy this as a Web App (Execute as: Me, Access: Anyone with the link
 * or Anyone within your org — see README for details).
 *
 * Spreadsheet: https://docs.google.com/spreadsheets/d/1cakHbYQpSCNhnenp8U848xdhLtFxMGsd2If-DEVxPCg/edit
 */

// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------

var SPREADSHEET_ID = '1cakHbYQpSCNhnenp8U848xdhLtFxMGsd2If-DEVxPCg';
var COMICS_SHEET_NAME = 'Comics';
var HISTORY_SHEET_NAME = 'History';

var COMICS_HEADERS = [
  'ID', 'Webcomic Name', 'Latest Completed Chapter', 'Latest Chapter URL',
  'Website', 'Domain', 'Date First Added', 'Date Last Updated', 'Notes',
  'Normalized Title', 'Cover Image URL', 'Status', 'Favorite', 'Cover Position', 'Vault',
  'Alt Title', 'Use Alt Title'
];

// Valid values for the Status column. Stored in the sheet exactly as written here.
var COMIC_STATUSES = ['Reading', 'Completed', 'On Hold', 'Dropped'];
var DEFAULT_COMIC_STATUS = 'Reading';

var HISTORY_HEADERS = [
  'History ID', 'Comic ID', 'Webcomic Name', 'Chapter', 'Chapter URL',
  'Website', 'Date Completed', 'Date Recorded'
];

var LOCK_TIMEOUT_MS = 10000;

// ---------------------------------------------------------------------------
// ENTRY POINTS
// ---------------------------------------------------------------------------

function doGet(e) {
  try {
    var action = e && e.parameter && e.parameter.action;
    var result;

    switch (action) {
      case 'getComics':
        result = getComics();
        break;
      case 'getComic':
        result = getComic(e.parameter.id);
        break;
      case 'getHistory':
        result = getHistory(e.parameter.comicId);
        break;
      case 'fetchCoverImage':
        result = { url: fetchCoverImageFromUrl_(e.parameter.url) };
        break;
      default:
        return jsonResponse(apiError('Unknown or missing action: ' + action));
    }

    return jsonResponse(apiSuccess(result));
  } catch (err) {
    return jsonResponse(apiError(err && err.message ? err.message : String(err)));
  }
}

function doPost(e) {
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
    var action = body.action || (e && e.parameter && e.parameter.action);
    var data = body.data || {};
    var result;

    switch (action) {
      case 'addOrUpdateComic':
        result = addOrUpdateComic(data);
        break;
      case 'addComic':
        result = addComic(data);
        break;
      case 'updateComic':
        result = updateComic(data.id, data);
        break;
      case 'deleteComic':
        result = deleteComic(data.id, !!data.deleteHistory, data.vaultToken);
        break;
      case 'uploadCoverImage':
        result = uploadCoverImage(data);
        break;
      case 'getHistory':
        // POST variant so a vault session token never travels in a URL.
        result = getHistory(data.comicId, data.vaultToken);
        break;
      case 'vaultStatus':
        result = vaultStatus();
        break;
      case 'vaultSetup':
        result = vaultSetup(data.password);
        break;
      case 'vaultUnlock':
        result = vaultUnlock(data.password);
        break;
      case 'vaultLock':
        result = vaultLock(data.vaultToken);
        break;
      case 'vaultList':
        result = vaultList(data.vaultToken);
        break;
      case 'vaultChangePassword':
        result = vaultChangePassword(data.vaultToken, data.oldPassword, data.newPassword);
        break;
      default:
        return jsonResponse(apiError('Unknown or missing action: ' + action));
    }

    return jsonResponse(apiSuccess(result));
  } catch (err) {
    return jsonResponse(apiError(err && err.message ? err.message : String(err)));
  }
}

// ---------------------------------------------------------------------------
// API RESPONSE HELPERS
// ---------------------------------------------------------------------------

function apiSuccess(data) {
  return { success: true, data: data, error: null };
}

function apiError(message) {
  return { success: false, data: null, error: message };
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------------------
// SPREADSHEET ACCESS
// ---------------------------------------------------------------------------

function getSpreadsheet_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getOrCreateSheet_(name, headers) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getComicsSheet_() {
  var sheet = getOrCreateSheet_(COMICS_SHEET_NAME, COMICS_HEADERS);
  ensureComicsHeaders_(sheet);
  return sheet;
}

/**
 * Migration helper: if this sheet was created before the "Cover Image URL"
 * column existed, add any missing headers from COMICS_HEADERS onto the end
 * without touching existing data.
 */
function ensureComicsHeaders_(sheet) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var existing = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  for (var i = 0; i < COMICS_HEADERS.length; i++) {
    if (existing.indexOf(COMICS_HEADERS[i]) === -1) {
      sheet.getRange(1, lastCol + 1).setValue(COMICS_HEADERS[i]);
      lastCol++;
    }
  }
}

function getHistorySheet_() {
  return getOrCreateSheet_(HISTORY_SHEET_NAME, HISTORY_HEADERS);
}

/** Reads all rows of a sheet as an array of objects keyed by header name. */
function readSheetAsObjects_(sheet) {
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2) return [];
  var values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var out = [];
  for (var r = 0; r < values.length; r++) {
    var row = values[r];
    // skip fully blank rows
    var blank = row.every(function (c) { return c === '' || c === null; });
    if (blank) continue;
    var obj = { _row: r + 2 };
    for (var c = 0; c < headers.length; c++) {
      obj[headers[c]] = row[c];
    }
    out.push(obj);
  }
  return out;
}

// ---------------------------------------------------------------------------
// NORMALIZATION / VALIDATION
// ---------------------------------------------------------------------------

function normalizeTitle_(title) {
  if (!title) return '';
  var t = String(title).toLowerCase();
  t = t.replace(/[_\-]+/g, ' ');       // hyphens/underscores -> space
  t = t.replace(/['’`]/g, '');          // strip apostrophes
  t = t.replace(/[^a-z0-9 ]+/g, ' ');   // strip punctuation
  t = t.replace(/\s+/g, ' ').trim();    // collapse whitespace
  return t;
}

function titleCaseFromSlug_(slug) {
  if (!slug) return '';
  var decoded = decodeURIComponent(slug.replace(/\+/g, ' '));
  var words = decoded.replace(/[_\-]+/g, ' ').trim().split(/\s+/);
  var smallWords = { 'a': 1, 'an': 1, 'and': 1, 'as': 1, 'at': 1, 'but': 1,
    'by': 1, 'for': 1, 'in': 1, 'of': 1, 'on': 1, 'or': 1, 'the': 1, 'to': 1,
    'with': 1, 'is': 1 };
  var result = words.map(function (w, i) {
    var lw = w.toLowerCase();
    if (i !== 0 && smallWords[lw]) return lw;
    return lw.charAt(0).toUpperCase() + lw.slice(1);
  });
  return result.join(' ');
}

function isValidUrl_(url) {
  if (!url || typeof url !== 'string') return false;
  return /^https?:\/\/.+/i.test(url.trim());
}

function isValidChapter_(chapter) {
  if (chapter === null || chapter === undefined || chapter === '') return false;
  var n = Number(chapter);
  return !isNaN(n) && n >= 0;
}

function todayStr_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'UTC', 'yyyy-MM-dd');
}

function generateId_(prefix) {
  return prefix + '_' + Utilities.getUuid().replace(/-/g, '').substring(0, 10);
}

function domainFromUrl_(url) {
  try {
    var m = String(url).match(/^https?:\/\/([^\/]+)/i);
    if (!m) return '';
    var host = m[1].toLowerCase();
    host = host.replace(/^www\./, '');
    return host;
  } catch (e) {
    return '';
  }
}

function websiteNameFromDomain_(domain) {
  if (!domain) return '';
  var base = domain.split('.')[0];
  // known aliases for nicer display names
  var known = {
    'mangaread': 'MangaRead',
    'vortexscans': 'Vortex Scans',
    'topmanhua': 'TopManhua'
  };
  if (known[base]) return known[base];
  // Title-case, split on common separators
  var words = base.replace(/[_\-]+/g, ' ').split(/(?=[A-Z])/).join(' ').split(/\s+/);
  return words.map(function (w) {
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(' ');
}

// ---------------------------------------------------------------------------
// COVER IMAGE FETCHING
// ---------------------------------------------------------------------------

/**
 * Fetches a chapter page server-side (avoids browser CORS restrictions) and
 * pulls a cover/thumbnail image URL out of its <meta property="og:image">
 * or <meta name="twitter:image"> tag, falling back to the first plausible
 * <img> tag on the page. Returns '' if nothing usable is found or the page
 * can't be fetched.
 */
function fetchCoverImageFromUrl_(url) {
  if (!isValidUrl_(url)) return '';
  try {
    var response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      followRedirects: true,
      validateHttpsCertificates: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WebcomicTrackerBot/1.0)'
      }
    });
    if (response.getResponseCode() >= 400) return '';
    var html = response.getContentText();

    var ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (ogMatch && ogMatch[1]) return resolveUrl_(url, ogMatch[1]);

    var twitterMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
    if (twitterMatch && twitterMatch[1]) return resolveUrl_(url, twitterMatch[1]);

    // Fallback: first reasonably large-looking <img> tag in the main content.
    var imgMatches = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi) || [];
    for (var i = 0; i < imgMatches.length; i++) {
      var srcMatch = imgMatches[i].match(/src=["']([^"']+)["']/i);
      if (!srcMatch) continue;
      var src = srcMatch[1];
      if (/\.(svg|gif)(\?|$)/i.test(src)) continue; // skip icons/logos
      if (/logo|icon|avatar|sprite/i.test(src)) continue;
      return resolveUrl_(url, src);
    }

    return '';
  } catch (err) {
    return '';
  }
}

var COVERS_FOLDER_NAME = 'Webcomic Tracker Covers';
var MAX_UPLOAD_BYTES = 6 * 1024 * 1024; // 6MB, generous for a cover thumbnail

/**
 * Accepts a pasted or uploaded image (base64-encoded) from the frontend,
 * stores it in a dedicated Google Drive folder, makes it viewable via link,
 * and returns a direct-embeddable image URL.
 * data: { imageBase64 (no data: prefix), mimeType, filename? }
 */
function uploadCoverImage(data) {
  if (!data || !data.imageBase64) {
    throw new Error('No image data received.');
  }
  var mimeType = data.mimeType || 'image/jpeg';
  if (!/^image\//.test(mimeType)) {
    throw new Error('Only image files can be used as a cover.');
  }

  var base64 = String(data.imageBase64).replace(/^data:[^,]+,/, '');
  var approxBytes = Math.floor(base64.length * 0.75);
  if (approxBytes > MAX_UPLOAD_BYTES) {
    throw new Error('That image is too large (max 6MB). Try a smaller image.');
  }

  var bytes;
  try {
    bytes = Utilities.base64Decode(base64);
  } catch (err) {
    throw new Error('Could not read that image file.');
  }

  var extension = mimeType.split('/')[1] || 'jpg';
  var filename = (data.filename || 'cover') + '-' + Utilities.getUuid().substring(0, 8) + '.' + extension;
  var blob = Utilities.newBlob(bytes, mimeType, filename);

  var folder = getOrCreateCoversFolder_();
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  var fileId = file.getId();
  return {
    url: 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w600',
    fileId: fileId
  };
}

function getOrCreateCoversFolder_() {
  var folders = DriveApp.getFoldersByName(COVERS_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(COVERS_FOLDER_NAME);
}

/** Resolves a possibly-relative image URL against the page URL it came from. */
function resolveUrl_(pageUrl, imageUrl) {
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  try {
    if (imageUrl.indexOf('//') === 0) {
      var scheme = pageUrl.match(/^https?:/i)[0];
      return scheme + imageUrl;
    }
    var origin = pageUrl.match(/^https?:\/\/[^\/]+/i)[0];
    if (imageUrl.indexOf('/') === 0) return origin + imageUrl;
    return origin + '/' + imageUrl;
  } catch (err) {
    return imageUrl;
  }
}

// ---------------------------------------------------------------------------
// COMICS CRUD
// ---------------------------------------------------------------------------

function comicRowToObject_(row) {
  return {
    id: row['ID'],
    title: row['Webcomic Name'],
    chapter: row['Latest Completed Chapter'],
    url: row['Latest Chapter URL'],
    website: row['Website'],
    domain: row['Domain'],
    dateFirstAdded: formatDateCell_(row['Date First Added']),
    dateLastUpdated: formatDateCell_(row['Date Last Updated']),
    notes: row['Notes'] || '',
    normalizedTitle: row['Normalized Title'],
    coverImageUrl: row['Cover Image URL'] || '',
    status: row['Status'] || DEFAULT_COMIC_STATUS,
    isFavorite: row['Favorite'] === true || row['Favorite'] === 'TRUE' || row['Favorite'] === 'true',
    coverPosition: normalizeCoverPosition_(row['Cover Position']),
    inVault: isVaultRow_(row),
    altTitle: String(row['Alt Title'] || ''),
    useAltTitle: isTruthy_(row['Use Alt Title']) && !!String(row['Alt Title'] || '').trim(),
    _row: row._row
  };
}

/** Coerces any incoming status value to one of COMIC_STATUSES, falling back to the default. */
function normalizeStatus_(status) {
  if (COMIC_STATUSES.indexOf(status) !== -1) return status;
  return DEFAULT_COMIC_STATUS;
}

/** Vertical focal point (0-100) for cropping the cover thumbnail; 50 = centered. */
function normalizeCoverPosition_(value) {
  var n = Number(value);
  if (isNaN(n) || value === '' || value === null || value === undefined) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function formatDateCell_(val) {
  if (!val) return '';
  if (Object.prototype.toString.call(val) === '[object Date]') {
    return Utilities.formatDate(val, Session.getScriptTimeZone() || 'UTC', 'yyyy-MM-dd');
  }
  return String(val);
}

/** Public library list: vault titles are NEVER included here. */
function getComics() {
  var sheet = getComicsSheet_();
  var rows = readSheetAsObjects_(sheet);
  return rows.filter(function (r) { return !isVaultRow_(r); }).map(comicRowToObject_);
}

/** Public lookup (GET). Vault titles look exactly like "not found". */
function getComic(id) {
  if (!id) throw new Error('Missing comic id');
  var rows = readSheetAsObjects_(getComicsSheet_());
  for (var i = 0; i < rows.length; i++) {
    if (rows[i]['ID'] === id) return isVaultRow_(rows[i]) ? null : comicRowToObject_(rows[i]);
  }
  return null;
}

/** Internal lookup that ignores the vault flag. Only call after authorising the caller. */
function getComicAny_(id) {
  var rows = readSheetAsObjects_(getComicsSheet_());
  for (var i = 0; i < rows.length; i++) {
    if (rows[i]['ID'] === id) return comicRowToObject_(rows[i]);
  }
  return null;
}

function findComicByNormalizedTitle(normalizedTitle) {
  var rows = readSheetAsObjects_(getComicsSheet_());
  for (var i = 0; i < rows.length; i++) {
    if (rows[i]['Normalized Title'] === normalizedTitle && !isVaultRow_(rows[i])) return comicRowToObject_(rows[i]);
  }
  return null;
}

/** Low-level insert. Expects data already validated/normalized. */
function addComic(data) {
  var lock = LockService.getScriptLock();
  lock.waitLock(LOCK_TIMEOUT_MS);
  try {
    validateComicInput_(data, false);
    var sheet = getComicsSheet_();

    var normalizedTitle = normalizeTitle_(data.title);
    var existing = findComicByNormalizedTitleUnlocked_(sheet, normalizedTitle);
    if (existing) {
      // Never reveal that a vault title exists to a caller without a vault session.
      if (existing.inVault && !isVaultSession_(data.vaultToken)) throw new Error('Unable to save this title.');
      throw new Error('A comic with this title already exists (id: ' + existing.id + '). Use addOrUpdateComic instead.');
    }
    var wantsVault = data.inVault === true;
    if (wantsVault) requireVaultSession_(data.vaultToken);

    var id = generateId_('comic');
    var today = todayStr_();
    var row = [
      id,
      data.title,
      data.chapter,
      data.url,
      data.website || '',
      data.domain || domainFromUrl_(data.url),
      today,
      today,
      data.notes || '',
      normalizedTitle,
      data.coverImageUrl || '',
      normalizeStatus_(data.status),
      !!data.isFavorite,
      normalizeCoverPosition_(data.coverPosition),
      wantsVault,
      cleanAltTitle_(data.altTitle),
      !!data.useAltTitle && !!cleanAltTitle_(data.altTitle)
    ];
    sheet.appendRow(row);

    addHistoryEntry({
      comicId: id,
      title: data.title,
      chapter: data.chapter,
      url: data.url,
      website: data.website || '',
      dateCompleted: today
    });

    return getComicAny_(id);
  } finally {
    lock.releaseLock();
  }
}

function updateComic(id, data) {
  var lock = LockService.getScriptLock();
  lock.waitLock(LOCK_TIMEOUT_MS);
  try {
    if (!id) throw new Error('Missing comic id');
    var sheet = getComicsSheet_();
    var rows = readSheetAsObjects_(sheet);
    var target = null;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i]['ID'] === id) { target = rows[i]; break; }
    }
    if (!target) throw new Error('Comic not found: ' + id);
    // Vault titles can only be touched with a live vault session, and otherwise
    // look exactly like a missing row.
    var targetInVault = isVaultRow_(target);
    if (targetInVault && !isVaultSession_(data.vaultToken)) throw new Error('Comic not found: ' + id);
    // Moving a title into or out of the vault also needs a session.
    var vaultChange = data.inVault !== undefined && !!data.inVault !== targetInVault;
    if (vaultChange) requireVaultSession_(data.vaultToken);

    validateComicInput_(data, true);

    var title = data.title !== undefined ? data.title : target['Webcomic Name'];
    var chapter = data.chapter !== undefined ? data.chapter : target['Latest Completed Chapter'];
    var url = data.url !== undefined ? data.url : target['Latest Chapter URL'];
    var website = data.website !== undefined ? data.website : target['Website'];
    var domain = data.domain !== undefined ? data.domain : target['Domain'];
    var notes = data.notes !== undefined ? data.notes : target['Notes'];
    var dateLastUpdated = data.dateLastUpdated || todayStr_();
    var normalizedTitle = normalizeTitle_(title);
    var coverImageUrl = data.coverImageUrl !== undefined ? data.coverImageUrl : target['Cover Image URL'];
    var status = data.status !== undefined ? normalizeStatus_(data.status) : (target['Status'] || DEFAULT_COMIC_STATUS);
    var isFavorite = data.isFavorite !== undefined
      ? !!data.isFavorite
      : (target['Favorite'] === true || target['Favorite'] === 'TRUE' || target['Favorite'] === 'true');
    var coverPosition = data.coverPosition !== undefined
      ? normalizeCoverPosition_(data.coverPosition)
      : normalizeCoverPosition_(target['Cover Position']);

    var rowNum = target._row;
    // ID, Title, Chapter, URL, Website, Domain, FirstAdded, LastUpdated, Notes, NormalizedTitle, CoverImageUrl, Status, Favorite, CoverPosition
    sheet.getRange(rowNum, 2, 1, 13).setValues([[
      title, chapter, url, website, domain,
      target['Date First Added'], dateLastUpdated, notes, normalizedTitle, coverImageUrl || '', status, isFavorite, coverPosition
    ]]);
    if (vaultChange) {
      sheet.getRange(rowNum, vaultColumn_(sheet)).setValue(!!data.inVault);
    }
    writeAltTitle_(sheet, rowNum, data, target['Alt Title'], target['Use Alt Title']);

    return getComicAny_(id);
  } finally {
    lock.releaseLock();
  }
}

function deleteComic(id, deleteHistory, vaultToken) {
  var lock = LockService.getScriptLock();
  lock.waitLock(LOCK_TIMEOUT_MS);
  try {
    if (!id) throw new Error('Missing comic id');
    var sheet = getComicsSheet_();
    var rows = readSheetAsObjects_(sheet);
    var target = null;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i]['ID'] === id) { target = rows[i]; break; }
    }
    if (!target) throw new Error('Comic not found: ' + id);
    if (isVaultRow_(target)) requireVaultSession_(vaultToken);
    sheet.deleteRow(target._row);

    if (deleteHistory) {
      var hSheet = getHistorySheet_();
      var hRows = readSheetAsObjects_(hSheet);
      // delete from bottom up to keep row numbers valid
      for (var j = hRows.length - 1; j >= 0; j--) {
        if (hRows[j]['Comic ID'] === id) {
          hSheet.deleteRow(hRows[j]._row);
        }
      }
    }

    return { id: id, deleted: true };
  } finally {
    lock.releaseLock();
  }
}

/**
 * The core "Add or Update Comic From URL" operation.
 * data: { title, chapter, url, website, domain, notes?, forceOverwrite? }
 */
function addOrUpdateComic(data) {
  var lock = LockService.getScriptLock();
  lock.waitLock(LOCK_TIMEOUT_MS);
  try {
    validateComicInput_(data, false);

    var sheet = getComicsSheet_();
    var normalizedTitle = normalizeTitle_(data.title);
    var existing = findComicByNormalizedTitleUnlocked_(sheet, normalizedTitle);
    var today = todayStr_();
    var domain = data.domain || domainFromUrl_(data.url);
    var website = data.website || websiteNameFromDomain_(domain);
    var newChapter = Number(data.chapter);

    if (existing && existing.inVault && !isVaultSession_(data.vaultToken)) {
      // Same answer whether or not a hidden title exists: nothing is revealed.
      throw new Error('Unable to save this title.');
    }
    var wantsVault = data.inVault === true;
    var vaultChange = data.inVault !== undefined && (!existing || !!data.inVault !== existing.inVault);
    if (vaultChange) requireVaultSession_(data.vaultToken);

    if (!existing) {
      var id = generateId_('comic');
      var row = [
        id, data.title, newChapter, data.url, website, domain,
        today, today, data.notes || '', normalizedTitle, data.coverImageUrl || '',
        normalizeStatus_(data.status), !!data.isFavorite, normalizeCoverPosition_(data.coverPosition),
        wantsVault,
        cleanAltTitle_(data.altTitle),
        !!data.useAltTitle && !!cleanAltTitle_(data.altTitle)
      ];
      sheet.appendRow(row);
      addHistoryEntryUnlocked_({
        comicId: id, title: data.title, chapter: newChapter, url: data.url,
        website: website, dateCompleted: today
      });
      return {
        comic: getComicAny_(id),
        status: 'created',
        warning: null
      };
    }

    var existingChapter = Number(existing.chapter);
    var isLower = !isNaN(existingChapter) && newChapter < existingChapter;
    var isSame = !isNaN(existingChapter) && newChapter === existingChapter;

    if (isLower && !data.forceOverwrite) {
      return {
        comic: existing,
        status: 'needs_confirmation',
        warning: 'You currently have Chapter ' + existingChapter + ' saved. Replace it with Chapter ' + newChapter + '?'
      };
    }

    var urlChanged = existing.url !== data.url;
    var websiteChanged = existing.website !== website;
    var materialChange = !isSame || urlChanged || websiteChanged;
    var coverImageUrl = data.coverImageUrl !== undefined && data.coverImageUrl !== ''
      ? data.coverImageUrl
      : existing.coverImageUrl;
    // A fresh chapter update implicitly resumes an on-hold/dropped/completed comic
    // (a real new chapter showed up), unless the caller explicitly set a status
    // (e.g. from the edit form) or this is just a same-chapter refresh.
    var status = data.status !== undefined
      ? normalizeStatus_(data.status)
      : (existing.status === 'Completed' && isSame ? existing.status : DEFAULT_COMIC_STATUS);

    // A chapter-URL update (add/refresh) never touches the favorite flag or the
    // cover crop position — those are only ever changed explicitly, from the
    // list/card star toggle or the edit form.
    var isFavorite = data.isFavorite !== undefined ? !!data.isFavorite : existing.isFavorite;
    var coverPosition = data.coverPosition !== undefined
      ? normalizeCoverPosition_(data.coverPosition)
      : normalizeCoverPosition_(existing.coverPosition);

    sheet.getRange(existing._row, 2, 1, 13).setValues([[
      data.title, newChapter, data.url, website, domain,
      existing.dateFirstAdded, today, data.notes !== undefined ? data.notes : existing.notes,
      normalizedTitle, coverImageUrl || '', status, isFavorite, coverPosition
    ]]);

    if (vaultChange) {
      sheet.getRange(existing._row, vaultColumn_(sheet)).setValue(!!data.inVault);
    }
    writeAltTitle_(sheet, existing._row, data, existing.altTitle, existing.useAltTitle);

    if (materialChange) {
      addHistoryEntryUnlocked_({
        comicId: existing.id, title: data.title, chapter: newChapter, url: data.url,
        website: website, dateCompleted: today
      });
    }

    return {
      comic: getComicAny_(existing.id),
      status: isSame ? 'refreshed' : 'updated',
      warning: null
    };
  } finally {
    lock.releaseLock();
  }
}

function findComicByNormalizedTitleUnlocked_(sheet, normalizedTitle) {
  var rows = readSheetAsObjects_(sheet);
  for (var i = 0; i < rows.length; i++) {
    if (rows[i]['Normalized Title'] === normalizedTitle) return comicRowToObject_(rows[i]);
  }
  return null;
}

// ---------------------------------------------------------------------------
// ALTERNATE TITLE
// "Webcomic Name" always holds the title taken from the chapter URL (it is what
// new chapters are matched against). "Alt Title" is a display-only name the user
// chooses; "Use Alt Title" says which of the two the app shows.
// ---------------------------------------------------------------------------

function isTruthy_(v) {
  return v === true || v === 'TRUE' || v === 'true';
}

function cleanAltTitle_(v) {
  if (v === undefined || v === null) return '';
  return String(v).replace(/\s+/g, ' ').trim().substring(0, 200);
}

function columnByHeader_(sheet, header) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var idx = sheet.getRange(1, 1, 1, lastCol).getValues()[0].indexOf(header);
  if (idx === -1) throw new Error(header + ' column is missing from the Comics sheet.');
  return idx + 1;
}

/** Writes Alt Title / Use Alt Title only when the caller sent them; otherwise leaves both untouched. */
function writeAltTitle_(sheet, rowNum, data, currentAlt, currentUse) {
  if (data.altTitle === undefined && data.useAltTitle === undefined) return;
  var alt = data.altTitle !== undefined ? cleanAltTitle_(data.altTitle) : cleanAltTitle_(currentAlt);
  var use = data.useAltTitle !== undefined ? !!data.useAltTitle : isTruthy_(currentUse);
  sheet.getRange(rowNum, columnByHeader_(sheet, 'Alt Title')).setValue(alt);
  sheet.getRange(rowNum, columnByHeader_(sheet, 'Use Alt Title')).setValue(use && !!alt);
}

function validateComicInput_(data, isUpdate) {
  if (!isUpdate || data.title !== undefined) {
    if (!data.title || !String(data.title).trim()) {
      throw new Error('Title is required.');
    }
  }
  if (!isUpdate || data.url !== undefined) {
    if (!isValidUrl_(data.url)) {
      throw new Error('A valid chapter URL (starting with http:// or https://) is required.');
    }
  }
  if (!isUpdate || data.chapter !== undefined) {
    if (!isValidChapter_(data.chapter)) {
      throw new Error('A valid chapter number is required.');
    }
  }
}

// ---------------------------------------------------------------------------
// HISTORY
// ---------------------------------------------------------------------------

function historyRowToObject_(row) {
  return {
    id: row['History ID'],
    comicId: row['Comic ID'],
    title: row['Webcomic Name'],
    chapter: row['Chapter'],
    url: row['Chapter URL'],
    website: row['Website'],
    dateCompleted: formatDateCell_(row['Date Completed']),
    dateRecorded: formatDateCell_(row['Date Recorded'])
  };
}

function getHistory(comicId, vaultToken) {
  if (!comicId) throw new Error('Missing comicId');
  // History rows carry the title, so a vault comic's history is vault-only too.
  var owner = getComicAny_(comicId);
  if (owner && owner.inVault && !isVaultSession_(vaultToken)) return [];
  var rows = readSheetAsObjects_(getHistorySheet_());
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    if (rows[i]['Comic ID'] === comicId) out.push(historyRowToObject_(rows[i]));
  }
  // most recent first
  out.sort(function (a, b) {
    return (b.dateCompleted + b.dateRecorded).localeCompare(a.dateCompleted + a.dateRecorded);
  });
  return out;
}

function addHistoryEntry(data) {
  var lock = LockService.getScriptLock();
  lock.waitLock(LOCK_TIMEOUT_MS);
  try {
    return addHistoryEntryUnlocked_(data);
  } finally {
    lock.releaseLock();
  }
}

function addHistoryEntryUnlocked_(data) {
  if (!data.comicId || !data.chapter || !data.url) {
    throw new Error('History entry requires comicId, chapter, and url.');
  }
  var sheet = getHistorySheet_();
  var id = generateId_('history');
  var today = todayStr_();
  sheet.appendRow([
    id, data.comicId, data.title || '', data.chapter, data.url,
    data.website || '', data.dateCompleted || today, today
  ]);
  return { id: id };
}

// ---------------------------------------------------------------------------
// VAULT (password-protected, server-enforced)
// ---------------------------------------------------------------------------
//
// Titles whose "Vault" column is TRUE are withheld from every public endpoint
// (getComics, getComic, getHistory, duplicate checks). They are only readable or
// writable with a session token obtained by unlocking with the vault password.
//
//  - The password is never stored: only a salted, iterated SHA-256 hash lives in
//    Script Properties (visible to the script owner only).
//  - Sessions live in CacheService with a sliding VAULT_SESSION_SECONDS idle
//    timeout; changing the password invalidates every session.
//  - Wrong guesses are rate-limited: VAULT_MAX_FAILS in a row locks unlocking for
//    VAULT_LOCKOUT_SECONDS. (The limit is global, because Apps Script can't see the
//    caller's IP, so someone hammering the URL can briefly lock you out too.)
//
// NOTE: this protects the web app. Anyone with edit/view access to the Google Sheet
// itself, or to the cover images in Drive, can still see vault titles there.

var VAULT_SESSION_SECONDS = 600;     // 10 min idle
var VAULT_MAX_FAILS = 5;
var VAULT_LOCKOUT_SECONDS = 900;     // 15 min
var VAULT_HASH_ROUNDS = 3000;
var VAULT_MIN_PASSWORD_LENGTH = 6;

function isVaultRow_(row) {
  var v = row['Vault'];
  return v === true || v === 'TRUE' || v === 'true';
}

/** 1-based column number of the Vault column (added to the sheet automatically if missing). */
function vaultColumn_(sheet) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var idx = headers.indexOf('Vault');
  if (idx === -1) throw new Error('Vault column is missing from the Comics sheet.');
  return idx + 1;
}

function bytesToHex_(bytes) {
  var out = '';
  for (var i = 0; i < bytes.length; i++) {
    var b = bytes[i] < 0 ? bytes[i] + 256 : bytes[i];
    out += (b < 16 ? '0' : '') + b.toString(16);
  }
  return out;
}

function hashVaultPassword_(password, salt) {
  var h = salt + '|' + password;
  for (var i = 0; i < VAULT_HASH_ROUNDS; i++) {
    h = bytesToHex_(Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256, h + '|' + salt, Utilities.Charset.UTF_8));
  }
  return h;
}

function safeEquals_(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function vaultProps_() { return PropertiesService.getScriptProperties(); }
function vaultCache_() { return CacheService.getScriptCache(); }

function vaultConfigured_() {
  return !!vaultProps_().getProperty('VAULT_HASH');
}

function vaultEpoch_() {
  return vaultProps_().getProperty('VAULT_EPOCH') || '0';
}

function newVaultSession_() {
  var token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  vaultCache_().put('vs:' + token, vaultEpoch_(), VAULT_SESSION_SECONDS);
  return token;
}

/** True if the token is a live vault session. Each successful check slides the idle timeout. */
function isVaultSession_(token) {
  if (!token || typeof token !== 'string' || token.length < 32) return false;
  var cache = vaultCache_();
  var v = cache.get('vs:' + token);
  if (v === null || v === undefined || String(v) !== vaultEpoch_()) return false;
  cache.put('vs:' + token, v, VAULT_SESSION_SECONDS);
  return true;
}

function requireVaultSession_(token) {
  if (!isVaultSession_(token)) throw new Error('The vault is locked. Unlock it and try again.');
}

function validateNewVaultPassword_(password) {
  if (typeof password !== 'string' || password.length < VAULT_MIN_PASSWORD_LENGTH) {
    throw new Error('Choose a password of at least ' + VAULT_MIN_PASSWORD_LENGTH + ' characters.');
  }
  if (password.length > 200) throw new Error('That password is too long.');
}

function storeVaultPassword_(password) {
  var salt = Utilities.getUuid();
  var props = vaultProps_();
  props.setProperty('VAULT_SALT', salt);
  props.setProperty('VAULT_HASH', hashVaultPassword_(password, salt));
  // Bumping the epoch invalidates every session issued before this point.
  props.setProperty('VAULT_EPOCH', String(Number(vaultEpoch_()) + 1));
}

/** Throws if unlocking is currently locked out; otherwise checks the password. */
function checkVaultPassword_(password) {
  var cache = vaultCache_();
  if (cache.get('vault_lockout')) {
    throw new Error('Too many wrong passwords. Try again in a few minutes.');
  }
  var props = vaultProps_();
  var ok = typeof password === 'string' &&
    safeEquals_(hashVaultPassword_(password, props.getProperty('VAULT_SALT') || ''), props.getProperty('VAULT_HASH') || '');
  if (ok) {
    cache.remove('vault_fails');
    return;
  }
  var fails = Number(cache.get('vault_fails') || 0) + 1;
  if (fails >= VAULT_MAX_FAILS) {
    cache.put('vault_lockout', '1', VAULT_LOCKOUT_SECONDS);
    cache.remove('vault_fails');
    throw new Error('Too many wrong passwords. Try again in a few minutes.');
  }
  cache.put('vault_fails', String(fails), VAULT_LOCKOUT_SECONDS);
  throw new Error('Incorrect password. ' + (VAULT_MAX_FAILS - fails) + ' attempt' + (VAULT_MAX_FAILS - fails === 1 ? '' : 's') + ' left.');
}

function vaultStatus() {
  return { configured: vaultConfigured_() };
}

/** First-time setup. Refuses if a password already exists. */
function vaultSetup(password) {
  var lock = LockService.getScriptLock();
  lock.waitLock(LOCK_TIMEOUT_MS);
  try {
    if (vaultConfigured_()) throw new Error('The vault already has a password.');
    validateNewVaultPassword_(password);
    storeVaultPassword_(password);
    return { token: newVaultSession_(), idleSeconds: VAULT_SESSION_SECONDS };
  } finally {
    lock.releaseLock();
  }
}

function vaultUnlock(password) {
  if (!vaultConfigured_()) throw new Error('The vault has not been set up yet.');
  checkVaultPassword_(password);
  return { token: newVaultSession_(), idleSeconds: VAULT_SESSION_SECONDS };
}

function vaultLock(token) {
  if (token && typeof token === 'string') vaultCache_().remove('vs:' + token);
  return { locked: true };
}

function vaultList(token) {
  requireVaultSession_(token);
  var rows = readSheetAsObjects_(getComicsSheet_());
  return rows.filter(isVaultRow_).map(comicRowToObject_);
}

function vaultChangePassword(token, oldPassword, newPassword) {
  var lock = LockService.getScriptLock();
  lock.waitLock(LOCK_TIMEOUT_MS);
  try {
    requireVaultSession_(token);
    checkVaultPassword_(oldPassword);
    validateNewVaultPassword_(newPassword);
    storeVaultPassword_(newPassword);
    // All sessions (including this one) are now invalid; hand back a fresh one.
    return { token: newVaultSession_(), idleSeconds: VAULT_SESSION_SECONDS };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Forgot the vault password? Run this once from the Apps Script editor (select it,
 * click Run). It removes the password and signs everyone out; your vault titles stay
 * hidden and the next person to open the vault in the app sets a new password.
 */
function resetVaultPassword() {
  var props = vaultProps_();
  props.deleteProperty('VAULT_HASH');
  props.deleteProperty('VAULT_SALT');
  props.setProperty('VAULT_EPOCH', String(Number(vaultEpoch_()) + 1));
  Logger.log('Vault password removed. Open the vault in the app to set a new one.');
}

// ---------------------------------------------------------------------------
// ONE-TIME SETUP HELPER
// ---------------------------------------------------------------------------

/**
 * Run this once manually from the Apps Script editor (select this function,
 * click Run) to make sure both sheets exist with the correct headers.
 */
function setupSheets() {
  getComicsSheet_();
  getHistorySheet_();
  Logger.log('Comics and History sheets are ready.');
}
