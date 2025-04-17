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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

export default function Component() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processingStep, setProcessingStep] = useState("");
  const [testCases, setTestCases] = useState<any[]>([]);
  
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
    
    // 업로드 진행 시뮬레이션
    const uploadInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(uploadInterval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    try {
      // 파일 데이터 준비
      const formData = new FormData();
      formData.append('file', file);
      
      // 업로드 완료
      clearInterval(uploadInterval);
      setProgress(100);
      setIsUploading(false);
      
      // 처리 시작
      await processDocument(formData);
    } catch (error) {
      clearInterval(uploadInterval);
      setIsUploading(false);
      console.error("업로드 오류:", error);
      toast({
        title: "처리 오류",
        description: "파일 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const processDocument = async (formData: FormData) => {
    setIsProcessing(true);
    setProcessingStep("기획서 분석 중...");
    
    try {
      // 실제 API 연동 코드 사용
      const response = await fetch('/api/process-document', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API 오류: ${response.status}`);
      }
      
      const data = await response.json();
      
      setProcessingStep("테스트 케이스 생성 중... (o4-mini 모델)");
      
      // 테스트 케이스 표시
      setTestCases(data.testCases);
      setIsProcessing(false);
      
      toast({
        title: "처리 완료",
        description: `${data.testCases.length}개의 테스트 케이스가 생성되었습니다.`,
      });
    } catch (error: any) {
      setIsProcessing(false);
      console.error("API 오류:", error);
      toast({
        title: "처리 오류",
        description: error.message || "테스트 케이스 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const downloadExcel = async () => {
    if (testCases.length === 0) {
      toast({
        title: "데이터 없음",
        description: "다운로드할 테스트 케이스가 없습니다.",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "다운로드 시작",
      description: "테스트 케이스 Excel 파일 다운로드를 시작합니다.",
    });
    
    try {
      // API 호출을 통한 엑셀 파일 다운로드
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ testCases }),
      });
      
      if (!response.ok) {
        throw new Error('Excel 파일 생성 중 오류가 발생했습니다.');
      }
      
      // Blob 생성 및 다운로드
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '테스트케이스.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "다운로드 완료",
        description: "테스트 케이스.xlsx 파일이 다운로드되었습니다.",
      });
    } catch (error) {
      console.error('다운로드 오류:', error);
      toast({
        title: "다운로드 오류",
        description: "Excel 파일 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 p-4 md:p-8">
      <div className="container mx-auto max-w-6xl">
        <header className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            LLM 기반 테스트 케이스 생성기
          </h1>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            게임 기획서를 분석하여 자동으로 테스트 케이스를 생성합니다.
            GPT-4.1과 o4-mini 모델을 활용한 고품질 테스트 케이스를 손쉽게 얻어보세요.
          </p>
        </header>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 업로드 섹션 */}
          <Card className="lg:col-span-1 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderInput className="h-5 w-5 text-emerald-500" />
                파일 업로드
              </CardTitle>
              <CardDescription>
                PDF 또는 DOCX 형식의 게임 기획서를 업로드하세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div 
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6 text-center cursor-pointer hover:border-emerald-500 dark:hover:border-emerald-400 transition-colors"
                onClick={() => document.getElementById('fileInput')?.click()}
              >
                <input
                  type="file"
                  id="fileInput"
                  className="hidden"
                  accept=".pdf,.docx"
                  onChange={handleFileChange}
                  disabled={isUploading || isProcessing}
                />
                <Upload className="h-10 w-10 mx-auto mb-3 text-slate-400 dark:text-slate-500" />
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                  클릭하여 파일을 선택하거나 파일을 이곳에 끌어다 놓으세요.
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-500">
                  지원 형식: PDF, DOCX
                </p>
              </div>
              
              {file && (
                <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded-md">
                  <div className="flex items-center gap-2">
                    <File className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
                      {file.name}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {(file.size / 1024).toFixed(1)} KB
                  </Badge>
                </div>
              )}
              
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>업로드 중...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleUpload}
                disabled={!file || isUploading || isProcessing}
              >
                {isUploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                파일 처리 시작
              </Button>
            </CardFooter>
          </Card>
          
          {/* 처리 상태 및 결과 섹션 */}
          <Card className="lg:col-span-2 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <File className="h-5 w-5 text-emerald-500" />
                테스트 케이스 결과
              </CardTitle>
              <CardDescription>
                LLM 처리 결과 및 생성된 테스트 케이스를 확인합니다.
              </CardDescription>
            </CardHeader>
            
            <Tabs defaultValue="table" className="w-full">
              <div className="px-6">
                <TabsList className="w-full">
                  <TabsTrigger value="table" className="flex-1">테이블 뷰</TabsTrigger>
                  <TabsTrigger value="json" className="flex-1">JSON 뷰</TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="table" className="p-0 m-0">
                <CardContent className="p-0">
                  {isProcessing ? (
                    <div className="flex flex-col items-center justify-center p-12 space-y-4">
                      <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                      <div className="text-center">
                        <p className="text-slate-700 dark:text-slate-300 font-medium">{processingStep}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          테스트 케이스를 생성하는 데 몇 분 정도 소요될 수 있습니다.
                        </p>
                      </div>
                    </div>
                  ) : testCases.length > 0 ? (
                    <ScrollArea className="h-[500px]">
                      <Table>
                        <TableCaption>생성된 테스트 케이스 목록</TableCaption>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[80px]">TID</TableHead>
                            <TableHead>대분류</TableHead>
                            <TableHead>중분류</TableHead>
                            <TableHead>소분류</TableHead>
                            <TableHead className="hidden md:table-cell">Precondition</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {testCases.map((testCase) => (
                            <TableRow key={testCase.TID}>
                              <TableCell className="font-medium">{testCase.TID}</TableCell>
                              <TableCell>{testCase.대분류}</TableCell>
                              <TableCell>{testCase.중분류}</TableCell>
                              <TableCell>{testCase.소분류}</TableCell>
                              <TableCell className="hidden md:table-cell max-w-xs truncate">
                                {testCase.Precondition}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-12">
                      <File className="h-16 w-16 text-slate-300 dark:text-slate-700 mb-4" />
                      <p className="text-slate-500 dark:text-slate-400">
                        파일을 업로드하고 처리를 시작하면 이곳에 결과가 표시됩니다.
                      </p>
                    </div>
                  )}
                </CardContent>
              </TabsContent>
              
              <TabsContent value="json" className="p-0 m-0">
                <CardContent className="p-4">
                  {isProcessing ? (
                    <div className="flex flex-col items-center justify-center p-12 space-y-4">
                      <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                      <div className="text-center">
                        <p className="text-slate-700 dark:text-slate-300 font-medium">{processingStep}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          테스트 케이스를 생성하는 데 몇 분 정도 소요될 수 있습니다.
                        </p>
                      </div>
                    </div>
                  ) : testCases.length > 0 ? (
                    <ScrollArea className="h-[500px]">
                      <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-auto text-xs">
                        {JSON.stringify(testCases, null, 2)}
                      </pre>
                    </ScrollArea>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-12">
                      <File className="h-16 w-16 text-slate-300 dark:text-slate-700 mb-4" />
                      <p className="text-slate-500 dark:text-slate-400">
                        파일을 업로드하고 처리를 시작하면 이곳에 결과가 표시됩니다.
                      </p>
                    </div>
                  )}
                </CardContent>
              </TabsContent>
            </Tabs>
            
            <CardFooter className="flex justify-between">
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {testCases.length > 0 ? (
                  <span>총 {testCases.length}개의 테스트 케이스가 생성되었습니다.</span>
                ) : (
                  <span>테스트 케이스가 없습니다.</span>
                )}
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={testCases.length === 0 || isProcessing}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    다운로드
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={downloadExcel}>
                    Excel 형식 (.xlsx)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    toast({
                      title: "준비 중인 기능",
                      description: "현재 Excel 형식만 지원합니다.",
                    });
                  }}>
                    CSV 형식 (.csv)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardFooter>
          </Card>
        </div>
        
        {/* 프로세스 설명 섹션 */}
        <Card className="shadow-md mt-6">
          <CardHeader>
            <CardTitle className="text-lg">처리 프로세스</CardTitle>
            <CardDescription>LLM 기반 테스트 케이스 생성 과정</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-emerald-600 hover:bg-emerald-600">1단계</Badge>
                  <h3 className="font-medium">기획서 분석</h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  GPT-4.1 모델이 게임 기획서를 분석하여 테스트 가능한 기능들을 식별합니다.
                </p>
              </div>
              
              <div className="flex-1 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-emerald-600 hover:bg-emerald-600">2단계</Badge>
                  <h3 className="font-medium">테스트 케이스 생성</h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  o4-mini 모델이 식별된 기능들을 바탕으로 자세한 테스트 케이스를 생성합니다.
                </p>
              </div>
              
              <div className="flex-1 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-emerald-600 hover:bg-emerald-600">3단계</Badge>
                  <h3 className="font-medium">결과 포맷 및 다운로드</h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  생성된 테스트 케이스를 Excel 형식으로 변환하여 다운로드할 수 있습니다.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <Toaster />
    </main>
  );
} 