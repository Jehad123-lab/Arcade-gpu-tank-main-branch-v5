import React, { ReactNode } from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';

interface Props {
  children: ReactNode;
  FallbackComponent: React.ComponentType<{ error: Error; resetErrorBoundary: () => void }>;
}

export const ErrorBoundary: React.FC<Props> = ({ children, FallbackComponent }) => {
  return (
    <ReactErrorBoundary
      FallbackComponent={FallbackComponent}
      onReset={() => {
        // Reset logic if needed
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
};

export default ErrorBoundary;
