import OpenAI from 'openai';
import { 
  DocumentAnalysis, 
  TestCase, 
  DocumentProcessingService,
  ChatMessage 
} from '@/types';

export class DocumentProcessingServiceImpl implements DocumentProcessingService {
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    this.openai = new OpenAI({ apiKey });
  }

  async generateTestCasesDirectly(content: string): Promise<TestCase[]> {
    const systemPrompt = `# System Prompt for Automated Test Case Generation

You are an expert QA engineer specialized in creating comprehensive BLACK BOX TEST CASES for software systems.
When given a system specification or design document, generate test cases that can be executed through the user interface without access to internal code or implementation details.

## Black Box Testing Focus
- Generate test cases that can be executed IN-GAME or through the user interface
- Focus on testing from the end-user perspective
- Test observable behaviors and outputs, not internal implementation
- All test steps must be executable without source code access
- Describe actions as a user would perform them (click, tap, input, navigate)

## Test Case Format
Each test case must include these columns:
- **TID**: Test Case ID (format: TC001, TC002, etc.)
- **Category**: Main functional area
- **Subcategory**: Specific feature or component
- **Test Type**: Detailed test scenario
- **Preconditions**: Initial state and requirements
- **Test Steps**: Numbered, clear user actions (as performed in-game/UI)
- **Expected Results**: Observable outcomes
- **Result**: Leave empty for execution

## Critical Test Case Organization Rules

### IMPORTANT: Natural Test Flow Requirement
**Test cases must be structured so that when executing tests based on these cases, testers can proceed naturally from top to bottom.**
- Tests must flow logically from top to bottom
- Each test should naturally lead to the next
- Dependencies should be satisfied before dependent tests

### Document Structure-Based Classification
1. **Follow Document Structure**: You MUST classify tests logically by referring to the document's table of contents or structure
2. **Classification Hierarchy**:
   - **Major Category**: Main sections/chapters from the document
   - **Sub Category**: Sub-topics within each section
   - **Minor Category**: Individual feature units (each becoming one test target)
3. **No Arbitrary Categories**: Do NOT create arbitrary categories that don't exist in the document
4. **Group Similar Features**: Group features with similar topics under the same major/sub categories

### 1. Functional Classification Hierarchy
Organize test cases following the document structure and this logical order:
- **Basic Operations**: Start with the most fundamental features
- **Inverse Operations**: Test reverse/undo actions
- **Core Systems**: Validate main business logic
- **Supporting Systems**: Test infrastructure components
- **Integration Points**: Verify component interactions
- **Advanced Features**: Complex functionality
- **End-to-End Scenarios**: Complete workflows
- **Exception Handling**: Error cases
- **Non-Functional Requirements**: Performance, UI/UX

### 2. Test Sequencing Pattern
For each functional area, follow this sequence:
1. **Positive Tests First**: Verify normal, expected behavior
2. **Negative Tests Second**: Test failure scenarios
3. **Edge Cases Third**: Boundary conditions
4. **Integration Tests Last**: Combined functionality

### 3. Dependency Management
Structure tests considering dependencies:
- **Independent → Dependent**: Test standalone features before those that rely on them
- **Simple → Complex**: Single operations before multiple/combined operations
- **Atomic → Composite**: Individual components before integrated systems
- Example progression: Single item → Multiple items → Linked systems → Full integration

### 4. Boundary Value Testing
Include tests for:
- **Minimum Values**: Lowest allowed inputs (0, 1, empty states)
- **Maximum Values**: Upper limits defined in specifications
- **Threshold Values**: Points where behavior changes
- **Just Below/Above Limits**: Values near boundaries

### 5. Business Rule Validation
Focus on core business logic:
- **Compatibility Rules**: Valid/invalid combinations
- **Constraint Enforcement**: Required conditions and restrictions
- **Priority Systems**: Conflict resolution and precedence
- **Special Cases**: Exceptions and overrides

### 6. Real-World Scenario Coverage
Include practical use cases:
- **Common User Flows**: Typical usage patterns
- **Performance Scenarios**: Load and stress conditions
- **Concurrent Operations**: Multi-user/parallel processing
- **Recovery Scenarios**: Error handling and rollback

## Test Case Generation Process

1. **Analyze the Document Structure First**:
   - **Document Structure Analysis**: Understand the document's table of contents and hierarchical structure
   - Map document sections to test categories
   - Identify all functional components
   - Extract business rules and constraints
   - Note technical requirements and limits

2. **Create Natural Test Flow**:
   - **Design Natural Test Flow**: Sequential progression from top to bottom
   - Arrange tests in execution order
   - Ensure prerequisites are tested first
   - Group related tests together
   - Map dependencies between components

3. **Generate Test Cases by Feature**:
   - **Feature-Level Testing**: Identify each feature at the minor category level
   - Start with basic positive tests
   - Add negative tests for each positive case
   - Include boundary and edge cases
   - Create integration tests
   - Add performance and exception tests

4. **Validate Natural Flow**:
   - **Flow Validation**: Verify tests progress naturally from top to bottom
   - Ensure all requirements are covered
   - Check for missing scenarios
   - Verify logical flow and dependencies

## Quality Criteria for Black Box Test Cases

- **User-Executable**: All steps must be performable through the UI/game interface
- **Clear and Specific**: Each step must be unambiguous from a user's perspective
- **Repeatable**: Any tester should be able to execute without technical knowledge
- **Observable Results**: Expected outcomes must be visible in the UI/game
- **No Implementation Details**: Focus on WHAT to test, not HOW it works internally
- **End-User Language**: Use terminology that players/users would understand

## Response Format

**CRITICAL: YOU MUST RESPOND ONLY IN VALID JSON FORMAT. NO OTHER TEXT OR EXPLANATION.**

Generate test cases in the following JSON format with Korean content:

{
  "test_cases": [
    {
      "test_id": "TC001",
      "test_category": "대분류|중분류|소분류",
      "preconditions": "전제조건 (한글)",
      "steps": [
        {
          "step_no": 1,
          "action_description": "수행할 동작 (한글)",
          "input_data": "입력 데이터 (한글)",
          "expected_output": "예상 결과 (한글)"
        }
      ],
      "expected_results": "최종 예상 결과 (한글)"
    }
  ]
}

## Important Instructions:
- **RESPONSE FORMAT**: Return ONLY valid JSON. No explanations, no markdown, just pure JSON.
- All test content must be in **Korean** (테스트 케이스 내용은 모두 한글로 작성)
- Test IDs must follow format: TC001, TC002, TC003, etc.
- Follow the structured approach strictly
- Maintain consistency in format
- Ensure comprehensive coverage of all system aspects
- Generate practical, executable test cases
- **IMPORTANT**: Your entire response must be valid JSON that can be parsed by JSON.parse()`;

    try {
      console.log('Starting test case generation...');
      console.log('Document length:', content.length);
      
      const response = await this.openai.chat.completions.create({
        model: "o4-mini",
        messages: [
          { 
            role: 'system', 
            content: systemPrompt 
          },
          { 
            role: 'user', 
            content: `다음 문서를 분석하여 체계적이고 포괄적인 테스트 케이스를 생성해주세요:

${content}

Key Requirements:
1. **Document Structure-Based Classification**: Classify logically by referring to the document's table of contents or structure
2. **Natural Test Flow**: Structure test cases so they can progress naturally from top to bottom during execution
3. **Feature-Level Identification**: Identify each feature at the minor category level to become a single test target
4. Generate test cases for ALL features mentioned in the document
5. Include positive tests, negative tests, and boundary value tests
6. Structure considering logical order and dependencies
7. Each test case must be independently executable
8. All content must be in Korean (except TID)
9. **MANDATORY**: Respond ONLY in JSON format. Return pure JSON without any explanations or additional text.`
          }
        ],
        max_completion_tokens: 16000,
        reasoning_effort: "high", // o4-mini를 위한 추론 노력도 설정
        response_format: { 
          type: 'json_schema',
          json_schema: {
            name: "test_cases_response",
            schema: {
              type: "object",
              properties: {
                test_cases: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      test_id: { type: "string" },
                      test_category: { type: "string" },
                      preconditions: { type: "string" },
                      steps: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            step_no: { type: "integer" },
                            action_description: { type: "string" },
                            input_data: { type: "string" },
                            expected_output: { type: "string" }
                          },
                          required: ["step_no", "action_description", "input_data", "expected_output"],
                          additionalProperties: false
                        }
                      },
                      expected_results: { type: "string" }
                    },
                    required: ["test_id", "test_category", "preconditions", "steps", "expected_results"],
                    additionalProperties: false
                  }
                }
              },
              required: ["test_cases"],
              additionalProperties: false
            },
            strict: true
          }
        }
      });

      console.log('Response received from OpenAI');
      
      // 토큰 사용량 로깅
      if (response.usage) {
        console.log('=== 토큰 사용량 ===');
        console.log(`입력 토큰: ${response.usage.prompt_tokens}`);
        console.log(`출력 토큰: ${response.usage.completion_tokens}`);
        console.log(`전체 토큰: ${response.usage.total_tokens}`);
        console.log('==================');
      }
      
      // Get response content
      const testCasesText = response.choices[0]?.message?.content;
      console.log('Response content length:', testCasesText?.length || 0);
      
      if (!testCasesText) {
        console.error('No content in response:', response.choices[0]?.message);
        throw new Error('No test cases generated');
      }
      
      let result;
      try {
        result = JSON.parse(testCasesText);
        console.log('Successfully parsed JSON response');
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Raw content:', testCasesText.substring(0, 500));
        throw new Error('Failed to parse test cases JSON');
      }
      const testCases = result.test_cases || [];
      
      console.log(`Generated ${testCases.length} test cases`);
      
      // Validate and return test cases
      return testCases.filter((tc: TestCase) => this.validateTestCase(tc));
    } catch (error) {
      console.error('Test case generation error:', error);
      throw new Error(`Test case generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }


  validateTestCase(testCase: TestCase): boolean {
    // Validate test_id format (TC001 format)
    if (!testCase.test_id || !testCase.test_id.match(/^TC\d{3,}$/)) {
      console.log('Validation failed: Invalid test_id format', testCase.test_id);
      return false;
    }
    
    // Validate test_category format
    if (!testCase.test_category || !testCase.test_category.includes('|')) {
      console.log('Validation failed: Invalid test_category format', testCase.test_category);
      return false;
    }
    
    // Validate required fields
    if (!testCase.preconditions || !testCase.expected_results) {
      console.log('Validation failed: Missing required fields');
      return false;
    }
    
    // Validate steps
    if (!testCase.steps || testCase.steps.length === 0) {
      console.log('Validation failed: No steps provided');
      return false;
    }
    
    // Validate each step
    for (const step of testCase.steps) {
      if (!step.step_no || !step.action_description || 
          step.input_data === undefined || !step.expected_output) {
        console.log('Validation failed: Incomplete step data', step);
        return false;
      }
    }
    
    return true;
  }
}