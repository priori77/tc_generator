"use client";

import { useState } from "react";
import { Upload, File, FolderInput, Download, Loader2 } from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { useProcessing } from "@/contexts/ProcessingContext";
import { ProcessingStatusDisplay } from "@/components/ProcessingStatus";
import { TestCase, ProcessDocumentResponse, APIError } from "@/types";

export default function Component() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [extractedText, setExtractedText] = useState<string>("");
  const [isTextExtracted, setIsTextExtracted] = useState(false);
  const { updateStatus, clearStatus } = useProcessing();
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    if (selectedFile) {
      const fileType = selectedFile.name.split('.').pop()?.toLowerCase();
      if (fileType !== 'pdf' && fileType !== 'docx') {
        toast({
          title: "파일 형식 오류",
          description: "PDF 또는 DOCX 파일만 업로드 가능합니다.",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
      setExtractedText("");
      setIsTextExtracted(false);
      setTestCases([]);
      toast({
        title: "파일 선택 완료",
        description: `"${selectedFile.name}" 파일이 선택되었습니다.`,
      });
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "파일 없음",
        description: "처리할 파일을 먼저 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setProgress(0);
    clearStatus();
    
    // 업로드 상태 업데이트
    updateStatus({
      stage: 'uploading',
      progress: 0,
      message: `${file.name} 업로드 중...`
    });
    
    // 업로드 진행 시뮬레이션
    const uploadInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(uploadInterval);
          return 100;
        }
        const newProgress = prev + 10;
        updateStatus({
          stage: 'uploading',
          progress: newProgress,
          message: `${file.name} 업로드 중...`
        });
        return newProgress;
      });
    }, 200);

    try {
      // 파일 데이터 준비
      const formData = new FormData();
      formData.append('file', file);
      
      // 업로드 완료
      clearInterval(uploadInterval);
      setProgress(100);
      
      // 텍스트 추출
      updateStatus({
        stage: 'extracting',
        progress: 100,
        message: '문서에서 텍스트를 추출하는 중...'
      });
      
      const extractResponse = await fetch('/api/extract-text', {
        method: 'POST',
        body: formData,
      });
      
      if (!extractResponse.ok) {
        const errorData = await extractResponse.json();
        throw new Error(errorData.error || '텍스트 추출 실패');
      }
      
      const extractData = await extractResponse.json();
      setExtractedText(extractData.text);
      setIsTextExtracted(true);
      setIsUploading(false);
      
      toast({
        title: "텍스트 추출 완료",
        description: "문서에서 텍스트를 성공적으로 추출했습니다. 이제 테스트 케이스를 생성할 수 있습니다.",
      });
      
      clearStatus();
    } catch (error) {
      clearInterval(uploadInterval);
      setIsUploading(false);
      handleError(error);
    }
  };
  
  const generateTestCases = async () => {
    if (!file || !extractedText) {
      toast({
        title: "파일 없음",
        description: "먼저 파일을 업로드하고 텍스트를 추출해주세요.",
        variant: "destructive",
      });
      return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    await processDocument(formData);
  };

  const processDocument = async (formData: FormData) => {
    setIsProcessing(true);
    
    try {
      // 테스트 케이스 생성 시작
      updateStatus({
        stage: 'generating',
        progress: 30,
        message: '기획 문서를 기반으로 테스트 케이스를 생성하고 있습니다...',
        estimatedTimeRemaining: 45
      });
      
      const response = await fetch('/api/process-document', {
        method: 'POST',
        body: formData,
      });

      const data: ProcessDocumentResponse | APIError = await response.json();
      
      if (!response.ok) {
        const error = data as APIError;
        throw new Error(error.message || '처리 중 오류가 발생했습니다.');
      }
      
      const successData = data as ProcessDocumentResponse;
      
      if (!successData.data || successData.data.testCases.length === 0) {
        throw new Error('테스트 케이스가 생성되지 않았습니다.');
      }
      
      setTestCases(successData.data.testCases);
      setIsProcessing(false);
      
      updateStatus({
        stage: 'completed',
        progress: 100,
        message: `${successData.data.testCases.length}개의 테스트 케이스가 성공적으로 생성되었습니다!`
      });
      
      toast({
        title: "생성 완료",
        description: `${successData.data.testCases.length}개의 테스트 케이스가 생성되었습니다.`,
      });
      
      // 3초 후 상태 클리어
      setTimeout(() => {
        clearStatus();
      }, 3000);
    } catch (error) {
      setIsProcessing(false);
      handleError(error);
    }
  };

  const handleError = (error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    
    updateStatus({
      stage: 'error',
      progress: 0,
      message: errorMessage
    });
    
    toast({
      title: "오류 발생",
      description: errorMessage,
      variant: "destructive",
    });
    
    // 5초 후 에러 상태 클리어
    setTimeout(() => {
      clearStatus();
    }, 5000);
  };

  const handleDownload = async (format: 'xlsx' | 'csv') => {
    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testCases,
          format,
        }),
      });

      if (!response.ok) {
        throw new Error('다운로드 실패');
      }

      const blob = await response.blob();
      console.log('받은 blob 크기:', blob.size);
      
      if (blob.size === 0) {
        throw new Error('빈 파일이 생성되었습니다.');
      }
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `test_cases_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "다운로드 완료",
        description: `${testCases.length}개의 테스트 케이스가 다운로드되었습니다.`,
      });
    } catch (error) {
      console.error('다운로드 에러:', error);
      handleError(error);
    }
  };

  return (
    <>
      <div className="container mx-auto p-6 max-w-7xl">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">테스트 케이스 생성기</h1>
          <p className="text-lg text-muted-foreground">기획 문서(시스템 기획서)를 분석하여 블랙박스 테스트 케이스를 자동 생성합니다</p>
        </div>
        
        {/* 메인 작업 영역 */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* 왼쪽: 업로드 및 처리 상태 */}
          <div className="lg:col-span-1 space-y-6">
            {/* Step 1: 문서 업로드 */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">1</div>
                  <CardTitle>문서 업로드</CardTitle>
                </div>
                <CardDescription>
                  PDF 또는 DOCX 형식의 기획서를 업로드하세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <FolderInput className="h-12 w-12 mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">
                      클릭하여 파일 선택 또는 드래그 앤 드롭
                    </p>
                    <p className="text-xs text-muted-foreground">
                      지원 형식: PDF, DOCX (최대 10MB)
                    </p>
                  </label>
                  {file && (
                    <div className="mt-4 flex items-center justify-center">
                      <File className="h-4 w-4 mr-2" />
                      <span className="text-sm">{file.name}</span>
                    </div>
                  )}
                </div>
                
                {(isUploading || isProcessing) && (
                  <div className="space-y-2">
                    <Progress value={progress} />
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button 
                  onClick={handleUpload} 
                  disabled={!file || isProcessing || isUploading || isTextExtracted}
                  className="flex-1"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      텍스트 추출 중...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      텍스트 추출
                    </>
                  )}
                </Button>
                {isTextExtracted && (
                  <Button 
                    onClick={generateTestCases} 
                    disabled={isProcessing}
                    className="flex-1"
                    variant="default"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        테스트 케이스 생성 중...
                      </>
                    ) : (
                      <>
                        <File className="mr-2 h-4 w-4" />
                        테스트 케이스 생성
                      </>
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>
            
            {/* Step 2: 처리 상태 */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">2</div>
                  <CardTitle>처리 상태</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">총 테스트 케이스</span>
                    <span className="text-2xl font-bold">{testCases.length}</span>
                  </div>
                  {testCases.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-sm font-medium">카테고리별 분포</span>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(
                          testCases.reduce((acc, tc) => {
                            const majorCategory = tc.test_category.split('|')[0] || 'Unknown';
                            acc[majorCategory] = (acc[majorCategory] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>)
                        ).map(([category, count]) => (
                          <Badge key={category} variant="outline">
                            {category}: {count}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Step 3: 다운로드 */}
            {testCases.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">3</div>
                    <CardTitle>다운로드</CardTitle>
                  </div>
                  <CardDescription>
                    생성된 테스트 케이스 내보내기
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button 
                    onClick={() => handleDownload('xlsx')} 
                    className="w-full"
                    size="lg"
                  >
                    <Download className="mr-2 h-5 w-5" />
                    Excel (.xlsx)
                  </Button>
                  <Button 
                    onClick={() => handleDownload('csv')} 
                    variant="outline"
                    className="w-full"
                    size="lg"
                  >
                    <Download className="mr-2 h-5 w-5" />
                    CSV (.csv)
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
          
          {/* 오른쪽: 추출된 텍스트 및 테스트 케이스 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 추출된 텍스트 */}
            {isTextExtracted && extractedText && (
              <Card>
                <CardHeader>
                  <CardTitle>추출된 텍스트</CardTitle>
                  <CardDescription>
                    문서에서 추출된 텍스트를 확인하고 테스트 케이스를 생성하세요
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] w-full rounded-md border p-4 bg-muted/30">
                    <pre className="text-sm whitespace-pre-wrap">{extractedText}</pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
            
            {/* 생성된 테스트 케이스 */}
            {testCases.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>생성된 테스트 케이스</CardTitle>
                  <CardDescription>
                    AI가 분석하여 생성한 블랙박스 테스트 케이스 목록
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="list" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="list">목록 보기</TabsTrigger>
                      <TabsTrigger value="detail">상세 보기</TabsTrigger>
                    </TabsList>
                    <TabsContent value="list">
                      <ScrollArea className="h-[500px] w-full">
                        <Table>
                          <TableCaption>총 {testCases.length}개의 테스트 케이스</TableCaption>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[100px]">TID</TableHead>
                              <TableHead>대분류</TableHead>
                              <TableHead>중분류</TableHead>
                              <TableHead>소분류</TableHead>
                              <TableHead>기대결과</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {testCases.map((tc) => {
                              const categories = tc.test_category.split('|');
                              return (
                                <TableRow key={tc.test_id}>
                                  <TableCell className="font-mono">{tc.test_id}</TableCell>
                                  <TableCell>{categories[0] || ''}</TableCell>
                                  <TableCell>{categories[1] || ''}</TableCell>
                                  <TableCell>{categories[2] || ''}</TableCell>
                                  <TableCell className="max-w-xs truncate">{tc.expected_results}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </TabsContent>
                    <TabsContent value="detail">
                      <ScrollArea className="h-[500px] w-full">
                        {testCases.map((tc, index) => (
                          <Card key={tc.test_id} className="mb-4">
                            <CardHeader>
                              <div className="flex justify-between items-start">
                                <div>
                                  <CardTitle className="text-lg">{tc.test_id}</CardTitle>
                                  <CardDescription>{tc.test_category}</CardDescription>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div>
                                <h4 className="font-semibold mb-2">전제조건</h4>
                                <p className="text-sm text-muted-foreground">{tc.preconditions}</p>
                              </div>
                              <div>
                                <h4 className="font-semibold mb-2">테스트 단계</h4>
                                <ol className="space-y-2">
                                  {tc.steps.map((step) => (
                                    <li key={step.step_no} className="text-sm">
                                      <div className="flex gap-2">
                                        <span className="font-semibold">{step.step_no}.</span>
                                        <div className="flex-1">
                                          <p className="font-medium">{step.action_description}</p>
                                          {step.input_data && (
                                            <p className="text-muted-foreground">입력: {step.input_data}</p>
                                          )}
                                          <p className="text-muted-foreground">예상: {step.expected_output}</p>
                                        </div>
                                      </div>
                                    </li>
                                  ))}
                                </ol>
                              </div>
                              <div>
                                <h4 className="font-semibold mb-2">기대 결과</h4>
                                <p className="text-sm text-muted-foreground">{tc.expected_results}</p>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
      <ProcessingStatusDisplay />
      <Toaster />
    </>
  );
}