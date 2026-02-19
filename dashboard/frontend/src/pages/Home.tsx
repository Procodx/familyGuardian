import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import {
    Smartphone,
    Clock,
    MapPin,
    Wifi,
    AlertCircle,
    Check,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet marker icon
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

interface Device {
    deviceId: string;
    deviceName: string;
    status: 'normal' | 'offline' | 'critical';
    lastSeen: any;
    activePanicId?: string;
    lastLocation?: {
        latitude: number;
        longitude: number;
        accuracy: number;
        timestamp: number;
    };
}

// Custom Red pulsing icon for Panic
const panicIcon = new L.DivIcon({
    className: 'panic-marker-container',
    html: '<div class="panic-marker-dot"></div><div class="panic-marker-pulse"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
});

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
});

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

    const handleAcknowledge = async (deviceId: string) => {
        try {
            const device = devices.find(d => d.deviceId === deviceId);
            if (!device || !device.activePanicId) return;

            const token = localStorage.getItem('token');
            await axios.patch(`/api/panic/${device.activePanicId}/acknowledge`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Status will be updated via Socket automatically
        } catch (err) {
            console.error('Error acknowledging panic:', err);
        }
    };

    useEffect(() => {
        fetchDevices();

        const token = localStorage.getItem('token');
        const newSocket = io({
            auth: { token }
        });

        newSocket.on('device_location_update', (data) => {
            setDevices(prev => prev.map(d =>
                d.deviceId === data.deviceId
                    ? { ...d, status: d.status === 'critical' ? 'critical' : 'normal', lastLocation: data, lastSeen: { _seconds: Date.now() / 1000 } }
                    : d
            ));
        });

        newSocket.on('device_status_update', (data) => {
            setDevices(prev => prev.map(d =>
                d.deviceId === data.deviceId
                    ? { ...d, status: data.status }
                    : d
            ));

            // If acknowledged, we can also hide the banner if it matches this device
            const banner = document.getElementById('panic-banner');
            if (banner && data.status === 'normal') {
                banner.classList.add('-translate-y-full');
                banner.classList.remove('translate-y-0');
            }
        });

        newSocket.on('device_panic_triggered', (data) => {
            console.log('PANIC SIGNAL RECEIVED:', data);
            setDevices(prev => prev.map(d =>
                d.deviceId === data.deviceId
                    ? { ...d, status: 'critical', activePanicId: data.panicId }
                    : d
            ));

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
                }, 150000); // 150s actually, or just long enough
            }
        });

        newSocket.on('panic_resolved', (data) => {
            console.log('PANIC RESOLVED:', data);
            setDevices(prev => prev.map(d =>
                d.deviceId === data.deviceId
                    ? { ...d, status: 'normal', activePanicId: undefined }
                    : d
            ));
        });

        return () => {
            newSocket.close();
        };
    }, []);

    return (
        <div className="flex h-full w-full">
            {/* MAP VIEW - 75% width */}
            <div className="flex-1 relative bg-monitor-bg overflow-hidden flex flex-col items-center justify-center">
                <MapContainer
                    center={devices.find(d => d.lastLocation)?.lastLocation
                        ? [
                            devices.find(d => d.lastLocation)!.lastLocation!.latitude ?? (devices.find(d => d.lastLocation)!.lastLocation as any).lat ?? 52.52,
                            devices.find(d => d.lastLocation)!.lastLocation!.longitude ?? (devices.find(d => d.lastLocation)!.lastLocation as any).lng ?? 13.405
                        ]
                        : [52.52, 13.405]}
                    zoom={13}
                    className="h-full w-full outline-none"
                    style={{ background: '#05070a' }}
                    zoomControl={false}
                >
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        attribution='&copy; CARTO'
                    />
                    {devices.map((device) => (
                        device.lastLocation && (
                            <Marker
                                key={device.deviceId}
                                position={[
                                    device.lastLocation.latitude ?? (device.lastLocation as any).lat ?? 0,
                                    device.lastLocation.longitude ?? (device.lastLocation as any).lng ?? 0
                                ]}
                                icon={device.status === 'critical' ? panicIcon : new L.Icon.Default()}
                            >
                                <Popup>
                                    <div className="text-[10px] font-mono p-1">
                                        <div className={`font-bold uppercase ${device.status === 'critical' ? 'text-monitor-danger animate-pulse' : 'text-monitor-accent'} border-b border-monitor-border mb-2 pb-1`}>
                                            {device.status === 'critical' ? '!!! PANIC ALERT !!!' : device.deviceName}
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between gap-4">
                                                <span className="text-gray-500">LAT</span>
                                                <span>{(device.lastLocation.latitude ?? (device.lastLocation as any).lat ?? 0).toFixed(6)}</span>
                                            </div>
                                            <div className="flex justify-between gap-4">
                                                <span className="text-gray-500">LNG</span>
                                                <span>{(device.lastLocation.longitude ?? (device.lastLocation as any).lng ?? 0).toFixed(6)}</span>
                                            </div>
                                            <div className="flex justify-between gap-4 pt-1 border-t border-monitor-border">
                                                <span className="text-gray-500">STATUS</span>
                                                <span className={device.status === 'critical' ? 'text-monitor-danger font-bold' : 'text-monitor-success'}>
                                                    {device.status.toUpperCase()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        )
                    ))}
                </MapContainer>

                {/* Map Grid Pattern Overlay - Absolute positioned on top of map container? No, Mapbox usually handles z-index, but Leaflet might need it higher if we want it on top */}
                <div className="absolute inset-0 opacity-10 pointer-events-none z-[400]"
                    style={{ backgroundImage: 'radial-gradient(circle, #3062f8 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
                </div>

                {/* Map UI Elements */}
                <div className="absolute top-6 left-6 flex gap-4 z-[500]">
                    <div className="bg-monitor-panel/80 backdrop-blur-md border border-monitor-border p-3 flex flex-col gap-2 shadow-lg">
                        <span className="text-[9px] text-monitor-muted uppercase tracking-widest font-mono">Satellite_Link</span>
                        <span className="text-[10px] font-bold text-monitor-success tracking-widest font-mono italic">ENCRYPTED_SIGNAL_STRESS_OK</span>
                    </div>
                    <div className="bg-monitor-panel/80 backdrop-blur-md border border-monitor-border p-3 flex flex-col gap-2 shadow-lg">
                        <span className="text-[9px] text-monitor-muted uppercase tracking-widest font-mono">Active_Vectors</span>
                        <span className="text-[10px] font-bold text-monitor-accent tracking-widest font-mono italic">{devices.filter(d => d.status === 'normal').length} DETECTED</span>
                    </div>
                </div>

                {/* Coordinate Stream Overlay */}
                <div className="absolute bottom-6 left-6 font-mono text-[9px] text-monitor-muted/60 space-y-1 z-[500] bg-black/20 p-2 backdrop-blur-sm border border-white/5">
                    <div>LOC_FEED_L01: {(devices.find(d => d.status === 'normal')?.lastLocation?.latitude ?? (devices.find(d => d.status === 'normal')?.lastLocation as any)?.lat ?? 52.520006).toFixed(6)}N {(devices.find(d => d.status === 'normal')?.lastLocation?.longitude ?? (devices.find(d => d.status === 'normal')?.lastLocation as any)?.lng ?? 13.404954).toFixed(6)}E :: OK</div>
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
                            <div key={device.deviceId} className={`border p-5 bg-monitor-card/40 transition-all duration-300 ${device.status === 'normal' ? 'border-monitor-accent/30 ' : 'border-monitor-border'}`}>
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 bg-monitor-bg border border-monitor-border ${device.status === 'normal' ? 'text-monitor-success' : 'text-monitor-muted'}`}>
                                            <Smartphone size={16} />
                                        </div>
                                        <div>
                                            <span className="block font-bold text-xs tracking-widest uppercase">{device.deviceName}</span>
                                            <span className="block text-[8px] text-monitor-muted font-mono mt-0.5">{device.deviceId.substring(0, 16)}...</span>
                                        </div>
                                    </div>
                                    <div className={`status-pip ${device.status === 'normal' ? 'status-safe' : 'bg-gray-800'}`}></div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="space-y-1">
                                        <span className="block text-[8px] text-monitor-muted uppercase tracking-tighter">Signal</span>
                                        <div className="flex items-center gap-2 text-[10px] font-bold">
                                            <Wifi size={10} className={device.status === 'normal' ? 'text-monitor-success' : 'text-monitor-muted'} />
                                            {device.status === 'normal' ? 'ENCRYPTED' : 'LOST'}
                                        </div>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <span className="block text-[8px] text-monitor-muted uppercase tracking-tighter">Heartbeat</span>
                                        <div className="flex items-center gap-2 text-[10px] font-bold justify-end">
                                            <Clock size={10} className="text-monitor-muted" />
                                            {device.status === 'normal' ? 'NOMINAL' : 'WAITING'}
                                        </div>
                                    </div>
                                </div>

                                {device.lastLocation && (
                                    <div className="p-3 bg-black/40 border-l-2 border-monitor-accent font-mono text-[9px] text-monitor-accent mb-4 tracking-wider leading-relaxed">
                                        LAT: {(device.lastLocation.latitude ?? (device.lastLocation as any).lat ?? 0).toFixed(6)} <br />
                                        LNG: {(device.lastLocation.longitude ?? (device.lastLocation as any).lng ?? 0).toFixed(6)} <br />
                                        ACC: &plusmn;{(device.lastLocation.accuracy ?? 0).toFixed(1)}m
                                    </div>
                                )}

                                {device.status === 'critical' ? (
                                    <button
                                        onClick={() => handleAcknowledge(device.deviceId)}
                                        className="w-full text-[9px] font-bold uppercase tracking-widest py-2.5 bg-monitor-danger border border-monitor-danger hover:bg-monitor-danger/80 transition-all text-white mb-2 flex items-center justify-center gap-2"
                                    >
                                        <Check size={12} />
                                        Resolve Emergency
                                    </button>
                                ) : (
                                    <button className="w-full text-[9px] font-bold uppercase tracking-widest py-2.5 border border-monitor-border hover:bg-monitor-accent hover:border-monitor-accent transition-all text-monitor-muted hover:text-white mb-2">
                                        Query Transceiver
                                    </button>
                                )}
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
