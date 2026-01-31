import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * Reusable Layout component for all pages
 * Provides consistent header, footer, and auth status banner
 */
const Layout = ({ children, showHeader = true, showFooter = true }) => {
  const { authState } = useAuth();
  const firebaseError = authState.status === 'error' ? authState.error?.message : null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      {showHeader && (
        <header className="bg-gray-800 text-white px-5 py-4 flex-shrink-0">
          <Link to="/" className="no-underline text-white">
            <h1 className="text-3xl font-bold inline-block mr-5 m-0">DecoDocs</h1>
            <p className="inline-block m-0">
              <strong className="text-cyan-400 text-base">Decode documents. Act with confidence.</strong>
            </p>
          </Link>
        </header>
      )}

      {/* Auth Status Banner */}
      <div
        className={`px-5 py-2.5 text-center font-medium text-sm border-b flex-shrink-0 ${
          authState.status === 'authenticated'
            ? 'bg-green-50 text-green-800 border-green-300'
            : 'bg-yellow-50 text-yellow-800 border-yellow-300'
        }`}
      >
        {authState.status === 'authenticated' ? (
          '✅ Firebase authenticated - AI features available'
        ) : firebaseError ? (
          `⚠️ AI calls disabled: "${firebaseError}". Document viewing features remain available.`
        ) : (
          '⚠️ Authenticating with Firebase...'
        )}
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0">
        {children}
      </main>

      {/* Footer */}
      {showFooter && (
        <footer className="text-center py-5 px-5 text-gray-600 border-t flex-shrink-0 bg-gray-50">
          <div className="max-w-6xl mx-auto flex flex-col items-center gap-2.5">
            <p className="m-0 text-gray-600 text-sm">© SnapSign Pty Ltd</p>
            <p className="m-0 text-gray-600 text-sm">ABN 72 679 570 757</p>
            <div className="flex gap-6 flex-wrap justify-center">
              <Link to="/about" className="text-gray-600 no-underline text-sm hover:text-gray-800 transition-colors">
                About
              </Link>
              <a href="#privacy" className="text-gray-600 no-underline text-sm hover:text-gray-800 transition-colors">
                Privacy Policy
              </a>
              <a href="#terms" className="text-gray-600 no-underline text-sm hover:text-gray-800 transition-colors">
                Terms of Service
              </a>
              <a href="#contact" className="text-gray-600 no-underline text-sm hover:text-gray-800 transition-colors">
                Contact
              </a>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default Layout;
