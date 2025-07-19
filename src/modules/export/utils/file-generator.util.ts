import * as Papa from 'papaparse';
import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import 'pdfkit-table';
import { Readable } from 'stream';

export class FileGeneratorUtil {
  static async generateCsv(data: any[]): Promise<Buffer> {
    if (data.length === 0) {
      return Buffer.from('');
    }
    const csv = Papa.unparse(data);
    return Buffer.from(csv);
  }

  static async generateExcel(data: any[], title: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(title);

    if (data.length > 0) {
      const headers = Object.keys(data[0]);
      worksheet.addRow(headers);
      data.forEach((item) => {
        worksheet.addRow(Object.values(item));
      });
    }

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  static async generatePdf(data: any[], title: string): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      const doc = new PDFDocument();
      const buffers: any[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });
      doc.on('error', reject);

      try {
        doc.fontSize(25).text(title, { align: 'center' });
        doc.moveDown();

        if (data.length > 0) {
          const headers = Object.keys(data[0]);
          const table = {
            title: '',
            headers,
            data: data.map((item) => Object.values(item).map(String)),
          };
          await doc.table(table);
        }

        doc.end();
      } catch (error) {
        reject(new Error(`Failed to generate PDF: ${error.message}`));
      }
    });
  }

  static async generateJson(data: any[]): Promise<Buffer> {
    return Buffer.from(JSON.stringify(data, null, 2));
  }
}
