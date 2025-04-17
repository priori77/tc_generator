import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
// DOCX 처리 라이브러리만 정적 임포트 (PDF는 동적 임포트)
// @ts-ignore
import mammoth from 'mammoth';

// Node.js 런타임 선언
export const runtime = 'nodejs';

// 환경 변수에서 API 키 가져오기
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// PDF 파일 처리 함수 - pdf-parse 동적 임포트 사용
async function processPdfBuffer(buffer: Buffer): Promise<string> {
  try {
    console.log('PDF 데이터 처리 시작: 버퍼 크기', buffer.length, '바이트');
    
    // 동적 임포트로 pdf-parse 로드 (Next.js 번들링 문제 방지)
    // @ts-ignore - pdf-parse 타입 정의 파일이 없음
    const { default: pdfParse } = await import('pdf-parse');
    
    // PDF 파싱 (최소한의 옵션만 사용)
    const pdfData = await pdfParse(buffer, {
      // 최소 옵션으로 pdf-parse 호출
      max: 0 // 모든 페이지 처리
    });
    
    const text = pdfData.text || '';
    console.log(`PDF 텍스트 추출 성공, 길이: ${text.length} 문자`);
    
    // 추출된 텍스트 샘플 출력
    if (text.length > 0) {
      console.log(`추출된 텍스트 샘플: ${text.substring(0, 200)}...`);
    }
    
    return text;
  } catch (error: any) {
    console.error('PDF 처리 중 오류 발생:', error.message);
    if (error.code === 'ENOENT') {
      console.error('파일 경로 오류 발생, 경로:', error.path);
    }
    
    // 오류 발생 시 대체 방법으로 단순 텍스트 추출 시도
    console.log('대체 방법으로 텍스트 추출 시도');
    try {
      const decoder = new TextDecoder('utf-8');
      let text = decoder.decode(buffer);
      
      // PDF 바이너리에서 의미 있는 텍스트 부분 필터링
      text = text.replace(/[^\x20-\x7E\r\n\t\uAC00-\uD7A3가-힣]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
      
      console.log(`대체 방법으로 텍스트 추출 완료, 길이: ${text.length} 문자`);
      return text;
    } catch (backupError) {
      console.error('대체 텍스트 추출도 실패:', backupError);
      return '';
    }
  }
}

// DOCX 파일 처리 함수
async function processDocxBuffer(buffer: ArrayBuffer): Promise<string> {
  try {
    console.log('DOCX 데이터 처리 시작: 버퍼 크기', buffer.byteLength, '바이트');
    // 명시적인 옵션으로 파일 경로가 아닌 버퍼만 사용
    // @ts-ignore - mammoth 타입 정의 문제 무시
    const result = await mammoth.extractRawText({
      arrayBuffer: buffer
    });
    return result.value || '';
  } catch (error: any) {
    console.error('DOCX 처리 중 오류 발생:', error.message);
    console.error('오류 스택:', error.stack);
    return '';
  }
}

// GET 메소드 핸들러 추가
export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: 'online',
    message: '이 API는 POST 메소드만 지원합니다. 문서 처리를 위해 POST 요청을 사용하세요.',
    supportedMethods: ['POST'],
    contentType: 'multipart/form-data',
    requiredFields: ['file']
  });
}

export async function POST(req: NextRequest) {
  // 모든 예외를 JSON으로 처리하기 위한 래퍼
  try {
    return await processDocument(req);
  } catch (error: any) {
    console.error('처리되지 않은 예외 발생:', error);
    
    // 오류 응답의 구조 표준화
    const errorMessage = error.message || '알 수 없는 오류가 발생했습니다.';
    const errorStack = process.env.NODE_ENV === 'development' ? error.stack : undefined;
    
    return NextResponse.json(
      { 
        error: errorMessage,
        success: false,
        ...(errorStack && { stack: errorStack })
      },
      { status: 500 }
    );
  }
}

