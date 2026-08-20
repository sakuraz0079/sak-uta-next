const SPREADSHEET_ID = "15iqxKEZSwqmfTJ2u-bwRNNwQwd3G58giQMs1G4yz1cc";
const SHEET_NAME = "次曲候補";

function authorize() {
  SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME).getRange("A1").getDisplayValue();
}

function doPost(e) {
  try {
    const p = e.parameter || {};
    const row = Number(p.row);
    const isAdd = p.action === "add";
    if (!isAdd && (!Number.isInteger(row) || row < 2 || row > 999)) throw new Error("invalid row");

    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
    const col = name => {
      const index = headers.indexOf(name);
      if (index < 0) throw new Error("missing header: " + name);
      return index + 1;
    };
    if (!isAdd) {
      const artist = sheet.getRange(row, col("アーティスト")).getDisplayValue();
      const title = sheet.getRange(row, col("曲名")).getDisplayValue();
      if (artist !== String(p.artist || "") || title !== String(p.title || "")) throw new Error("song mismatch");
    }

    if (p.action === "trial") {
      const allowed = ["未試唱", "余裕", "歌える", "苦しい", "不可"];
      if (!allowed.includes(p.trialRating)) throw new Error("invalid trial rating");
      sheet.getRange(row, col("試唱結果")).setValue(String(p.test || "").slice(0, 1000));
      sheet.getRange(row, col("試唱判定")).setValue(p.trialRating);
    } else if (p.action === "shelve") {
      const allowed = ["歌えなかった", "高音が厳しい", "曲が合わなかった", "今の気分ではない", "その他"];
      if (!allowed.includes(p.reason)) throw new Error("invalid shelved reason");
      const currentStatus = sheet.getRange(row, col("ステータス")).getDisplayValue();
      sheet.getRange(row, col("見送り理由")).setValue(p.reason);
      sheet.getRange(row, col("見送りメモ")).setValue(String(p.memo || "").slice(0, 1000));
      sheet.getRange(row, col("見送り日")).setValue(new Date());
      if (currentStatus !== "見送り") sheet.getRange(row, col("見送り前ステータス")).setValue(currentStatus || "候補");
      sheet.getRange(row, col("ステータス")).setValue("見送り");
    } else if (p.action === "complete") {
      const currentStatus = sheet.getRange(row, col("ステータス")).getDisplayValue();
      sheet.getRange(row, col("歌唱済みメモ")).setValue(String(p.memo || "").slice(0, 1000));
      sheet.getRange(row, col("歌唱済み日")).setValue(new Date());
      if (currentStatus !== "歌唱済") sheet.getRange(row, col("歌唱済み前ステータス")).setValue(currentStatus || "候補");
      sheet.getRange(row, col("ステータス")).setValue("歌唱済");
    } else if (p.action === "add") {
      const allowed = ["⭐有力", "候補", "挑戦", "穴候補", "リクエスト", "再録候補", "再挑戦", "コラボ", "保留"];
      const newArtist = String(p.artist || "").trim().slice(0, 200);
      const newTitle = String(p.title || "").trim().slice(0, 200);
      const newStatus = String(p.status || "候補");
      if (!newArtist || !newTitle) throw new Error("artist and title are required");
      if (!allowed.includes(newStatus)) throw new Error("invalid status");

      const normalize = value => String(value || "").trim().toLocaleLowerCase();
      const lastRow = sheet.getLastRow();
      if (lastRow >= 2) {
        const artists = sheet.getRange(2, col("アーティスト"), lastRow - 1, 1).getDisplayValues();
        const titles = sheet.getRange(2, col("曲名"), lastRow - 1, 1).getDisplayValues();
        const duplicateIndex = artists.findIndex((value, index) =>
          normalize(value[0]) === normalize(newArtist) && normalize(titles[index][0]) === normalize(newTitle)
        );
        if (duplicateIndex >= 0) return output_({ ok: true, duplicate: true, row: duplicateIndex + 2 });
      }

      const nextRow = lastRow + 1;
      sheet.getRange(nextRow, col("ステータス")).setValue(newStatus);
      sheet.getRange(nextRow, col("アーティスト")).setValue(newArtist);
      sheet.getRange(nextRow, col("曲名")).setValue(newTitle);
      sheet.getRange(nextRow, col("推奨キー")).setValue(String(p.key || "").trim().slice(0, 100));
      sheet.getRange(nextRow, col("選曲理由")).setValue(String(p.reason || "").trim().slice(0, 1000));
    } else if (p.action === "restore") {
      const currentStatus = sheet.getRange(row, col("ステータス")).getDisplayValue();
      const previousHeader = currentStatus === "歌唱済" ? "歌唱済み前ステータス" : "見送り前ステータス";
      const previous = sheet.getRange(row, col(previousHeader)).getDisplayValue();
      sheet.getRange(row, col("ステータス")).setValue(previous && previous !== "見送り" && previous !== "歌唱済" ? previous : "候補");
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
