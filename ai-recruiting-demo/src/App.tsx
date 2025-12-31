import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ProfileProvider } from './contexts/ProfileContext'
import { AnalysisProvider } from './contexts/AnalysisContext'
import LandingScreen from './features/landing/LandingScreen'
import InputScreen from './features/input/InputScreen'
import LoadingScreen from './features/analysis/LoadingScreen'
import ResultsScreen from './features/results/ResultsScreen'
import NotFound from './components/shared/NotFound'

function App() {
  return (
    <BrowserRouter>
      <ProfileProvider>
        <AnalysisProvider>
          <Routes>
            <Route path="/" element={<LandingScreen />} />
            <Route path="/input" element={<InputScreen />} />
            <Route path="/analysis" element={<LoadingScreen />} />
            <Route path="/results" element={<ResultsScreen />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AnalysisProvider>
      </ProfileProvider>
    </BrowserRouter>
  )
}

export default App
