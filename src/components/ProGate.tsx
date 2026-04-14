import React from 'react';

interface ProGateProps {
  feature: string;
  children: React.ReactNode;
}

export default function ProGate({ feature, children }: ProGateProps) {
  return <>{children}</>;
}
