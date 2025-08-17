'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ProcessingStatus } from '@/types';

interface ProcessingContextType {
  status: ProcessingStatus | null;
  updateStatus: (status: ProcessingStatus) => void;
  clearStatus: () => void;
}

const ProcessingContext = createContext<ProcessingContextType | undefined>(undefined);

export function ProcessingProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ProcessingStatus | null>(null);

  const updateStatus = (newStatus: ProcessingStatus) => {
    setStatus(newStatus);
  };

  const clearStatus = () => {
    setStatus(null);
  };

  return (
    <ProcessingContext.Provider value={{ status, updateStatus, clearStatus }}>
      {children}
    </ProcessingContext.Provider>
  );
}

export function useProcessing() {
  const context = useContext(ProcessingContext);
  if (context === undefined) {
    throw new Error('useProcessing must be used within a ProcessingProvider');
  }
  return context;
}