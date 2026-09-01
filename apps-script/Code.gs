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
  'Normalized Title', 'Cover Image URL'
];

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
        result = deleteComic(data.id, !!data.deleteHistory);
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
    _row: row._row
  };
}

function formatDateCell_(val) {
  if (!val) return '';
  if (Object.prototype.toString.call(val) === '[object Date]') {
    return Utilities.formatDate(val, Session.getScriptTimeZone() || 'UTC', 'yyyy-MM-dd');
  }
  return String(val);
}

function getComics() {
  var sheet = getComicsSheet_();
  var rows = readSheetAsObjects_(sheet);
  return rows.map(comicRowToObject_);
}

function getComic(id) {
  if (!id) throw new Error('Missing comic id');
  var rows = readSheetAsObjects_(getComicsSheet_());
  for (var i = 0; i < rows.length; i++) {
    if (rows[i]['ID'] === id) return comicRowToObject_(rows[i]);
  }
  return null;
}

function findComicByNormalizedTitle(normalizedTitle) {
  var rows = readSheetAsObjects_(getComicsSheet_());
  for (var i = 0; i < rows.length; i++) {
    if (rows[i]['Normalized Title'] === normalizedTitle) return comicRowToObject_(rows[i]);
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
      throw new Error('A comic with this title already exists (id: ' + existing.id + '). Use addOrUpdateComic instead.');
    }

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
      data.coverImageUrl || ''
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

    return getComic(id);
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

    var rowNum = target._row;
    // ID, Title, Chapter, URL, Website, Domain, FirstAdded, LastUpdated, Notes, NormalizedTitle, CoverImageUrl
    sheet.getRange(rowNum, 2, 1, 10).setValues([[
      title, chapter, url, website, domain,
      target['Date First Added'], dateLastUpdated, notes, normalizedTitle, coverImageUrl || ''
    ]]);

    return getComic(id);
  } finally {
    lock.releaseLock();
  }
}

function deleteComic(id, deleteHistory) {
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

    if (!existing) {
      var id = generateId_('comic');
      var row = [
        id, data.title, newChapter, data.url, website, domain,
        today, today, data.notes || '', normalizedTitle, data.coverImageUrl || ''
      ];
      sheet.appendRow(row);
      addHistoryEntryUnlocked_({
        comicId: id, title: data.title, chapter: newChapter, url: data.url,
        website: website, dateCompleted: today
      });
      return {
        comic: getComic(id),
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

    sheet.getRange(existing._row, 2, 1, 10).setValues([[
      data.title, newChapter, data.url, website, domain,
      existing.dateFirstAdded, today, data.notes !== undefined ? data.notes : existing.notes,
      normalizedTitle, coverImageUrl || ''
    ]]);

    if (materialChange) {
      addHistoryEntryUnlocked_({
        comicId: existing.id, title: data.title, chapter: newChapter, url: data.url,
        website: website, dateCompleted: today
      });
    }

    return {
      comic: getComic(existing.id),
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

function getHistory(comicId) {
  if (!comicId) throw new Error('Missing comicId');
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
