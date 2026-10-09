import { useEffect, useRef, useState } from 'react';

export default function App() {
  const [value, setValue] = useState(null);
  const [phase, setPhase] = useState('loading');
  const [error, setError] = useState('');
  const busy = useRef(false);
  const sequence = useRef(0);

  async function request(action, lifecycleSignal) {
    if (!lifecycleSignal && busy.current) return;
    const current = ++sequence.current;
    busy.current = true;
    setError('');
    setPhase(action === 'read' ? 'loading' : 'saving');
    try {
      const timeout = AbortSignal.timeout(10000);
      const response = await fetch(action === 'read' ? '/api/counter' : `/api/counter/${action}`, {
        method: action === 'read' ? 'GET' : 'POST',
        signal: lifecycleSignal ? AbortSignal.any([lifecycleSignal, timeout]) : timeout,
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('Request failed');
      const data = await response.json();
      if (!Number.isInteger(data.value)) throw new Error('Invalid counter response');
      if (current === sequence.current) {
        setValue(data.value);
        setPhase('ready');
      }
    } catch {
      if (current === sequence.current && !lifecycleSignal?.aborted) {
        setError(action === 'read'
          ? '读取失败，请检查服务连接后重新读取。'
          : '操作未确认，请重新读取当前值后再操作。');
        setPhase('error');
      }
    } finally {
      if (current === sequence.current) busy.current = false;
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void request('read', controller.signal);
    return () => { controller.abort(); sequence.current++; };
  }, []);

  const pending = phase === 'loading' || phase === 'saving';
  return (
    <main className="card">
      <p className="eyebrow">高级软件工程 · LAB 1</p>
      <h1>共享计数器</h1>
      <p className="intro">一起加一点，或减一点。每次结果都保存在数据库中。</p>
      <section className="counter" aria-busy={pending} aria-label="共享计数操作">
        <p className="value-label">{phase === 'error' && value !== null ? '上次确认的计数' : '当前共享计数'}</p>
        <output data-testid="counter-value" aria-label="当前计数">{value ?? '—'}</output>
        <div className="actions">
          <button type="button" aria-label="减一" disabled={phase !== 'ready'} onClick={() => request('decrement')}>−</button>
          <button type="button" aria-label="加一" disabled={phase !== 'ready'} onClick={() => request('increment')}>+</button>
        </div>
      </section>
      <p className={`status ${phase}`} role="status">
        {phase === 'loading' && '正在读取计数…'}
        {phase === 'saving' && '正在保存，请稍候…'}
        {phase === 'ready' && '已与数据库同步'}
        {phase === 'error' && '暂时无法确认最新计数'}
      </p>
      {error && <p className="error-message" role="alert">{error}</p>}
      <button className="refresh" type="button" disabled={pending} onClick={() => request('read')}>重新读取</button>
      <p className="note">所有访问者共享同一个计数。刷新或重新读取，可获取其他人的最新操作结果。</p>
    </main>
  );
}
