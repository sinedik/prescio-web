'use client'
import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <p className="text-[10px] font-mono text-danger tracking-widest mb-2">ERROR</p>
          <p className="text-sm font-mono text-text-muted mb-4">
            {this.state.error?.message ?? 'Something went wrong'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="text-xs font-mono text-accent hover:text-accent/80 transition-colors"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