// 실제 문서 처리 로직을 별도 함수로 분리
async function processDocument(req: NextRequest) {
  try {
    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API 키가 설정되지 않았습니다.', success: false },
        { status: 500 }
      );
    }

    // 요청 메소드 확인
    if (req.method !== 'POST') {
      return NextResponse.json(
        { error: '잘못된 HTTP 메소드입니다. POST 요청만 지원됩니다.', success: false },
        { status: 405 }
      );
    }

    // Content-Type 확인
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: '지원되지 않는 Content-Type입니다. multipart/form-data만 지원됩니다.', success: false },
        { status: 415 }
      );
    }

    // multipart/form-data 요청 처리
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: '파일이 첨부되지 않았습니다.', success: false },
        { status: 400 }
      );
    }

    // 파일 내용 읽기 - 파일 형식에 따라 적절한 처리
    let fileText = '';
    try {
      // 파일 정보 로깅
      const fileType = file.type;
      const fileName = file.name;
      const fileExt = fileName.split('.').pop()?.toLowerCase();
      
      console.log(`파일 이름: ${fileName}, 크기: ${file.size} 바이트, 타입: ${fileType}, 확장자: ${fileExt}`);
      
      // 파일 내용을 ArrayBuffer로 변환
      const buffer = await file.arrayBuffer();
      
      // 파일 형식에 따른 처리
      if (fileType === 'application/pdf' || fileExt === 'pdf') {
        // PDF 파일 처리 - pdf-parse 동적 임포트 사용
        console.log('PDF 파일 감지됨: pdf-parse 사용');
        fileText = await processPdfBuffer(Buffer.from(buffer));
        console.log(`PDF 텍스트 추출 ${fileText ? '성공' : '실패'}, 길이: ${fileText.length} 문자`);
      } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                 fileExt === 'docx') {
        // DOCX 파일 처리 - 동적 임포트 사용
        console.log('DOCX 파일 감지됨: 동적 임포트로 mammoth 처리 시작');
        fileText = await processDocxBuffer(buffer);
        console.log(`DOCX 텍스트 추출 ${fileText ? '성공' : '실패'}, 길이: ${fileText.length} 문자`);
      } else {
        // 일반 텍스트 파일로 간주
        console.log('텍스트 파일로 간주하여 처리합니다.');
        fileText = new TextDecoder().decode(buffer);
      }
      
      if (fileText.length > 0) {
        console.log(`추출된 텍스트 샘플: ${fileText.substring(0, 200)}...`);
      } else {
        console.warn('추출된 텍스트가 없습니다.');
      }
      
    } catch (fileError: any) {
      console.error('파일 읽기 오류:', fileError);
      return NextResponse.json(
        { error: `파일 읽기 중 오류가 발생했습니다: ${fileError.message}`, success: false },
        { status: 400 }
      );
    }
    
    if (!fileText || fileText.trim().length < 10) {
      return NextResponse.json(
        { error: '파일에서 텍스트를 추출할 수 없거나 텍스트가 너무 짧습니다.', success: false },
        { status: 400 }
      );
    }
    
    console.log(`파일 내용 길이: ${fileText.length} 문자`);
    
    // 콘텐츠 크기를 제한하여 토큰 수 감소 (매우 적극적으로 제한)
    const maxChars = 12000; // 대략 2000-3000 토큰 정도
    const trimmedContent = fileText.length > maxChars 
      ? fileText.slice(0, maxChars * 0.4) + '\n... (중간 내용 생략) ...\n' + fileText.slice(fileText.length - maxChars * 0.6)
      : fileText;
    console.log(`처리할 내용 길이: ${trimmedContent.length} 문자`);
    
    // 1단계: 기획서 분석 (GPT-4o 모델)
    const designDocsPrompt = `
      당신은 베테랑 게임 QA 전문가입니다. 한국어 게임 기획서를 철저히 분석하여, 해당 게임에서 **플레이어가 테스트할 수 있는 모든 기능 목록**을 추출하고 체계적으로 분류해야 합니다.

      다음은 한글로 작성된 게임 기획서 내용입니다. 문서를 읽고, 테스트 가능한 기능들을 아래와 같은 구조로 정리해주세요:

      - **대분류**: [상위 기능 영역 이름]  
        - **중분류**: [기능 그룹/시스템 이름]  
          - **소분류**: [구체적인 기능 명칭] – **기능 설명:** [해당 기능의 동작이나 목적에 대한 간략한 설명]

      요구 사항:
      1. 게임 기획서에 명시된 *모든 테스트 가능 기능*을 포괄해야 합니다. (예: 게임 모드, 전투 시스템, 아이템 상점, UI 요소 등)
      2. 가능한 한 **기획서의 목차나 구조**를 참고하여 논리적으로 분류하세요. 유사한 주제의 기능들은 같은 대분류/중분류 아래 모으되, 기획서에 없는 임의의 분류는 만들지 마세요.
      3. 각 기능은 **소분류** 단위로 식별합니다. 소분류 수준에서 하나의 테스트 대상 기능이 되도록 하십시오.
      4. **기능 설명**에는 해당 기능이 무엇을 하는지, 의도된 동작이나 목표가 무엇인지 간략히 써주세요. 기획서에 나온 내용을 기반으로 필요하면 재구성하되, *추측으로 새로운 기능을 만들지 마세요*.
      5. 출력은 제시된 Markdown 리스트 형식을 지켜주세요. 계층 구조가 한눈에 들어오도록 들여쓰기와 볼드 체계를 유지해주세요.
      6. 응답은 한국어로 작성하시고, 기획서에 등장하는 용어(예: 아이템 이름, 장소 이름)는 **그대로 사용**하세요. 영어로 변환하거나 임의로 수정하지 마세요.

      [게임 기획서 내용]:
      ${trimmedContent}
    `;
    
    // GPT-4o 모델 호출
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    try {
      console.log('1단계: 기획서 분석 API 호출 시작...');
      const gpt4Result = await openai.chat.completions.create({
        model: 'gpt-4.1-mini', // GPT-4o-mini 모델 사용 (토큰 제한 문제 해결)
        messages: [
          { role: 'system', content: 'You are a professional game QA specialist.' },
          { role: 'user', content: designDocsPrompt }
        ],
        temperature: 0.3,
        max_tokens: 12000,
      });
      
      console.log('기획서 분석 API 호출 완료');
      const analysisResult = gpt4Result.choices[0].message.content || '';
      
      // 분석 결과 확인 및 로깅
      if (!analysisResult || analysisResult.trim().length < 50) {
        console.error('분석 결과가 비어 있거나 너무 짧습니다:', analysisResult);
        return NextResponse.json(
          { error: '기획서 분석에 실패했습니다. 다시 시도해주세요.', success: false },
          { status: 500 }
        );
      }
      
      console.log(`분석 결과 길이: ${analysisResult.length} 문자`);
      console.log(`분석 결과 처음 200자: ${analysisResult.substring(0, 200)}`);
      
      // 2단계: 테스트 케이스 생성 (o4-mini 모델)
      const testCasePrompt = `
        아래에 주어진 게임 기획서 분석 내용을 기반으로, 가능한 한 풍부한 테스트 케이스를 생성해 주세요.
        테스트 케이스는 분석된 기능을 최대한 반영해야 합니다.
        테스트 케이스는 기능 테스트(블랙박스 테스트)를 위한 테스트 케이스를 생성해야 합니다.
        테스트 케이스를 기반으로 테스트할 때 위에서 아래로 진행하면서 자연스럽게 진행될 수 있도록 테스트 케이스가 구성되어야 합니다.
        테스트 케이스 작성 시 다음 사항을 반드시 포함해야 합니다:
          1) 정상 시나리오(정상적인 흐름)
          2) 예외/에러 상황(비정상 흐름)
          3) 경계값/엣지 케이스
          4) 상태 전이(특정 상태에서 다른 상태로 넘어가는 흐름, 유효 전이/무효 전이 모두 고려)
          5) 기능별 제약사항 및 제한사항 검증

        테스트 케이스를 최대한 상세하게, 최소 30개 이상 생성해 주십시오.
        주어진 예시와 동일한 필드를 사용해야 합니다.

        다음과 같은 JSON 구조로 응답해 주세요:
        {
          "test_cases": [
            {
              "TID": "TC001",
              "대분류": "로그인",
              "중분류": "일반 로그인",
              "소분류": "유효한 자격 증명",
              "Precondition": "사용자 계정이 존재함",
              "Test_Step": "1. 로그인 페이지 접속\\n2. 유효한 이메일 입력\\n3. 유효한 비밀번호 입력\\n4. 로그인 버튼 클릭",
              "Expected_Result": "1. 메인 페이지로 리다이렉트됨\\n2. 사용자 정보가 표시됨"
            },
            {
              "TID": "TC002",
              "대분류": "로그인",
              "중분류": "일반 로그인",
              "소분류": "잘못된 비밀번호",
              "Precondition": "사용자 계정이 존재함",
              "Test_Step": "1. 로그인 페이지 접속\\n2. 유효한 이메일 입력\\n3. 잘못된 비밀번호 입력\\n4. 로그인 버튼 클릭",
              "Expected_Result": "1. 오류 메시지 표시: '이메일 또는 비밀번호가 잘못되었습니다'\\n2. 로그인 페이지 유지됨"
            }
          ]
        }

        아래 기획서 분석 내용에 대해 테스트 케이스를 생성해주세요:

        ${analysisResult}
      `;
      
      try {
        console.log('2단계: 테스트 케이스 생성 API 호출 시작...');
        console.log('API 호출 파라미터:', {
          model: 'o4-mini',
          response_format: 'json_object',
          max_completion_tokens: 12000,
          reasoning_effort: 'medium'
        });
        
        // o4-mini 모델 호출
        const o4MiniResult = await openai.chat.completions.create({
          model: 'o4-mini',  // o4-mini 모델 사용
          messages: [
            { 
              role: 'system', 
              content: '테스트 케이스 생성 전문가입니다. 주어진 게임 기획서 분석을 기반으로 테스트 케이스를 생성합니다. 응답은 반드시 {"test_cases":[...]} 형식의 유효한 JSON으로만 응답합니다. 절대 HTML이나 마크다운 펜싱을 포함하지마세요.'
            },
            { role: 'user', content: testCasePrompt }
          ],
          response_format: { type: 'json_object' },
          max_completion_tokens: 12000,
          reasoning_effort: 'medium',
        });
        
        console.log('테스트 케이스 생성 API 호출 완료');
        console.log('API 응답 구조:', {
          id: o4MiniResult.id,
          model: o4MiniResult.model,
          object: o4MiniResult.object,
          created: o4MiniResult.created,
          choices_length: o4MiniResult.choices?.length || 0
        });
        
        // API 응답 확인
        if (!o4MiniResult.choices || o4MiniResult.choices.length === 0 || !o4MiniResult.choices[0].message) {
          console.error('API 응답에 choices가 없거나 비어 있습니다:', JSON.stringify(o4MiniResult));
          return NextResponse.json(
            { 
              error: 'API 응답이 예상 형식이 아닙니다.', 
              analysis: analysisResult,
              success: false 
            },
            { status: 500 }
          );
        }
        
        const responseContent = o4MiniResult.choices[0].message.content || '';
        console.log(`API 응답 길이: ${responseContent.length} 문자`);
        if (responseContent.length > 0) {
          console.log(`API 응답 처음 200자: ${responseContent.substring(0, 200)}`);
          console.log(`API 응답 끝 100자: ${responseContent.substring(responseContent.length - 100)}`);
          
          // HTML 감지를 위한 주요 패턴 검사
          const htmlPatterns = ['<!doctype', '<html', '<body', '<head', '</html>'];
          const htmlDetection = htmlPatterns.map(pattern => {
            const found = responseContent.toLowerCase().includes(pattern);
            return { pattern, found };
          });
          console.log('HTML 패턴 감지 결과:', htmlDetection);
          
          // 첫 50글자와 마지막 50글자의 문자 코드 확인
          console.log('처음 10글자의 문자 코드:');
          for (let i = 0; i < Math.min(10, responseContent.length); i++) {
            console.log(`${responseContent[i]}: ${responseContent.charCodeAt(i)}`);
          }
        }
        
        // HTML 응답 체크 - API 오류 가능성
        if (responseContent.trim().toLowerCase().startsWith('<!doctype') || 
            responseContent.trim().toLowerCase().startsWith('<html')) {
          console.error('API가 HTML 응답을 반환했습니다!');
          console.error('HTML 응답 전문:', responseContent);
          return NextResponse.json(
            { 
              error: 'API 오류: HTML 응답이 반환되었습니다. 서버 측 문제가 발생했습니다.', 
              analysis: analysisResult,
              html_response: responseContent.substring(0, 5000),
              success: false 
            },
            { status: 500 }
          );
        }
        
        let testCases = [];
        
        try {
          // JSON 파싱 시도
          const parsedContent = JSON.parse(responseContent);
          
          // 배열 또는 test_cases 키를 확인하여 적절히 처리
          if (Array.isArray(parsedContent)) {
            testCases = parsedContent;
          } else if (parsedContent.test_cases) {
            testCases = parsedContent.test_cases;
          } else if (parsedContent.testCases) {
            testCases = parsedContent.testCases;
          } else {
            // 다른 가능한 키 확인
            const possibleArrays = Object.values(parsedContent).filter(val => Array.isArray(val));
            if (possibleArrays.length > 0) {
              testCases = possibleArrays[0];
            }
          }
          
          if (testCases.length === 0) {
            console.error('테스트 케이스가 비어 있습니다:', responseContent);
          } else {
            console.log(`테스트 케이스 ${testCases.length}개 생성됨`);
          }
        } catch (error) {
          console.error('테스트 케이스 파싱 오류:', error);
          console.error('원본 API 응답:', responseContent);
          return NextResponse.json(
            { 
              error: 'JSON 파싱 오류가 발생했습니다.', 
              analysis: analysisResult,
              raw_response: responseContent.substring(0, 1000), // 디버깅용으로 원본 응답 일부 포함
              success: false
            },
            { status: 500 }
          );
        }
        
        return NextResponse.json({
          analysis: analysisResult,
          testCases: testCases,
          success: true
        });
        
      } catch (apiError: any) {
        console.error('테스트 케이스 생성 API 호출 오류:', apiError);
        return NextResponse.json(
          { 
            error: `테스트 케이스 생성 중 오류가 발생했습니다: ${apiError.message}`, 
            analysis: analysisResult,
            success: false
          },
          { status: 500 }
        );
      }
    } catch (analysisError: any) {
      console.error('기획서 분석 API 호출 오류:', analysisError);
      return NextResponse.json(
        { 
          error: `기획서 분석 중 오류가 발생했습니다: ${analysisError.message}`,
          success: false
        },
        { status: 500 }
      );
    }
    
  } catch (error: any) {
    console.error('처리 오류:', error);
    return NextResponse.json(
      { 
        error: `문서 처리 중 오류가 발생했습니다: ${error.message}`,
        success: false
      },
      { status: 500 }
    );
  }
}

async function readFileContents(file: File): Promise<string> {
  // 텍스트 파일 읽기
  const buffer = await file.arrayBuffer();
  const text = new TextDecoder().decode(buffer);
  return text;
} 