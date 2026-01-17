import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '@/stores/useAppStore';
import { HelpCircle, Home, Server, ArrowLeft } from 'lucide-react';

export function NotFound() {
    const navigate = useNavigate();
    const { serverId } = useParams();
    const { currentServer } = useAppStore();

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-canvas text-text-main p-8 text-center">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <HelpCircle size={48} className="text-primary" />
            </div>
            
            <h1 className="text-4xl font-bold mb-2">Page Not Found</h1>
            <p className="text-lg opacity-60 max-w-md mb-8">
                The page you are looking for doesn't exist or has been moved.
            </p>

            <div className="flex flex-col gap-3 min-w-[200px]">
                <button 
                    onClick={() => navigate(-1)} 
                    className="flex items-center justify-center gap-2 p-3 rounded-lg border border-border hover:bg-white/5 transition-colors font-medium"
                >
                    <ArrowLeft size={18} />
                    Go Back
                </button>

                {(serverId || currentServer) && (
                    <button 
                        onClick={() => navigate(`/server/${serverId || currentServer?.id}`)} 
                        className="flex items-center justify-center gap-2 p-3 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-bold"
                    >
                        <Server size={18} />
                        Server Overview
                    </button>
                )}

                <button 
                    onClick={() => navigate('/')} 
                    className="flex items-center justify-center gap-2 p-3 rounded-lg bg-text-main text-canvas hover:brightness-110 transition-colors font-bold"
                >
                    <Home size={18} />
                    Go to Dashboard
                </button>
            </div>
        </div>
    );
}
