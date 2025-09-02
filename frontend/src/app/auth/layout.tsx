import React from 'react';

export const metadata = {
  title: 'BK Member Site',
  description: 'Business Fraternity Member Management System',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>;
}
