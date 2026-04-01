export const dynamic = 'force-dynamic';

import { securityLogger } from '../../../../lib/logger';

export async function GET(req: Request) {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      const sendEvent = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Send initial connection success event
      sendEvent({ type: 'CONNECTED', message: 'SSE Stream connected successfully', timestamp: new Date().toISOString() });

      // Listen for global security logs
      const logListener = (logEvent: any) => {
        sendEvent(logEvent);
      };

      securityLogger.on('log', logListener);

      req.signal.addEventListener('abort', () => {
        securityLogger.off('log', logListener);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
