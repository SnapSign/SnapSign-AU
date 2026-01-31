import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { AuthProvider, useAuth } from '../context/AuthContext';

// Mock Firebase modules
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({ name: 'test-app' })),
  getApps: vi.fn(() => []),
  getApp: vi.fn(() => ({ name: 'test-app' })),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ name: 'test-auth' })),
  signInAnonymously: vi.fn(() =>
    Promise.resolve({
      user: { uid: 'test-uid-12345' },
    })
  ),
}));

// Test component to access auth context
const TestComponent = () => {
  const { authState, app, auth } = useAuth();
  return (
    <div>
      <div data-testid="auth-status">{authState.status}</div>
      <div data-testid="user-id">{authState.user?.uid || 'no-user'}</div>
      <div data-testid="has-error">{authState.error ? 'true' : 'false'}</div>
    </div>
  );
};

describe('AuthContext', () => {
  it('should provide initial pending state', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-status')).toBeInTheDocument();
  });

  it('should authenticate successfully', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
      expect(screen.getByTestId('user-id')).toHaveTextContent('test-uid-12345');
      expect(screen.getByTestId('has-error')).toHaveTextContent('false');
    });
  });

  it('should handle authentication errors gracefully', async () => {
    const { signInAnonymously } = await import('firebase/auth');
    vi.mocked(signInAnonymously).mockRejectedValueOnce(new Error('Auth failed'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('error');
      expect(screen.getByTestId('has-error')).toHaveTextContent('true');
    });
  });
});
