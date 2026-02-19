import React, { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import {
    ShieldCheck,
    Power,
    Activity,
    AlertTriangle
} from 'lucide-react';
import Home from './Home';

const Dashboard = () => {
    const navigate = useNavigate();
    const [systemStatus] = useState('OPERATIONAL');

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    return (
        <div className="h-screen w-screen flex flex-col bg-monitor-bg">
            {/* Panic Alert Banner */}
            <div id="panic-banner" className="fixed top-0 left-0 right-0 z-[1000] bg-monitor-danger text-white py-3 text-center font-bold uppercase tracking-[0.3em] transform -translate-y-full transition-transform duration-500 ease-in-out">
                <div className="flex items-center justify-center gap-4">
                    <AlertTriangle size={20} className="animate-pulse" />
                    <span id="panic-message">CRITICAL ALERT: PANIC TRIGGERED</span>
                </div>
            </div>

            {/* Top System Bar */}
            <header className="h-14 px-8 border-b border-monitor-border flex items-center justify-between z-50 bg-monitor-panel">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <ShieldCheck size={18} className="text-monitor-accent" />
                        <h2 className="font-monitor-title text-sm uppercase tracking-[0.2em] font-bold text-monitor-primary">
                            Guardian Monitor
                        </h2>
                    </div>
                    <div className="h-4 w-[1px] bg-monitor-border"></div>
                    <div className="flex items-center gap-2">
                        <Activity size={12} className="text-monitor-success" />
                        <span className="text-[10px] text-monitor-muted font-bold tracking-widest uppercase">{systemStatus}</span>
                    </div>
                </div>

                <div className="flex items-center gap-8">
                    <div className="text-right">
                        <span className="block text-[8px] text-monitor-muted uppercase tracking-tighter">System Operator</span>
                        <span className="text-[11px] font-bold tracking-widest uppercase">ADMIN_01</span>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="p-2 text-monitor-muted hover:text-monitor-danger transition-colors"
                        title="SYSTEM SHUTDOWN"
                    >
                        <Power size={18} />
                    </button>
                </div>
            </header>

            {/* Workspace */}
            <main className="flex-1 relative overflow-hidden">
                <Routes>
                    <Route index element={<Home />} />
                </Routes>
            </main>
        </div>
    );
};

export default Dashboard;
