import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

// Catches render-time errors so the whole app never white-screens.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("App error:", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="app">
          <section className="card">
            <h2>Something went wrong</h2>
            <p className="err">{this.state.error.message}</p>
            <button onClick={() => this.setState({ error: null })}>
              Try again
            </button>
          </section>
        </div>
      );
    }
    return this.props.children;
  }
}
