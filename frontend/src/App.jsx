import { useEffect, useState } from 'react';

export default function App() {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    const controller = new AbortController();

    async function checkHealth() {
      try {
        const response = await fetch('/api/health', { signal: controller.signal });
        if (!response.ok) throw new Error('Health check failed');
        const data = await response.json();
        if (data.status !== 'ok' || data.database !== 'connected') {
          throw new Error('Unexpected health response');
        }
        setStatus('ready');
      } catch (error) {
        if (error.name !== 'AbortError') setStatus('error');
      }
    }

    checkHealth();
    return () => controller.abort();
  }, []);

  return (
    <main className="card">
      <p className="eyebrow">高级软件工程 · LAB 1</p>
      <h1>共享计数器</h1>
      <p>React + Node.js + MySQL</p>
      <p className={`status ${status}`} role="status">
        {status === 'checking' && '正在检查服务连接…'}
        {status === 'ready' && '后端与数据库连接正常'}
        {status === 'error' && '服务暂不可用，请检查服务状态后刷新页面。'}
      </p>
      <p className="note">项目骨架已建立，计数显示与加减功能将在后续实现。</p>
    </main>
  );
}
