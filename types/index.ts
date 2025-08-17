// 테스트 케이스 관련 인터페이스
export interface TestCase {
  test_id: string;
  test_category: string; // Major|Sub|Minor format
  preconditions: string;
  steps: TestStep[];
  expected_results: string;
  // Optional fields - not used in Excel export
  test_summary?: string;
  test_description?: string;
  test_priority?: 'P0' | 'P1' | 'P2' | 'P3';
  test_type?: string;
  applicable_version?: string;
  created_date?: string;
  author?: string;
  related_requirements?: string[];
  test_tags?: string[];
}

export interface TestStep {
  step_no: number;
  action_description: string;
  input_data: string;
  expected_output: string;
}

// 문서 분석 관련 인터페이스
export interface DocumentAnalysis {
  game_title: string;
  version: string;
  document_type: string;
  key_features: KeyFeature[];
  test_considerations: string[];
  technical_requirements: string[];
}

export interface KeyFeature {
  category: string; // 대분류|중분류|소분류 format
  feature_name: string;
  description: string;
  sub_features: string[];
  test_importance: 'high' | 'medium' | 'low';
  risk_score: 1 | 2 | 3 | 4 | 5;
  risk_reasons: string[];
  dependencies: string[];
  source_refs: string[];
}

// API 응답 인터페이스
export interface ProcessDocumentResponse {
  success: boolean;
  message: string;
  data?: {
    testCases: TestCase[];
    summary: {
      totalTestCases: number;
      byCategory: Record<string, number>;
    };
  };
  error?: string;
}

export interface DownloadRequest {
  testCases: TestCase[];
  format: 'xlsx' | 'csv';
  filename?: string;
}

// 에러 관련 인터페이스
export interface APIError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: string;
}

// 진행 상태 관련 인터페이스
export interface ProcessingStatus {
  stage: 'uploading' | 'extracting' | 'generating' | 'completed' | 'error';
  progress: number; // 0-100
  message: string;
  estimatedTimeRemaining?: number; // seconds
}

// 파일 업로드 관련 인터페이스
export interface FileUploadRequest {
  file: File;
  options?: {
    maxTestCases?: number;
    testCategories?: string[];
    priorityFilter?: ('P0' | 'P1' | 'P2' | 'P3')[];
  };
}

// OpenAI API 관련 인터페이스
export interface OpenAIRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number; // gpt-4.1 모델용
  max_completion_tokens?: number; // o4-mini 모델용
  response_format?: {
    type: 'json_object' | 'text';
  };
  reasoning_effort?: 'low' | 'medium' | 'high'; // o4-mini 전용
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// 서비스 레이어 인터페이스
export interface DocumentProcessingService {
  generateTestCasesDirectly(content: string): Promise<TestCase[]>;
  validateTestCase(testCase: TestCase): boolean;
}

export interface FileService {
  extractTextFromPDF(buffer: Buffer): Promise<string>;
  extractTextFromDOCX(buffer: Buffer): Promise<string>;
  validateFileType(filename: string): boolean;
  validateFileSize(size: number): boolean;
  extractText(file: File): Promise<string>;
}

export interface ExportService {
  exportToExcel(testCases: TestCase[]): Promise<Buffer>;
  exportToCSV(testCases: TestCase[]): string;
}