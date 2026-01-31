import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import HomePage from './components/HomePage.jsx';
import DocumentViewer from './components/DocumentViewer.jsx';
import DocumentEditor from './components/DocumentEditor.jsx';
import AboutPage from './components/AboutPage.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import AuthErrorNotification from './components/AuthErrorNotification.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import './App.css';

// Placeholder component for sign page
const SignPage = () => {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Sign PDF</h1>
      <p>Sign any PDF with DecoDocs</p>
      <p>This feature is coming soon. Please check back later.</p>
      <button onClick={() => window.history.back()} style={{ marginTop: '1rem', padding: '0.5rem 1rem', backgroundColor: '#007acc', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
        Go Back
      </button>
    </div>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AuthErrorNotification />
        <Router>
          <Routes>
            <Route path="/" element={
              <div className="App homepage-app">
                <HomePage />
              </div>
            } />
            <Route path="/app" element={
              <div className="App homepage-app">
                <HomePage />
              </div>
            } />
            <Route path="/sign" element={
              <div className="App">
                <SignPage />
              </div>
            } />
            <Route path="/about" element={
              <div className="App">
                <AboutPage />
              </div>
            } />
            <Route path="/view/:documentId?" element={
              <div className="App">
                <DocumentViewer />
              </div>
            } />
            {/* Specific route for test documents */}
            <Route path="/view/test-docs/:fileName" element={
              <div className="App">
                <DocumentViewer />
              </div>
            } />
            <Route path="/edit/:documentId?" element={
              <div className="App">
                <DocumentEditor />
              </div>
            } />
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;