import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // 샘플 테스트 케이스 생성
  const testCases = generateSampleTestCases();
  
  return NextResponse.json({ testCases });
}

function generateSampleTestCases() {
  // 샘플 테스트 케이스 생성
  const cases = [];
  const categories = ["로그인", "게임 플레이", "아이템 관리", "유저 인터페이스", "네트워크"];
  const subcategories = ["기본 기능", "에러 처리", "경계값", "보안", "성능"];
  
  for (let i = 1; i <= 20; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const subcategory = subcategories[Math.floor(Math.random() * subcategories.length)];
    
    cases.push({
      TID: `TC${i.toString().padStart(3, '0')}`,
      대분류: category,
      중분류: subcategory,
      소분류: `테스트 케이스 ${i}`,
      Precondition: `시스템이 정상 작동 중이고, 필요한 ${category} 기능 사용 가능`,
      Test_Step: `1. ${category} 화면 접속\n2. ${subcategory} 기능 실행\n3. 테스트 데이터 입력\n4. 결과 확인`,
      Expected_Result: `1. ${category} 기능이 정상 작동함\n2. 처리 결과가 화면에 표시됨`
    });
  }
  
  return cases;
} 