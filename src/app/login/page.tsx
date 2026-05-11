import React from 'react';
import { LoginForm } from './components/LoginForm';
import { SupportSection } from './components/SupportSection';

export default function LoginPage() {
    return (
        <div className="w-full max-w-md mx-auto">
            <LoginForm />
            <SupportSection />
        </div>
    );
}
