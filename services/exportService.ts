import ExcelJS from 'exceljs';
import { TestCase, ExportService } from '@/types';

export class ExportServiceImpl implements ExportService {
  async exportToExcel(testCases: TestCase[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Test Cases');

    // 헤더 설정 - 요청된 Excel 구조에 맞춤
    worksheet.columns = [
      { header: 'TID', key: 'test_id', width: 15 },
      { header: '대분류', key: 'major_category', width: 25 },
      { header: '중분류', key: 'sub_category', width: 25 },
      { header: '소분류', key: 'minor_category', width: 25 },
      { header: '사전 조건', key: 'preconditions', width: 40 },
      { header: '테스트 스텝', key: 'steps', width: 60 },
      { header: '기대결과', key: 'expected_results', width: 40 }
    ];

    // 스타일 설정
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // 데이터 추가
    testCases.forEach((testCase) => {
      // 카테고리 분리 (Major|Sub|Minor 형식)
      const categories = testCase.test_category.split('|');
      const majorCategory = categories[0] || '';
      const subCategory = categories[1] || '';
      const minorCategory = categories[2] || '';
      
      // 스텝 포맷팅 - 각 스텝에 입력 데이터와 기대 출력 포함
      const stepsText = testCase.steps
        .map(step => {
          let stepText = `${step.step_no}. ${step.action_description}`;
          if (step.input_data && step.input_data !== 'N/A') {
            stepText += `\n   입력: ${step.input_data}`;
          }
          if (step.expected_output) {
            stepText += `\n   기대결과: ${step.expected_output}`;
          }
          return stepText;
        })
        .join('\n\n');
      
      worksheet.addRow({
        test_id: testCase.test_id,
        major_category: majorCategory,
        sub_category: subCategory,
        minor_category: minorCategory,
        preconditions: testCase.preconditions,
        steps: stepsText,
        expected_results: testCase.expected_results
      });
    });

    // 자동 필터 추가
    worksheet.autoFilter = {
      from: 'A1',
      to: 'G1'
    };
    
    // 행 높이 자동 조정
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        // ExcelJS에서는 자동 높이를 위해 height를 설정하지 않음
        row.alignment = { vertical: 'top', wrapText: true };
      }
    });

    // 버퍼로 변환
    const buffer = await workbook.xlsx.writeBuffer();
    console.log('Excel buffer 생성 완료, 크기:', buffer.byteLength);
    return Buffer.from(buffer);
  }

  exportToCSV(testCases: TestCase[]): string {
    const headers = [
      'TID',
      '대분류',
      '중분류',
      '소분류',
      '사전조건',
      '테스트스텝',
      '기대결과'
    ];

    const csvRows = [headers.join(',')];

    testCases.forEach(testCase => {
      // 카테고리 분리
      const categories = testCase.test_category.split('|');
      const majorCategory = categories[0] || '';
      const subCategory = categories[1] || '';
      const minorCategory = categories[2] || '';
      
      // 스텝 포맷팅
      const stepsText = testCase.steps
        .map(step => {
          let stepText = `${step.step_no}. ${step.action_description}`;
          if (step.input_data && step.input_data !== 'N/A') {
            stepText += ` [입력: ${step.input_data}]`;
          }
          if (step.expected_output) {
            stepText += ` [기대: ${step.expected_output}]`;
          }
          return stepText;
        })
        .join(' | ');
      
      const row = [
        testCase.test_id,
        this.escapeCSV(majorCategory),
        this.escapeCSV(subCategory),
        this.escapeCSV(minorCategory),
        this.escapeCSV(testCase.preconditions),
        this.escapeCSV(stepsText),
        this.escapeCSV(testCase.expected_results)
      ];

      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}