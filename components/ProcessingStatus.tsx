'use client';

import React from 'react';
import { useProcessing } from '@/contexts/ProcessingContext';
import { Loader2, CheckCircle, XCircle, Upload, Brain } from 'lucide-react';

export function ProcessingStatusDisplay() {
  const { status } = useProcessing();

  if (!status) return null;

  const getIcon = () => {
    switch (status.stage) {
      case 'uploading':
        return <Upload className="w-6 h-6 animate-pulse" />;
      case 'extracting':
        return <Loader2 className="w-6 h-6 animate-spin" />;
      case 'generating':
        return <Brain className="w-6 h-6 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'error':
        return <XCircle className="w-6 h-6 text-red-500" />;
      default:
        return <Loader2 className="w-6 h-6 animate-spin" />;
    }
  };

  const getStageText = () => {
    switch (status.stage) {
      case 'uploading':
        return '파일 업로드 중...';
      case 'extracting':
        return '텍스트 추출 중...';
      case 'generating':
        return '테스트 케이스 생성 중...';
      case 'completed':
        return '처리 완료!';
      case 'error':
        return '오류 발생';
      default:
        return '처리 중...';
    }
  };

  const getBgColor = () => {
    switch (status.stage) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className={`fixed bottom-4 right-4 p-4 rounded-lg border shadow-lg ${getBgColor()} transition-all duration-300 z-50`}>
      <div className="flex items-center space-x-3">
        {getIcon()}
        <div>
          <p className="font-semibold text-sm">{getStageText()}</p>
          <p className="text-xs text-gray-600">{status.message}</p>
          {status.progress > 0 && status.progress < 100 && (
            <div className="mt-2 w-48">
              <div className="bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 rounded-full h-2 transition-all duration-300"
                  style={{ width: `${status.progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{status.progress}% 완료</p>
            </div>
          )}
          {status.estimatedTimeRemaining && (
            <p className="text-xs text-gray-500 mt-1">
              예상 남은 시간: {Math.ceil(status.estimatedTimeRemaining / 60)}분
            </p>
          )}
        </div>
      </div>
    </div>
  );
}