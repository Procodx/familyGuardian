import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ShieldAlert } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await axios.post('/api/auth/login', { email, password });
            localStorage.setItem('token', response.data.access_token);
            navigate('/dashboard');
        } catch (err: any) {
            setError('ACCESS DENIED: INVALID CREDENTIALS');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen flex flex-col items-center justify-center bg-monitor-bg relative">
            <div className="w-full max-w-[360px] p-8 border border-monitor-border bg-monitor-panel">
                <div className="mb-8 text-center">
                    <ShieldAlert size={40} className="text-monitor-accent mx-auto mb-4" />
                    <h1 className="text-xl uppercase tracking-[0.15em] text-monitor-primary">
                        Guardian Monitor Access
                    </h1>
                    <p className="text-monitor-muted text-[10px] mt-2 tracking-[0.2em] uppercase font-mono">
                        Secure System Terminal L01
                    </p>
                </div>

                {error && (
                    <div className="text-monitor-danger text-[11px] font-bold mb-6 p-3 border border-monitor-danger text-center bg-monitor-danger/5 animate-pulse">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="text-[10px] text-monitor-muted block mb-2 uppercase tracking-widest font-semibold">
                            Operator Identity
                        </label>
                        <input
                            type="email"
                            placeholder="EMAIL_ADDRESS"
                            className="monitor-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label className="text-[10px] text-monitor-muted block mb-2 uppercase tracking-widest font-semibold">
                            Access Key
                        </label>
                        <input
                            type="password"
                            placeholder="PASSWORD"
                            className="monitor-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="monitor-btn w-full py-4 text-xs tracking-[0.2em]"
                        disabled={loading}
                    >
                        {loading ? 'AUTHENTICATING...' : 'INITIALIZE SYSTEM'}
                    </button>
                </form>
            </div>

            <div className="absolute bottom-10 flex items-center gap-4 opacity-30 grayscale hover:opacity-100 transition-opacity duration-700">
                <div className="text-[9px] tracking-[0.3em] font-mono text-monitor-muted">
                    SYSTEM_ENCRYPTION_ACTIVE // RSA_4096_VAL
                </div>
            </div>
        </div>
    );
};

export default Login;
