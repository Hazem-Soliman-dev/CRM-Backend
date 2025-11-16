import ExcelJS from "exceljs";

export async function buildExcelBufferFromJson(
  rows: Array<Record<string, any>>,
  sheetName = "Data"
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  const safeRows = Array.isArray(rows) ? rows : [];
  const headers = safeRows.length > 0 ? Object.keys(safeRows[0]) : [];

  if (headers.length > 0) {
    worksheet.columns = headers.map((key) => ({
      header: key,
      key,
      width: Math.min(40, Math.max(10, String(key).length + 2)),
    }));

    for (const row of safeRows) {
      worksheet.addRow(
        headers.reduce<Record<string, any>>((acc, key) => {
          acc[key] = row[key];
          return acc;
        }, {})
      );
    }
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  const buffer = Buffer.from(arrayBuffer as ArrayBufferLike);
  return buffer;
}
