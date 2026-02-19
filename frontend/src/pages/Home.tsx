import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import {
    Smartphone,
    Clock,
    MapPin,
    Wifi,
    Battery,
    AlertCircle
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
    const [panicActive, setPanicActive] = useState(false);

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
            setPanicActive(true);
            const banner = document.getElementById('panic-banner');
            const message = document.getElementById('panic-message');
            if (banner && message) {
                message.innerText = `CRITICAL ALERT: ${data.deviceName.toUpperCase()} TRIGGERED PANIC`;
                banner.classList.add('active');

                // Auto hide after 10 seconds unless persistent requested
                setTimeout(() => {
                    banner.classList.remove('active');
                    setPanicActive(false);
                }, 10000);
            }
        });

        return () => {
            newSocket.close();
        };
    }, []);

    return (
        <div style={{ display: 'flex', height: '100%', width: '100%' }}>
            {/* MAP VIEW - Dominates 75% of screen */}
            <div style={{ flex: 1, position: 'relative', backgroundColor: '#0a0a0a' }}>
                {/* Placeholder for Mapbox integration */}
                <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    backgroundImage: 'radial-gradient(circle, #1a1a1a 1px, transparent 1px)',
                    backgroundSize: '30px 30px'
                }}>
                    <MapPin size={48} color="#333" />
                    <p style={{ color: '#333', marginTop: '1rem', textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '10px' }}>
                        Awaiting Location Grid Feed
                    </p>
                </div>

                {/* Map Overlays (e.g. coordinates or crosshair) */}
                <div style={{ position: 'absolute', bottom: '20px', left: '20px', color: 'var(--text-muted)', fontSize: '10px', fontFamily: 'monospace' }}>
                    GRID_COORD_REF: 52.5200 / 13.4050
                </div>
            </div>

            {/* FLOATING STATUS PANEL - Right Side */}
            <div style={{
                width: '380px',
                borderLeft: '1px solid var(--border)',
                backgroundColor: 'var(--bg-panel)',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
                    <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Device Tracking Feed</h3>
                </div>

                <div className="scroll-thin" style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                    {devices.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            {loading ? 'SYNCHRONIZING...' : 'NO ACTIVE TRANSCEIVERS FOUND'}
                        </div>
                    ) : (
                        devices.map((device) => (
                            <div key={device.deviceId} className="panel" style={{
                                marginBottom: '0.75rem',
                                padding: '1.25rem',
                                backgroundColor: 'var(--bg-card)',
                                borderColor: device.status === 'online' ? 'rgba(48, 98, 248, 0.3)' : 'var(--border)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <Smartphone size={16} color={device.status === 'online' ? 'var(--accent)' : 'var(--text-muted)'} />
                                        <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{device.deviceName.toUpperCase()}</span>
                                    </div>
                                    <div className={`status-pip ${device.status === 'online' ? 'status-safe' : ''}`}
                                        style={device.status === 'offline' ? { background: '#333' } : {}}></div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <Wifi size={12} />
                                            {device.status === 'online' ? 'ENCRYPTED' : 'OFFLINE'}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'flex-end' }}>
                                            <Clock size={12} />
                                            {device.lastSeen?._seconds ? 'ACTIVE' : 'LOST'}
                                        </div>
                                    </div>
                                </div>

                                {device.lastLocation && (
                                    <div style={{ marginTop: '1rem', padding: '8px', background: 'rgba(0,0,0,0.2)', fontSize: '0.7rem', fontFamily: 'monospace' }}>
                                        LAT: {device.lastLocation.latitude.toFixed(6)} <br />
                                        LNG: {device.lastLocation.longitude.toFixed(6)}
                                    </div>
                                )}

                                <button className="btn-monitor" style={{
                                    width: '100%',
                                    fontSize: '10px',
                                    marginTop: '1rem',
                                    padding: '8px',
                                    backgroundColor: 'rgba(255,255,255,0.05)',
                                    border: '1px solid var(--border)',
                                    color: 'white'
                                }}>
                                    VIEW DATA LOGS
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* System Messages */}
                <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-deep)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.75rem', color: 'var(--accent)' }}>
                        <AlertCircle size={14} />
                        <span style={{ fontWeight: 'bold' }}>SYSTEM LOGS: GATEWAY READY</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;
