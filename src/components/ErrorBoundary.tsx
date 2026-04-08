import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error("[ErrorBoundary]", error, info.componentStack);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="mx-auto max-w-md text-center space-y-6">
          <div className="text-5xl font-bold tracking-tight text-primary">Atlas QMS</div>
          <h1 className="text-xl font-semibold text-foreground">
            Ocorreu um erro inesperado / Ha ocurrido un error inesperado
          </h1>
          <p className="text-sm text-muted-foreground">
            A aplicação encontrou um problema. Tente recarregar a página.
            <br />
            La aplicación encontró un problema. Intente recargar la página.
          </p>
          {this.state.error && (
            <details className="mt-4 text-left">
              <summary className="text-xs text-destructive cursor-pointer">Detalhe do erro</summary>
              <pre className="mt-2 max-h-40 overflow-auto rounded-md border border-border bg-muted p-3 text-xs text-destructive whitespace-pre-wrap">
                {this.state.error.message}
              </pre>
            </details>
          )}
          <button
            onClick={this.handleReload}
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Recarregar / Recargar
          </button>
        </div>
      </div>
    );
  }
}
