// src/components/map.tsx
"use client";

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';

interface MapProps {
    denuncias: any[];
    onBack: () => void;
}

export default function MapComponent({ denuncias, onBack }: MapProps) {
    useEffect(() => {
        const DefaultIcon = L.icon({
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });

        L.Marker.prototype.options.icon = DefaultIcon;
    }, []);

    const initialPosition = [-16.4677, -54.6368]; 
    
    const center: [number, number] = denuncias.length > 0 
        ? [Number(denuncias[0].latitude), Number(denuncias[0].longitude)] 
        : [initialPosition[0], initialPosition[1]];

    return (
        <div className="h-screen w-full relative z-0">
            <button 
                onClick={onBack}
                className="absolute top-4 left-15 z-[9999] bg-white text-blue-900 px-4 py-2 rounded-lg shadow-lg font-bold hover:bg-gray-100 transition-colors border border-gray-200"
            >
                ← Voltar
            </button>
            
            <MapContainer 
                center={center} 
                zoom={13} 
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {denuncias.map((item) => (
                    <Marker 
                        key={item.id} 
                        position={[Number(item.latitude), Number(item.longitude)]}
                    >
                        <Popup>
                            <div className="text-center min-w-[150px]">
                                <strong className="block text-lg mb-2 capitalize text-red-900">
                                    {item.status || 'Pendente'}
                                </strong>
                                <p className="text-gray-700 mb-3 text-sm">{item.descricao}</p>
                                
                                {item.fotoUrl && (
                                    <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm mb-2">
                                        <img 
                                            src={item.fotoUrl} 
                                            alt="Foto da denúncia" 
                                            className="w-full h-32 object-cover"
                                        />
                                    </div>
                                )}
                                
                                <span className="text-xs text-gray-400 block mt-1">
                                    {item.dataCriacao ? new Date(item.dataCriacao).toLocaleDateString('pt-BR') : ''}
                                </span>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}