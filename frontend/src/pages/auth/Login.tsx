import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pill, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/auth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [email, setEmail] = useState('admin@hpms.hospital');
  const [password, setPassword] = useState('admin123');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await authApi.login({ email, password });
      setAuth(response.user, response.access_token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const setDemoCredentials = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="bg-white border border-border rounded-lg p-8">
      {/* Brand Header */}
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-12 h-12 rounded-md bg-accent text-white flex items-center justify-center mb-3">
          <Pill className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-text-primary tracking-tight">Hospital Pharmacy System</h1>
        <p className="text-xs text-text-secondary mt-1">
          Secure staff sign-in & inventory access
        </p>
      </div>

      {error && (
        <div className="mb-5 p-3 rounded-md bg-danger-soft border border-danger/30 text-danger text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Hospital Email Address"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@hpms.hospital"
        />

        <Input
          label="Password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />

        <Button type="submit" variant="primary" className="w-full mt-2" isLoading={isLoading}>
          <ShieldCheck className="w-4 h-4 mr-1.5" /> Sign In to HPMS
        </Button>
      </form>

      {/* Demo Credentials Helper */}
      <div className="mt-8 pt-5 border-t border-border">
        <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2 text-center">
          Quick Demo Roles (Click to fill)
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => setDemoCredentials('admin@hpms.hospital', 'admin123')}
            className="p-2 border border-border rounded text-left hover:bg-surface transition-colors"
          >
            <span className="font-semibold block text-text-primary">Admin</span>
            <span className="text-[11px] text-text-secondary">Full control</span>
          </button>

          <button
            type="button"
            onClick={() => setDemoCredentials('pharmacist@hpms.hospital', 'pharm123')}
            className="p-2 border border-border rounded text-left hover:bg-surface transition-colors"
          >
            <span className="font-semibold block text-text-primary">Pharmacist</span>
            <span className="text-[11px] text-text-secondary">Stock & FEFO</span>
          </button>

          <button
            type="button"
            onClick={() => setDemoCredentials('billing@hpms.hospital', 'bill123')}
            className="p-2 border border-border rounded text-left hover:bg-surface transition-colors"
          >
            <span className="font-semibold block text-text-primary">Billing Staff</span>
            <span className="text-[11px] text-text-secondary">POS & Invoices</span>
          </button>

          <button
            type="button"
            onClick={() => setDemoCredentials('dept@hpms.hospital', 'dept123')}
            className="p-2 border border-border rounded text-left hover:bg-surface transition-colors"
          >
            <span className="font-semibold block text-text-primary">Nurse / Ward</span>
            <span className="text-[11px] text-text-secondary">Requisitions</span>
          </button>
        </div>
      </div>
    </div>
  );
};
