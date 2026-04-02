declare module 'pdf-parse' {
  interface PdfData {
    numpages: number;
    numrender: number;
    info: any;
    metadata?: any;
    version: string;
    text: string;
  }

  export default function pdfParse(
    dataBuffer: Buffer,
    options?: any,
  ): Promise<PdfData>;
}
