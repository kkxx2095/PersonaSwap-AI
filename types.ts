
export interface ImageFile {
  id: string;
  file: File;
  preview: string;
  base64: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: string;
  error?: string;
}

export enum AppStep {
  UPLOAD_SOURCE = 'UPLOAD_SOURCE',
  UPLOAD_TARGET = 'UPLOAD_TARGET',
  PROCESSING = 'PROCESSING',
  RESULTS = 'RESULTS'
}
