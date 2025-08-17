import mammoth from 'mammoth';
import { FileService } from '@/types';

// PDF 처리를 위한 동적 import (서버 사이드에서만 실행)
let pdfParse: any;
if (typeof window === 'undefined') {
  pdfParse = require('pdf-parse');
}

export class FileServiceImpl implements FileService {
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_EXTENSIONS = ['.pdf', '.docx'];

  async extractTextFromPDF(buffer: Buffer): Promise<string> {
    if (!pdfParse) {
      throw new Error('PDF 파싱 기능은 서버 사이드에서만 사용 가능합니다.');
    }

    try {
      const pdfData = await pdfParse(buffer);
      return pdfData.text;
    } catch (error) {
      throw new Error(`PDF 파일 읽기 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async extractTextFromDOCX(buffer: Buffer): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      throw new Error(`DOCX 파일 읽기 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  validateFileType(filename: string): boolean {
    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return this.ALLOWED_EXTENSIONS.includes(extension);
  }

  validateFileSize(size: number): boolean {
    return size > 0 && size <= this.MAX_FILE_SIZE;
  }

  getFileExtension(filename: string): string {
    return filename.toLowerCase().substring(filename.lastIndexOf('.'));
  }

  async extractTextFromFile(buffer: Buffer, filename: string): Promise<string> {
    const extension = this.getFileExtension(filename);
    
    switch (extension) {
      case '.pdf':
        return this.extractTextFromPDF(buffer);
      case '.docx':
        return this.extractTextFromDOCX(buffer);
      default:
        throw new Error(`지원하지 않는 파일 형식입니다: ${extension}`);
    }
  }

  async extractText(file: File): Promise<string> {
    // 파일 타입 검증
    if (!this.validateFileType(file.name)) {
      throw new Error('지원하지 않는 파일 형식입니다. PDF 또는 DOCX 파일만 업로드 가능합니다.');
    }

    // 파일 크기 검증
    if (!this.validateFileSize(file.size)) {
      throw new Error(`파일 크기가 너무 큽니다. 최대 ${this.MAX_FILE_SIZE / 1024 / 1024}MB까지 업로드 가능합니다.`);
    }

    // 파일을 Buffer로 변환
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 텍스트 추출
    return this.extractTextFromFile(buffer, file.name);
  }
}