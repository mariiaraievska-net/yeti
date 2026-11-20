/**
 * YETI · міні-CRM у Google Таблиці + сповіщення в Telegram
 *
 * Куди вставити: Google Таблиця → Розширення → Apps Script → замінити весь код цим.
 * Налаштування (один раз):
 *   1. Project Settings (шестерня) → Script properties → додати:
 *        TG_TOKEN   — токен бота від @BotFather
 *        TG_CHAT_ID — твій chat id (див. функцію getChatId нижче)
 *   2. Запустити функцію setup (кнопка Run) і дозволити доступ.
 *   3. Deploy → New deployment → Web app:
 *        Execute as: Me · Who has access: Anyone → Deploy
 *      Скопіювати URL веб-застосунку і вставити в index.html у рядок  var CRM_URL = '';
 */

var SHEET_NAME = 'Заявки';
var HEADERS = ['Дата', 'Ім’я', 'Контакт', 'Послуга', 'Про проєкт', 'Статус', 'Нотатки', 'Сторінка'];
var STATUSES = ['Нова', 'Зв’язалась', 'Бриф', 'В роботі', 'Закрита — успіх', 'Відмова'];

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) { sh = ss.getSheets()[0]; sh.setName(SHEET_NAME); }
  sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
    .setFontWeight('bold').setBackground('#0E1116').setFontColor('#EEF1F4');
  sh.setFrozenRows(1);
  sh.setColumnWidths(1, HEADERS.length, 160);
  sh.setColumnWidth(5, 320);
  var rule = SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).build();
  sh.getRange(2, 6, 1000, 1).setDataValidation(rule);
  var r = sh.getRange(2, 1, 1000, HEADERS.length);
  sh.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$F2="Нова"').setBackground('#FFE3D6').setRanges([r]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$F2="Закрита — успіх"').setBackground('#DDF5E3').setRanges([r]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$F2="Відмова"').setFontColor('#9AA4B2').setRanges([r]).build()
  ]);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    var d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!d.name || !d.contact) return out({ ok: false, error: 'empty' });
    var clip = function (v, n) { return String(v || '').slice(0, n); };
    var row = [
      new Date(),
      clip(d.name, 80),
      clip(d.contact, 80),
      clip(d.service, 80),
      clip(d.message, 1500),
      'Нова',
      '',
      clip(d.page, 200)
    ];
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    sh.appendRow(row);
    notify(row);
    return out({ ok: true });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function notify(row) {
  var p = PropertiesService.getScriptProperties();
  var token = p.getProperty('TG_TOKEN'), chat = p.getProperty('TG_CHAT_ID');
  if (!token || !chat) return;
  var text = '🐾 Нова заявка з сайту YETI\n\n' +
    'Ім’я: ' + row[1] + '\n' +
    'Контакт: ' + row[2] + '\n' +
    'Послуга: ' + row[3] + (row[4] ? '\n\nПро проєкт: ' + row[4] : '');
  UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ chat_id: chat, text: text, disable_web_page_preview: true }),
    muteHttpExceptions: true
  });
}

/** Напиши своєму боту будь-яке повідомлення, потім запусти цю функцію:
 *  у View → Logs з’явиться твій chat id. */
function getChatId() {
  var token = PropertiesService.getScriptProperties().getProperty('TG_TOKEN');
  var res = JSON.parse(UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/getUpdates').getContentText());
  (res.result || []).forEach(function (u) {
    var m = u.message || u.edited_message;
    if (m) Logger.log(m.chat.id + '  ←  ' + (m.chat.username || m.chat.first_name));
  });
}

/** Перевірка: додає тестову заявку й шле сповіщення. */
function testLead() {
  doPost({ postData: { contents: JSON.stringify({ name: 'Тест', contact: '@test', service: 'Лендинг / візитка', message: 'Перевірка CRM', page: 'test' }) } });
}

function doGet() { return out({ ok: true, service: 'YETI CRM' }); }

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
