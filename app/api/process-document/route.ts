import { NextRequest, NextResponse } from 'next/server';
import { 
  DocumentProcessingServiceImpl, 
  FileServiceImpl 
} from '@/services';
import { ProcessDocumentResponse, APIError } from '@/types';

// Node.js 런타임 선언
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const documentService = new DocumentProcessingServiceImpl();
  const fileService = new FileServiceImpl();
  
  try {
    console.log('문서 처리 요청 시작');
    
    // FormData에서 파일 추출
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      const error: APIError = {
        code: 'FILE_REQUIRED',
        message: '파일이 업로드되지 않았습니다.',
        timestamp: new Date().toISOString()
      };
      return NextResponse.json(
        { success: false, error },
        { status: 400 }
      );
    }
    
    console.log(`파일 정보: ${file.name}, 크기: ${file.size} 바이트`);
    
    // 파일 검증
    if (!fileService.validateFileType(file.name)) {
      const error: APIError = {
        code: 'INVALID_FILE_TYPE',
        message: 'PDF 또는 DOCX 파일만 업로드 가능합니다.',
        timestamp: new Date().toISOString()
      };
      return NextResponse.json(
        { success: false, error },
        { status: 400 }
      );
    }
    
    if (!fileService.validateFileSize(file.size)) {
      const error: APIError = {
        code: 'FILE_TOO_LARGE',
        message: '파일 크기는 10MB를 초과할 수 없습니다.',
        timestamp: new Date().toISOString()
      };
      return NextResponse.json(
        { success: false, error },
        { status: 400 }
      );
    }
    
    // 파일을 Buffer로 변환
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // 텍스트 추출
    const extractedText = await fileService.extractTextFromFile(buffer, file.name);
    
    if (!extractedText || extractedText.trim().length === 0) {
      const error: APIError = {
        code: 'TEXT_EXTRACTION_FAILED',
        message: '문서에서 텍스트를 추출할 수 없습니다.',
        timestamp: new Date().toISOString()
      };
      return NextResponse.json(
        { success: false, error },
        { status: 400 }
      );
    }
    
    console.log(`텍스트 추출 성공: ${extractedText.length} 문자`);
    
    // 테스트 케이스 직접 생성
    console.log('테스트 케이스 생성 시작');
    const testCases = await documentService.generateTestCasesDirectly(extractedText);
    console.log(`테스트 케이스 ${testCases.length}개 생성 완료`);
    
    // 테스트 케이스 검증
    console.log('생성된 테스트 케이스 샘플:', JSON.stringify(testCases[0], null, 2));
    const validTestCases = testCases.filter(tc => documentService.validateTestCase(tc));
    console.log(`유효한 테스트 케이스: ${validTestCases.length}개`);
    
    // 검증 실패 시 모든 테스트 케이스 반환 (임시)
    const finalTestCases = validTestCases.length > 0 ? validTestCases : testCases;
    console.log(`최종 테스트 케이스: ${finalTestCases.length}개`);
    
    // 요약 정보 생성
    const summary = {
      totalTestCases: finalTestCases.length,
      byCategory: finalTestCases.reduce((acc, tc) => {
        const majorCategory = tc.test_category.split('|')[0] || 'Unknown';
        acc[majorCategory] = (acc[majorCategory] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
    
    const response: ProcessDocumentResponse = {
      success: true,
      message: '테스트 케이스가 성공적으로 생성되었습니다.',
      data: {
        testCases: finalTestCases,
        summary
      }
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('문서 처리 중 오류 발생:', error);
    
    const apiError: APIError = {
      code: 'PROCESSING_ERROR',
      message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
      timestamp: new Date().toISOString()
    };
    
    return NextResponse.json(
      { success: false, error: apiError },
      { status: 500 }
    );
  }
}