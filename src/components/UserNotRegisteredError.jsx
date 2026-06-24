import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';

export default function UserNotRegisteredError() {
  return (
    <AuthLayout
      icon={AlertTriangle}
      title="Account not registered"
      subtitle="Your account is missing from the Bible Gems database"
      footer={
        <Link to="/" className="text-primary font-medium hover:underline">
          Return home
        </Link>
      }
    >
      <p className="text-sm text-foreground text-center">
        It looks like your login succeeded, but your user profile is not set up yet. Please contact support or register again.
      </p>
    </AuthLayout>
  );
}
