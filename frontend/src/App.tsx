import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AppProviders } from '@/providers/AppProviders'
import './index.css'

function App() {
  return (
    <ErrorBoundary>
      <AppProviders />
    </ErrorBoundary>
  )
}

export default App
