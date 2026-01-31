import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import DocumentViewer from '../components/DocumentViewer';
import * as AuthContext from '../context/AuthContext';

// Mock Firebase
vi.mock('firebase/auth', () => ({
  getIdToken: vi.fn(),
  getAuth: vi.fn(),
  signInAnonymously: vi.fn(),
}));

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({ name: 'mock-functions' })),
  httpsCallable: vi.fn(),
}));

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({ name: 'test-app' })),
  getApps: vi.fn(() => []),
  getApp: vi.fn(() => ({ name: 'test-app' })),
}));

vi.mock('../context/AuthContext', () => ({
  ...vi.importActual('../context/AuthContext'),
  useAuth: vi.fn(),
}));

// Mock PDFjs
vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: {},
  getDocument: vi.fn(() => ({
    promise: Promise.resolve({
      numPages: 1,
      getPage: vi.fn(() =>
        Promise.resolve({
          getViewport: vi.fn(() => ({
            width: 612,
            height: 792,
            transform: [1, 0, 0, 1, 0, 0],
          })),
          render: vi.fn(() => ({ promise: Promise.resolve() })),
          getTextContent: vi.fn(() =>
            Promise.resolve({
              items: [
                { str: 'Test', transform: [0, 0, 0, 0, 0, 0], height: 12, width: 20 },
              ],
            })
          ),
        })
      ),
    }),
  })),
}));

describe('DocumentViewer - Auth Integration', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock window.pdfjsLib
    global.window.pdfjsLib = {
      getDocument: vi.fn(),
    };
  });

  it('should render without crashing when auth is successful', async () => {
    AuthContext.useAuth.mockReturnValue({
      authState: {
        status: 'authenticated',
        user: { uid: 'test-uid' },
        error: null,
      },
      app: { name: 'test-app' },
      auth: { name: 'test-auth' },
    });

    render(
      <BrowserRouter>
        <DocumentViewer />
      </BrowserRouter>
    );

    // Component should render with PDF controls visible
    expect(screen.getByText('Open Different PDF')).toBeInTheDocument();
  });

  it('should render without crashing when auth fails (soft error)', async () => {
    const testError = new Error('Firebase auth failed');
    AuthContext.useAuth.mockReturnValue({
      authState: {
        status: 'error',
        user: null,
        error: testError,
      },
      app: { name: 'test-app' },
      auth: null,
    });

    render(
      <BrowserRouter>
        <DocumentViewer />
      </BrowserRouter>
    );

    // Component should still render even with auth error
    expect(screen.getByText('Open Different PDF')).toBeInTheDocument();
  });

  it('should disable analysis tools when auth fails', async () => {
    const testError = new Error('Firebase auth failed');
    AuthContext.useAuth.mockReturnValue({
      authState: {
        status: 'error',
        user: null,
        error: testError,
      },
      app: { name: 'test-app' },
      auth: null,
    });

    render(
      <BrowserRouter>
        <DocumentViewer />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Analyze Document')).toBeDisabled();
      expect(screen.getByText('Explain Selection')).toBeDisabled();
      expect(screen.getByText('Highlight Risks')).toBeDisabled();
      expect(screen.getByText('Translate to Plain English')).toBeDisabled();
    });
  });

  it('should have analyze tools available when auth succeeds', async () => {
    AuthContext.useAuth.mockReturnValue({
      authState: {
        status: 'authenticated',
        user: { uid: 'test-uid' },
        error: null,
      },
      app: { name: 'test-app' },
      auth: { name: 'test-auth' },
    });

    render(
      <BrowserRouter>
        <DocumentViewer />
      </BrowserRouter>
    );

    await waitFor(() => {
      // Buttons exist and are in the document
      expect(screen.getByText('Analyze Document')).toBeInTheDocument();
      expect(screen.getByText('Explain Selection')).toBeInTheDocument();
      expect(screen.getByText('Highlight Risks')).toBeInTheDocument();
    });
  });

  it('should render component even with missing Firebase config', async () => {
    const testError = new Error('Firebase configuration error');
    AuthContext.useAuth.mockReturnValue({
      authState: {
        status: 'error',
        user: null,
        error: testError,
      },
      app: null,
      auth: null,
    });

    const { container } = render(
      <BrowserRouter>
        <DocumentViewer />
      </BrowserRouter>
    );

    // Component should still render
    expect(screen.getByText('Open Different PDF')).toBeInTheDocument();
  });
});
