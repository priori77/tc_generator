import os
import json
import openai
import time
from dotenv import load_dotenv
from openai import OpenAI
import random
from ..utils.config import Config

# .env 파일에서 환경 변수 로드 및 API 키 설정
load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

class OpenAIClient:
    def __init__(self):
        # 클라이언트 초기화
        self.client = OpenAI(api_key=Config.OPENAI_API_KEY)
        if not Config.OPENAI_API_KEY:
            print("OpenAI API 키가 설정되지 않았습니다. 환경 변수를 확인하세요.")
        
        # 모델 설정
        self.model = Config.OPENAI_MODEL
        print(f"OpenAI 클라이언트 초기화: 모델={self.model}")
    
    def generate_test_cases(self, doc_text, examples=None):
        """
        문서 텍스트로부터 테스트 케이스를 생성합니다.
        
        Args:
            doc_text (str): 테스트 케이스 생성을 위한 문서 텍스트
            examples (list, optional): 테스트 케이스 예시 목록
            
        Returns:
            list: 생성된 테스트 케이스 목록
        """
        # API 키 확인
        if not Config.OPENAI_API_KEY:
            print("경고: 유효한 OpenAI API 키가 설정되지 않았습니다.")
            return self.generate_test_data()
        
        try:
            # 입력 유효성 검사
            if not doc_text or len(doc_text.strip()) < 10:
                print("오류: 문서 텍스트가 비어 있거나 너무 짧습니다.")
                return self.generate_test_data()
                
            # 예시가 없는 경우 기본 예시 사용
            if not examples or len(examples) == 0:
                examples = self.get_default_examples()
                
            # 예시를 JSON 문자열로 변환
            examples_json = json.dumps(examples, ensure_ascii=False, indent=2)
            
            # 시스템 프롬프트 
            system_prompt = (
                "아래에 주어진 게임 기획서 내용을 꼼꼼히 분석하여, 가능한 한 풍부한 테스트 케이스를 생성해 주세요.\n"
                "테스트 케이스는 게임 기획서 내용을 최대한 반영해야 합니다.\n"
                "테스트 케이스는 기능 테스트(블랙박스 테스트)를 위한 테스트 케이스를 생성해야 합니다.\n"
                "테스트 케이스를 기반으로 테스트할 때 위에서 아래로 진행하면서 자연스럽게 진행될 수 있도록 테스트 케이스가 구성되어야 합니다.\n"
                "테스트 케이스 작성 시 다음 사항을 반드시 포함해야 합니다:\n"
                "  1) 정상 시나리오(정상적인 흐름)\n"
                "  2) 예외/에러 상황(비정상 흐름)\n"
                "  3) 경계값/엣지 케이스\n"
                "  4) 상태 전이(특정 상태에서 다른 상태로 넘어가는 흐름, 유효 전이/무효 전이 모두 고려)\n"
                "  5) 기능별 제약사항 및 제한사항 검증\n\n"
                "테스트 케이스를 최대한 상세하게, 최소 30개 이상의 테스트 생성해 주십시오.\n"
                "주어진 예시와 동일한 필드를 사용해야 합니다."
            )
            
            # 사용자 프롬프트
            user_prompt = f"""
다음은 테스트 케이스 예시입니다:
{examples_json}

아래 기획서 내용에 대해 위 예시와 같은 구조로, 가능한 한 많은 테스트 케이스를 생성해주세요.

기획서 내용:
{doc_text[:8000]}  # 입력 텍스트 길이 제한
"""

            try:
                # API 호출
                print(f"OpenAI API 호출 시작: 모델={self.model}, 길이={len(doc_text[:8000])}")
                
                response = self.client.chat.completions.create(
                    model="o3-mini",  # o3-mini 모델 사용
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=0.2,
                    response_format={"type": "json_object"},
                    max_completion_tokens=8000,
                    reasoning_effort="medium",  # 추론 노력 수준 설정
                    timeout=600  # 9초 타임아웃 설정
                )
                
                print("API 호출 성공!")
                
                # 응답 처리
                response_content = response.choices[0].message.content
                print(f"응답 텍스트 길이: {len(response_content)}")
                
                # JSON 파싱
                result = json.loads(response_content)
                
                # 결과 구조 확인
                if "test_cases" in result:
                    return result["test_cases"]
                else:
                    # 다른 구조 처리
                    for key in result.keys():
                        if isinstance(result[key], list):
                            return result[key]
                    # 단일 테스트 케이스인 경우
                    if isinstance(result, dict) and "TID" in result:
                        return [result]
                    # 결과가 리스트인 경우
                    if isinstance(result, list):
                        return result
                    
                # 구조를 알 수 없는 경우 기본 데이터 반환
                print("응답 구조를 인식할 수 없습니다.")
                return self.generate_test_data()
                
            except Exception as e:
                print(f"API 호출 오류: {str(e)}")
                return self.generate_test_data()
                
        except Exception as e:
            print(f"테스트 케이스 생성 중 오류: {str(e)}")
            return self.generate_test_data()

    def get_default_examples(self):
        """기본 예시 테스트 케이스를 반환합니다."""
        return [
            {
                "TID": "TC001",
                "대분류": "로그인",
                "중분류": "일반 로그인",
                "소분류": "유효한 자격 증명",
                "Precondition": "사용자 계정이 존재함",
                "Test_Step": "1. 로그인 페이지 접속\n2. 유효한 이메일 입력\n3. 유효한 비밀번호 입력\n4. 로그인 버튼 클릭",
                "Expected_Result": "1. 메인 페이지로 리다이렉트됨\n2. 사용자 정보가 표시됨"
            },
            {
                "TID": "TC002",
                "대분류": "로그인",
                "중분류": "일반 로그인",
                "소분류": "잘못된 비밀번호",
                "Precondition": "사용자 계정이 존재함",
                "Test_Step": "1. 로그인 페이지 접속\n2. 유효한 이메일 입력\n3. 잘못된 비밀번호 입력\n4. 로그인 버튼 클릭",
                "Expected_Result": "1. 오류 메시지 표시: '이메일 또는 비밀번호가 잘못되었습니다'\n2. 로그인 페이지 유지됨"
            }
        ]

    def generate_test_data(self):
        """샘플 테스트 케이스 데이터를 생성합니다."""
        test_cases = []
        for i in range(1, 6):
            test_case = {
                "TID": f"TC00{i}",
                "대분류": "게임 기능",
                "중분류": "사용자 인터페이스",
                "소분류": f"테스트 케이스 {i}",
                "Precondition": "게임이 실행되어 있음",
                "Test_Step": f"1. 기능 {i} 실행\n2. 옵션 선택\n3. 확인 버튼 클릭",
                "Expected_Result": f"1. 기능 {i}가 정상 작동함\n2. 결과가 화면에 표시됨"
            }
            test_cases.append(test_case)
        return test_cases

# 함수형 API도 유지 (이전 코드와의 호환성을 위해)
def generate_test_cases(doc_text, examples=None):
    """
    OpenAIClient 클래스를 통해 테스트 케이스를 생성합니다 (함수형 인터페이스).
    """
    client = OpenAIClient()
    return client.generate_test_cases(doc_text, examples)

def get_default_examples():
    """기본 예시 테스트 케이스를 반환합니다."""
    client = OpenAIClient()
    return client.get_default_examples()

def generate_test_data():
    """샘플 테스트 케이스 데이터를 생성합니다."""
    client = OpenAIClient()
    return client.generate_test_data() 