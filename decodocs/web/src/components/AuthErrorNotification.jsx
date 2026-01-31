import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * AuthErrorNotification component that displays a non-blocking notification
 * when Firebase authentication fails. Users can dismiss it and continue using the app.
 */
export const AuthErrorNotification = () => {
  const { authState } = useAuth();
  const [dismissed, setDismissed] = React.useState(false);

  // Only show if auth failed and not dismissed
  if (authState.status !== 'error' || dismissed) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        backgroundColor: '#fff3cd',
        border: '1px solid #ffc107',
        borderRadius: '4px',
        padding: '1rem',
        maxWidth: '400px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        zIndex: 1000,
        fontFamily: 'sans-serif',
      }}
      role="alert"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#856404' }}>
            Authentication Unavailable
          </h4>
          <p style={{ margin: '0', color: '#856404', fontSize: '0.9rem' }}>
            Some features may be limited, but you can still view documents. 
            {authState.error && (
              <details style={{ marginTop: '0.5rem' }}>
                <summary style={{ cursor: 'pointer' }}>Error details</summary>
                <code style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.8rem' }}>
                  {authState.error.message}
                </code>
              </details>
            )}
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            color: '#856404',
            padding: 0,
            marginLeft: '1rem',
            flexShrink: 0,
          }}
          aria-label="Dismiss notification"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default AuthErrorNotification;
