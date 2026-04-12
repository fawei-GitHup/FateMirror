import { getAIProviderStatus } from '@/lib/ai/status';

export async function GET() {
  return Response.json({
    status: getAIProviderStatus(),
  });
}
