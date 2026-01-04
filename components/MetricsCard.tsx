import React from 'react';

interface MetricsCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: string;
    color?: string;
}

const MetricsCard: React.FC<MetricsCardProps> = ({ title, value, icon, trend, color = "text-white" }) => {
    return (
        <div className="glass-panel p-4 rounded-xl flex flex-col space-y-2">
            <div className="flex items-center justify-between text-gray-400 text-sm">
                <span>{title}</span>
                <span className="opacity-70">{icon}</span>
            </div>
            <div className={`text-2xl font-bold ${color}`}>
                {value}
            </div>
            {trend && (
                <div className="text-xs text-gray-500">
                    {trend}
                </div>
            )}
        </div>
    );
};

export default MetricsCard;