import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import {
    Smartphone,
    Clock,
    MapPin,
    Wifi,
    AlertCircle,
    Crosshair
} from 'lucide-react';

interface Device {
    deviceId: string;
    deviceName: string;
    status: 'online' | 'offline';
    lastSeen: any;
    lastLocation?: {
        latitude: number;
        longitude: number;
        accuracy: number;
        timestamp: number;
    };
}

const Home = () => {
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchDevices = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/device/list', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDevices(response.data);
        } catch (err) {
            console.error('Error fetching devices:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDevices();

        const token = localStorage.getItem('token');
        const newSocket = io('http://localhost:3000', {
            auth: { token }
        });

        newSocket.on('device_location_update', (data) => {
            setDevices(prev => prev.map(d =>
                d.deviceId === data.deviceId
                    ? { ...d, status: 'online', lastLocation: data, lastSeen: { _seconds: Date.now() / 1000 } }
                    : d
            ));
        });

        newSocket.on('device_panic_triggered', (data) => {
            const banner = document.getElementById('panic-banner');
            const message = document.getElementById('panic-message');
            if (banner && message) {
                message.innerText = `CRITICAL ALERT: ${data.deviceName.toUpperCase()} TRIGGERED PANIC`;
                banner.classList.add('translate-y-0');
                banner.classList.remove('-translate-y-full');

                // Auto hide after 15 seconds
                setTimeout(() => {
                    banner.classList.add('-translate-y-full');
                    banner.classList.remove('translate-y-0');
                }, 15000);
            }
        });

        return () => {
            newSocket.close();
        };
    }, []);

    return (
        <div className="flex h-full w-full">
            {/* MAP VIEW - 75% width */}
            <div className="flex-1 relative bg-monitor-bg overflow-hidden">
                {/* Map Grid Pattern Overlay */}
                <div className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(circle, #3062f8 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
                </div>

                {/* Map UI Elements */}
                <div className="absolute top-6 left-6 flex gap-4">
                    <div className="bg-monitor-panel/80 backdrop-blur-md border border-monitor-border p-3 flex flex-col gap-2">
                        <span className="text-[9px] text-monitor-muted uppercase tracking-widest font-mono">Satellite_Link</span>
                        <span className="text-[10px] font-bold text-monitor-success tracking-widest font-mono italic">ENCRYPTED_SIGNAL_STRESS_OK</span>
                    </div>
                    <div className="bg-monitor-panel/80 backdrop-blur-md border border-monitor-border p-3 flex flex-col gap-2">
                        <span className="text-[9px] text-monitor-muted uppercase tracking-widest font-mono">Active_Vectors</span>
                        <span className="text-[10px] font-bold text-monitor-accent tracking-widest font-mono italic">{devices.filter(d => d.status === 'online').length} DETECTED</span>
                    </div>
                </div>

                {/* Big Crosshair Center Placeholder */}
                <div className="w-full h-full flex flex-col items-center justify-center relative">
                    <Crosshair size={64} className="text-monitor-border opacity-20" />
                    <div className="mt-6 flex flex-col items-center gap-2">
                        <MapPin size={32} className="text-monitor-muted opacity-40 animate-pulse" />
                        <p className="text-monitor-muted uppercase tracking-[0.4em] text-[10px] font-bold">
                            GRID_SCAN_INITIALIZING
                        </p>
                    </div>

                    {/* Decorative Corner Borders */}
                    <div className="absolute top-10 left-10 w-20 h-20 border-t-2 border-l-2 border-monitor-accent/20"></div>
                    <div className="absolute top-10 right-10 w-20 h-20 border-t-2 border-r-2 border-monitor-accent/20"></div>
                    <div className="absolute bottom-10 left-10 w-20 h-20 border-b-2 border-l-2 border-monitor-accent/20"></div>
                    <div className="absolute bottom-10 right-10 w-20 h-20 border-b-2 border-r-2 border-monitor-accent/20"></div>
                </div>

                {/* Coordinate Stream Overlay */}
                <div className="absolute bottom-6 left-6 font-mono text-[9px] text-monitor-muted/60 space-y-1">
                    <div>LOC_FEED_L01: 52.520006N 13.404954E :: OK</div>
                    <div>NET_LATENCY: 14ms :: OK</div>
                    <div>TIMESTAMP: {new Date().toISOString()}</div>
                </div>
            </div>

            {/* DEVICE STATUS PANEL - Fixed Width */}
            <div className="w-[420px] border-l border-monitor-border bg-monitor-panel flex flex-col shadow-2xl">
                <div className="p-6 border-b border-monitor-border flex items-center justify-between bg-monitor-bg/50">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-monitor-muted">Transceiver Feed</h3>
                    <div className="flex gap-1">
                        <div className="w-1 h-1 bg-monitor-accent animate-ping"></div>
                        <div className="w-1 h-1 bg-monitor-accent opacity-50"></div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-thin">
                    {devices.length === 0 ? (
                        <div className="py-20 text-center space-y-4 opacity-30">
                            <Smartphone size={32} className="mx-auto" />
                            <p className="text-[10px] tracking-widest uppercase">Initializing Registry...</p>
                        </div>
                    ) : (
                        devices.map((device) => (
                            <div key={device.deviceId} className={`border p-5 bg-monitor-card/40 transition-all duration-300 ${device.status === 'online' ? 'border-monitor-accent/30 ' : 'border-monitor-border'}`}>
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 bg-monitor-bg border border-monitor-border ${device.status === 'online' ? 'text-monitor-success' : 'text-monitor-muted'}`}>
                                            <Smartphone size={16} />
                                        </div>
                                        <div>
                                            <span className="block font-bold text-xs tracking-widest uppercase">{device.deviceName}</span>
                                            <span className="block text-[8px] text-monitor-muted font-mono mt-0.5">{device.deviceId.substring(0, 16)}...</span>
                                        </div>
                                    </div>
                                    <div className={`status-pip ${device.status === 'online' ? 'status-safe' : 'bg-gray-800'}`}></div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="space-y-1">
                                        <span className="block text-[8px] text-monitor-muted uppercase tracking-tighter">Signal</span>
                                        <div className="flex items-center gap-2 text-[10px] font-bold">
                                            <Wifi size={10} className={device.status === 'online' ? 'text-monitor-success' : 'text-monitor-muted'} />
                                            {device.status === 'online' ? 'ENCRYPTED' : 'LOST'}
                                        </div>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <span className="block text-[8px] text-monitor-muted uppercase tracking-tighter">Heartbeat</span>
                                        <div className="flex items-center gap-2 text-[10px] font-bold justify-end">
                                            <Clock size={10} className="text-monitor-muted" />
                                            {device.status === 'online' ? 'NOMINAL' : 'WAITING'}
                                        </div>
                                    </div>
                                </div>

                                {device.lastLocation && (
                                    <div className="p-3 bg-black/40 border-l-2 border-monitor-accent font-mono text-[9px] text-monitor-accent mb-4 tracking-wider leading-relaxed">
                                        LAT: {device.lastLocation.latitude.toFixed(6)} <br />
                                        LNG: {device.lastLocation.longitude.toFixed(6)} <br />
                                        ACC: &plusmn;{device.lastLocation.accuracy.toFixed(1)}m
                                    </div>
                                )}

                                <button className="w-full text-[9px] font-bold uppercase tracking-widest py-2.5 border border-monitor-border hover:bg-monitor-accent hover:border-monitor-accent transition-all text-monitor-muted hover:text-white">
                                    Query Transceiver
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* System Footer Info */}
                <div className="p-4 border-top border-monitor-border bg-monitor-bg/80 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[9px] font-bold text-monitor-accent tracking-widest">
                        <AlertCircle size={14} />
                        <span>COMMAND_GATEWAY_SEC_01</span>
                    </div>
                    <div className="text-[9px] text-monitor-muted font-mono italic">
                        v1.0.4r
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;
