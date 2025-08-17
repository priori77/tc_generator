import { NextRequest, NextResponse } from "next/server";
import { FileServiceImpl } from "@/services/fileService";

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "파일이 제공되지 않았습니다." },
        { status: 400 }
      );
    }

    const fileService = new FileServiceImpl();
    const text = await fileService.extractText(file);

    return NextResponse.json({
      success: true,
      text,
      fileName: file.name,
      fileSize: file.size
    });
  } catch (error) {
    console.error("Text extraction error:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "텍스트 추출 중 오류가 발생했습니다." 
      },
      { status: 500 }
    );
  }
}