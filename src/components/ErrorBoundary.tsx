import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/** 兜底：任何渲染错误都不该让整页变白。 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[render error]', error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
        <div style={{ maxWidth: 460, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 8 }}>这一页出了点问题</div>
          <p style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.7 }}>
            界面渲染时抛了异常。行程数据还在本地，刷新即可恢复；如果反复出现，把下面这行错误发我。
          </p>
          <pre
            style={{
              marginTop: 12,
              padding: 10,
              borderRadius: 8,
              background: 'var(--paper-3)',
              fontSize: 10.5,
              textAlign: 'left',
              whiteSpace: 'pre-wrap',
              color: 'var(--red)',
            }}
          >
            {this.state.error.message}
          </pre>
          <button className="btn btn-accent" style={{ marginTop: 14 }} onClick={() => location.reload()}>
            刷新页面
          </button>
        </div>
      </div>
    );
  }
}
