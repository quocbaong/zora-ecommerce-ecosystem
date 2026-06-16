import { useMutation } from '@tanstack/react-query';
import { chatService, ReportPayload } from '../../../services/chat/chatService';

export const useReportConversation = () => {
  return useMutation({
    mutationFn: (payload: ReportPayload) => chatService.reportConversation(payload),
  });
};
