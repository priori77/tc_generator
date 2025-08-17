import { NextRequest, NextResponse } from 'next/server';
import { ExportServiceImpl } from '@/services';
import { TestCase } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const testCases = data.testCases as TestCase[];
    
    console.log('다운로드 요청 받음 - 테스트 케이스 수:', testCases?.length);
    console.log('첫 번째 테스트 케이스 구조:', testCases?.[0]);
    
    if (!testCases || !Array.isArray(testCases)) {
      return NextResponse.json(
        { error: '올바른 테스트 케이스 데이터가 제공되지 않았습니다.' },
        { status: 400 }
      );
    }

    // ExportService를 사용하여 Excel 생성
    const exportService = new ExportServiceImpl();
    const buffer = await exportService.exportToExcel(testCases);

    // 응답 헤더 설정
    const headers = new Headers();
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    headers.set('Content-Disposition', 'attachment; filename="testcases.xlsx"');

    // 응답 반환
    return new NextResponse(buffer, {
      status: 200,
      headers
    });
    
  } catch (error) {
    console.error('Excel 파일 생성 오류:', error);
    return NextResponse.json(
      { error: 'Excel 파일 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 