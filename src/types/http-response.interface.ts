export interface HttpResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
} 

export interface BatchOperationResult {
  successCount: number;
  failedCount: number;
  failedIds: string[];
}