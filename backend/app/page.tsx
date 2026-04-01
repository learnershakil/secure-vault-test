"use client";

import { useEffect, useState, useRef } from 'react';

type LogEvent = {
  id: string;
  timestamp: string;
  type: string;
  message: string;
  details: any;
};

export default function Dashboard() {
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const eventSource = new EventSource('/api/logs/stream');

    eventSource.onmessage = (event) => {
      const parsedData: LogEvent = JSON.parse(event.data);
      setLogs((prevLogs) => [...prevLogs, parsedData]);
      
      // Auto-scroll to bottom
      setTimeout(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    };

    eventSource.onerror = (error) => {
      console.error('SSE Error:', error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const getLogColor = (type: string) => {
    if (type.includes('ERROR') || type.includes('FAIL') || type.includes('TAMPER')) return 'text-red-400 border-red-900/50 bg-red-950/20';
    if (type.includes('SUCCESS') || type.includes('AUTH') || type.includes('HMAC')) return 'text-orange-400 border-orange-900/50 bg-orange-950/20';
    if (type.includes('WARN') || type.includes('KILL_SWITCH')) return 'text-yellow-400 border-yellow-900/50 bg-yellow-950/20';
    return 'text-amber-400 border-amber-900/50 bg-amber-950/20';
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8 font-mono">
      <header className="mb-8 border-b border-neutral-800 pb-4">
        <h1 className="text-3xl font-bold bg-amber-700 bg-clip-text text-transparent">
          Secure Vault | Security Analytics
        </h1>
        <p className="text-neutral-500 mt-2">Real-time threat monitoring and cryptographic logs</p>
      </header>

      <div className="flex flex-col gap-4">
        {logs.length === 0 ? (
          <div className="text-neutral-600 italic">Waiting for incoming secure connections...</div>
        ) : (
          logs.map((log, index) => (
            <div 
              key={`${log.id}-${index}`} 
              className={`p-4 rounded-xl shadow-lg border backdrop-blur-sm transition-all duration-300 ${getLogColor(log.type)}`}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold tracking-wider text-sm">[{log.type}]</span>
                <span className="text-xs opacity-60 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="mb-2 text-neutral-200">{log.message}</p>
              
              {log.details && Object.keys(log.details).length > 0 && (
                <pre className="text-xs mt-3 p-3 rounded-lg overflow-x-auto bg-black/40 border border-white/5 whitespace-pre-wrap">
                  {JSON.stringify(log.details, null, 2)}
                </pre>
              )}
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}
