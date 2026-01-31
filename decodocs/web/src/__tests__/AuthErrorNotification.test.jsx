import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import '@testing-library/jest-dom';
import AuthErrorNotification from '../components/AuthErrorNotification';
import * as AuthContext from '../context/AuthContext';

// Mock useAuth hook
vi.mock('../context/AuthContext', () => ({
  ...vi.importActual('../context/AuthContext'),
  useAuth: vi.fn(),
}));

describe('AuthErrorNotification', () => {
  it('should not display notification when auth is authenticated', () => {
    AuthContext.useAuth.mockReturnValue({
      authState: {
        status: 'authenticated',
        user: { uid: 'test-uid' },
        error: null,
      },
    });

    render(<AuthErrorNotification />);

    expect(screen.queryByText('Authentication Unavailable')).not.toBeInTheDocument();
  });

  it('should not display notification when auth is pending', () => {
    AuthContext.useAuth.mockReturnValue({
      authState: {
        status: 'pending',
        user: null,
        error: null,
      },
    });

    render(<AuthErrorNotification />);

    expect(screen.queryByText('Authentication Unavailable')).not.toBeInTheDocument();
  });

  it('should display notification when auth fails', () => {
    const testError = new Error('Firebase auth failed');
    AuthContext.useAuth.mockReturnValue({
      authState: {
        status: 'error',
        user: null,
        error: testError,
      },
    });

    render(<AuthErrorNotification />);

    expect(screen.getByText('Authentication Unavailable')).toBeInTheDocument();
    expect(
      screen.getByText(
        /Some features may be limited, but you can still view documents/i
      )
    ).toBeInTheDocument();
  });

  it('should allow dismissing the notification', () => {
    const testError = new Error('Firebase auth failed');
    AuthContext.useAuth.mockReturnValue({
      authState: {
        status: 'error',
        user: null,
        error: testError,
      },
    });

    render(<AuthErrorNotification />);

    expect(screen.getByText('Authentication Unavailable')).toBeInTheDocument();

    // Click the dismiss button (×)
    const dismissButton = screen.getByRole('button', { name: /dismiss/i });
    fireEvent.click(dismissButton);

    // Notification should disappear
    expect(screen.queryByText('Authentication Unavailable')).not.toBeInTheDocument();
  });

  it('should display error details when expanded', () => {
    const testError = new Error('Firebase auth failed');
    AuthContext.useAuth.mockReturnValue({
      authState: {
        status: 'error',
        user: null,
        error: testError,
      },
    });

    render(<AuthErrorNotification />);

    const detailsSummary = screen.getByText('Error details');
    fireEvent.click(detailsSummary);

    expect(screen.getByText('Firebase auth failed')).toBeInTheDocument();
  });
});
