# Test Case Generator

게임 기획서를 기반으로 테스트 케이스를 자동 생성하는 웹 애플리케이션입니다. OpenAI의 GPT 모델을 활용하여 게임 기획서를 분석하고 테스트 케이스를 생성합니다.

## 주요 기능

- 게임 기획서 파일 업로드 (PDF, DOCX, TXT 등)
- AI 기반 기획서 분석 및 테스트 케이스 자동 생성
- 생성된 테스트 케이스 표시 및 다운로드

## 기술 스택

- Next.js 15.3.1
- TypeScript
- Tailwind CSS
- OpenAI API (GPT-4o-mini, o3-mini)
- PDF 및 DOCX 파일 처리 (pdf-parse, mammoth)

## 설치 방법

1. 저장소 클론:
```bash
git clone https://github.com/[사용자명]/tc_generator.git
cd tc_generator
```

2. 의존성 설치:
```bash
npm install
```

3. 환경 변수 설정:
`.env.local` 파일을 생성하고 다음 내용을 추가합니다:
```
OPENAI_API_KEY=your_openai_api_key_here
```

4. 개발 서버 실행:
```bash
npm run dev
```

5. 빌드 및 프로덕션 실행:
```bash
npm run build
npm start
```

## 로컬 환경 사용 방법

1. 브라우저에서 `http://localhost:3000` 접속
2. 게임 기획서 파일(PDF, DOCX, TXT 등) 업로드
3. '파일 처리 시작' 버튼 클릭
4. AI가 분석하고 테스트 케이스를 생성할 때까지 대기
5. 생성된 테스트 케이스 확인 및 다운로드

## 주의 사항

- 환경 파일(`.env.local`)은 저장소에 커밋하지 않도록 주의하세요.
- OpenAI API 키는 비용이 발생할 수 있습니다. 사용량을 모니터링하세요.
- 대용량 파일 처리 시 메모리 사용량과, 토큰 사용량에 주의하세요.
