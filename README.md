# TC Generator

게임 기획서에서 QA 테스트 케이스를 자동으로 생성하는 next.js 기반 웹 애플리케이션으로 구현했습니다.

## 주요 기능
1. **파일 업로드**: PDF, DOCX 파일 지원
2. **AI 분석**: GPT LLM 호출(OpenAI API)를 통한 기획 문서 분석 및 테스트 케이스 생성
3. **Excel 다운로드**: 생성된 테스트 케이스를 Excel 파일로 다운로드


## 프로젝트 구조
```
tc_generator/
├── app/                # Next.js 앱 라우터
│   ├── api/           # API 엔드포인트
│   └── page.tsx       # 메인 UI
├── services/          # 메인 로직
│   ├── documentProcessingService.ts  # OpenAI 통합
│   ├── fileService.ts               # 파일 처리
│   └── exportService.ts             # Excel 내보내기
└── components/        # UI 컴포넌트
```

## API 엔드포인트

- `/api/process-document`: 문서 업로드 및 테스트 케이스 생성
- `/api/download`: Excel 파일 다운로드

## 사용 방법

1. http://localhost:3000 접속
2. 게임 기획서 파일 업로드 (PDF/DOCX)
3. 처리 완료 후 테스트 케이스 확인
4. Excel 파일로 다운로드