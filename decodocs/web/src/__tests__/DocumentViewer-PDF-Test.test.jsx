import React from 'react';
import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { BrowserRouter, useParams } from 'react-router-dom';
import DocumentViewer from '../components/DocumentViewer';

// Mock useParams to simulate route parameters
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn(),
    useLocation: vi.fn(() => ({ state: {} })),
    useNavigate: vi.fn(),
  };
});

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
  useAuth: vi.fn(() => ({
    authState: {
      status: 'authenticated',
      user: { uid: 'test-uid' },
      error: null,
    },
    app: { name: 'test-app' },
    auth: { name: 'test-auth' },
  })),
}));

// Mock fetch API for loading test PDFs
global.fetch = vi.fn();

// Mock PDFjs
const mockGetDocument = vi.fn();
const mockGetPage = vi.fn();
const mockGetViewport = vi.fn();
const mockRender = vi.fn();
const mockGetTextContent = vi.fn();

vi.mock('pdfjs-dist', async () => {
  const actual = await vi.importActual('pdfjs-dist');
  return {
    ...actual,
    GlobalWorkerOptions: { workerSrc: '/pdf.worker.min.mjs' },
    getDocument: mockGetDocument,
  };
});

// Mock window.URL.createObjectURL
global.URL = {
  createObjectURL: vi.fn(() => 'mock-url'),
  revokeObjectURL: vi.fn(),
};

// Mock window.alert to prevent jsdom errors
global.alert = vi.fn();

describe('DocumentViewer PDF Loading Tests', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Set up default mock implementations
    global.fetch.mockResolvedValue({
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
    });

    mockGetDocument.mockImplementation((params) => {
      if (params.url) {
        // For test-docs route
        return Promise.resolve({
          promise: Promise.resolve({
            numPages: 1,
            getPage: mockGetPage,
            destroy: vi.fn(),
          }),
        });
      } else if (params.data) {
        // For blob loading
        return Promise.resolve({
          promise: Promise.resolve({
            numPages: 1,
            getPage: mockGetPage,
            destroy: vi.fn(),
          }),
        });
      }
    });

    mockGetPage.mockResolvedValue({
      getViewport: mockGetViewport,
      render: mockRender,
      getTextContent: mockGetTextContent,
    });

    mockGetViewport.mockReturnValue({
      width: 612,
      height: 792,
      transform: [1, 0, 0, 1, 0, 0],
    });

    mockRender.mockReturnValue({ promise: Promise.resolve() });

    mockGetTextContent.mockResolvedValue({
      items: [
        { str: 'Test', transform: [0, 0, 0, 0, 0, 0], height: 12, width: 20 },
      ],
    });
  });

  test('should load test PDF when fileName parameter is present', async () => {
    // Mock useParams to return a fileName parameter
    useParams.mockReturnValue({ documentId: undefined, fileName: 'dummy.pdf' });

    render(
      <BrowserRouter>
        <DocumentViewer />
      </BrowserRouter>
    );

    // Wait for the PDF to be loaded
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/test-docs/dummy.pdf');
    });

    await waitFor(() => {
      expect(mockGetDocument).toHaveBeenCalledWith({ url: '/test-docs/dummy.pdf' });
    });

    // Check that the PDF controls are rendered
    expect(screen.getByText('Open Different PDF')).toBeInTheDocument();
    expect(screen.getByText('Edit & Sign')).toBeInTheDocument();
    expect(screen.getByText(/Page \d+ of \d+/)).toBeInTheDocument();
  });

  test('should handle fetch error when loading test PDF', async () => {
    // Mock fetch to return an error
    global.fetch.mockResolvedValue({
      ok: false,
      statusText: 'Not Found',
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
    });

    useParams.mockReturnValue({ documentId: undefined, fileName: 'nonexistent.pdf' });

    render(
      <BrowserRouter>
        <DocumentViewer />
      </BrowserRouter>
    );

    // Wait for the error handling
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/test-docs/nonexistent.pdf');
    });
  });

  test('should render canvas element when PDF is loaded', async () => {
    useParams.mockReturnValue({ documentId: undefined, fileName: 'dummy.pdf' });

    render(
      <BrowserRouter>
        <DocumentViewer />
      </BrowserRouter>
    );

    // Initially, there should be no canvas
    expect(screen.queryByRole('canvas')).not.toBeInTheDocument();

    // After PDF is loaded, canvas should appear
    await waitFor(() => {
      const canvas = document.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });
  });

  test('should not load test PDF when fileName parameter is not present', async () => {
    // Mock useParams to return no fileName parameter
    useParams.mockReturnValue({ documentId: 'some-id', fileName: undefined });

    render(
      <BrowserRouter>
        <DocumentViewer />
      </BrowserRouter>
    );

    // Wait a bit to ensure no fetch call was made for test-docs
    await waitFor(() => {
      expect(fetch).not.toHaveBeenCalledWith('/test-docs/dummy.pdf');
    });
  });
});