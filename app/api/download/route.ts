import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const testCases = data.testCases;
    
    if (!testCases || !Array.isArray(testCases)) {
      return NextResponse.json(
        { error: '올바른 테스트 케이스 데이터가 제공되지 않았습니다.' },
        { status: 400 }
      );
    }

    // Excel 워크북 생성
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('테스트 케이스');

    // 헤더 설정
    worksheet.columns = [
      { header: 'TID', key: 'TID', width: 10 },
      { header: '대분류', key: '대분류', width: 15 },
      { header: '중분류', key: '중분류', width: 15 },
      { header: '소분류', key: '소분류', width: 20 },
      { header: 'Precondition', key: 'Precondition', width: 30 },
      { header: 'Test_Step', key: 'Test_Step', width: 50 },
      { header: 'Expected_Result', key: 'Expected_Result', width: 50 },
    ];

    // 헤더 스타일 설정
    worksheet.getRow(1).eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4CAF50' }, // 녹색 계열
      };
      cell.font = {
        bold: true,
        color: { argb: 'FFFFFFFF' }, // 흰색
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // 데이터 추가
    testCases.forEach((testCase: any) => {
      worksheet.addRow({
        TID: testCase.TID,
        대분류: testCase.대분류,
        중분류: testCase.중분류,
        소분류: testCase.소분류,
        Precondition: testCase.Precondition,
        Test_Step: testCase.Test_Step,
        Expected_Result: testCase.Expected_Result,
      });
    });

    // 셀 스타일 설정
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) { // 헤더 제외
        row.eachCell((cell) => {
          cell.alignment = { 
            vertical: 'top', 
            horizontal: 'left',
            wrapText: true 
          };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      }
    });

    // 엑셀 파일을 버퍼로 생성
    const buffer = await workbook.xlsx.writeBuffer();

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