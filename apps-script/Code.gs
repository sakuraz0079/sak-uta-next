const SPREADSHEET_ID = "15iqxKEZSwqmfTJ2u-bwRNNwQwd3G58giQMs1G4yz1cc";
const SHEET_NAME = "次曲候補";

function authorize() {
  SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME).getRange("A1").getDisplayValue();
}

function doPost(e) {
  try {
    const p = e.parameter || {};
    const row = Number(p.row);
    if (!Number.isInteger(row) || row < 2 || row > 999) throw new Error("invalid row");

    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    const artist = sheet.getRange(row, 2).getDisplayValue();
    const title = sheet.getRange(row, 3).getDisplayValue();
    if (artist !== String(p.artist || "") || title !== String(p.title || "")) throw new Error("song mismatch");

    if (p.action === "trial") {
      const allowed = ["未試唱", "余裕", "歌える", "苦しい", "不可"];
      if (!allowed.includes(p.trialRating)) throw new Error("invalid trial rating");
      sheet.getRange(row, 9).setValue(String(p.test || "").slice(0, 1000));
      sheet.getRange(row, 24).setValue(p.trialRating);
    } else if (p.action === "shelve") {
      const allowed = ["歌えなかった", "高音が厳しい", "曲が合わなかった", "今の気分ではない", "その他"];
      if (!allowed.includes(p.reason)) throw new Error("invalid shelved reason");
      const currentStatus = sheet.getRange(row, 1).getDisplayValue();
      sheet.getRange(row, 25).setValue(p.reason);
      sheet.getRange(row, 26).setValue(String(p.memo || "").slice(0, 1000));
      sheet.getRange(row, 27).setValue(new Date());
      if (currentStatus !== "見送り") sheet.getRange(row, 28).setValue(currentStatus || "候補");
      sheet.getRange(row, 1).setValue("見送り");
    } else if (p.action === "restore") {
      const previous = sheet.getRange(row, 28).getDisplayValue();
      sheet.getRange(row, 1).setValue(previous && previous !== "見送り" ? previous : "候補");
    } else {
      throw new Error("invalid action");
    }

    SpreadsheetApp.flush();
    return output_({ ok: true });
  } catch (error) {
    return output_({ ok: false, error: String(error.message || error) });
  }
}

function output_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
