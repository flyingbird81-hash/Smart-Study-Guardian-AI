import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { ArrowLeft, Layers, Zap } from 'lucide-react';

interface SystemArchitectureProps {
    onBack: () => void;
}

const ARCHITECTURE_GRAPH = `
graph TD
    %% --- Styles ---
    classDef cloud fill:#e0f2fe,stroke:#0284c7,stroke-width:2px,color:#0c4a6e
    classDef client fill:#dcfce7,stroke:#16a34a,stroke-width:2px,color:#14532d
    classDef server fill:#f3e8ff,stroke:#9333ea,stroke-width:2px,color:#581c87
    classDef hardware fill:#fee2e2,stroke:#dc2626,stroke-width:2px,color:#7f1d1d

    %% === Layer 4: Cloud ===
    subgraph L4 ["☁️ Layer 4: Cloud Intelligence"]
        direction LR
        Gemini_Live["Gemini Live API<br>(WebSocket Audio)"]:::cloud
        Gemini_Pro["Gemini Pro API<br>(REST Vision/Text)"]:::cloud
    end

    %% === Layer 3: Application ===
    subgraph L3 ["🖥️ Layer 3: Frontend App (React)"]
        direction TB
        Audio_Web["Web Audio API<br>(Audio Stream)"]:::client
        State_Logic["State Machine<br>(Focus/Fatigue)"]:::client
        Vision_Wasm["MediaPipe WASM<br>(Local Vision)"]:::client
        React_UI["React UI<br>(Video Render)"]:::client
    end

    %% === Layer 2: Service ===
    subgraph L2 ["🍓 Layer 2: Edge Server (Node.js/RPi)"]
        direction TB
        API_Svc["Express API<br>(Routing)"]:::server
        Stream_Svc["MJPEG Service<br>(Streaming)"]:::server
        DB_Svc["SQLite DB<br>(Storage)"]:::server
        HW_Ctrl["Hardware Ctrl<br>(GPIO/Audio)"]:::server
    end

    %% === Layer 1: Hardware ===
    subgraph L1 ["🔌 Layer 1: Physical Hardware"]
        direction LR
        Mic_Hw["🎤 Mic"]:::hardware
        Speaker_Hw["🔈 Speaker"]:::hardware
        Lamp_Hw["💡 Lamp"]:::hardware
        Cam_Hw["📷 Camera"]:::hardware
    end

    %% === Connections ===
    Mic_Hw ==> Audio_Web
    Audio_Web <==> Gemini_Live

    Cam_Hw ==> Stream_Svc
    Stream_Svc -.-> React_UI
    React_UI --> Vision_Wasm
    Vision_Wasm --> State_Logic
    State_Logic <--> Gemini_Pro

    State_Logic ==> API_Svc
    API_Svc ==> HW_Ctrl
    API_Svc <--> DB_Svc
    
    HW_Ctrl ==> Lamp_Hw
    HW_Ctrl ==> Speaker_Hw
`;

const WORKFLOW_GRAPH = `
graph TD
    classDef input fill:#f1f5f9,stroke:#64748b,stroke-width:2px,color:#334155
    classDef process fill:#fef08a,stroke:#eab308,stroke-width:2px,color:#713f12
    classDef logic fill:#dcfce7,stroke:#16a34a,stroke-width:2px,color:#14532d
    classDef action fill:#fecaca,stroke:#dc2626,stroke-width:2px,color:#7f1d1d

    Start(("Start")) --> Sensor

    subgraph INPUT ["1. Perception"]
        Sensor["Camera Input"]:::input --> Stream["Video Stream"]:::input
    end

    INPUT --> VISION

    subgraph VISION ["2. Vision Analysis (20 FPS)"]
        Vision_Eng["MediaPipe"]:::process
        Calc_EAR{"Calc EAR<br>(Blink)"}:::process
        Calc_MAR{"Calc MAR<br>(Yawn)"}:::process
        Calc_Pose{"Calc Pose<br>(Head)"}:::process
        
        Stream --> Vision_Eng
        Vision_Eng --> Calc_EAR & Calc_MAR & Calc_Pose
    end

    subgraph LOGIC ["3. Logic State"]
        Calc_EAR -->|"EAR < 0.25"| Blink["Fatigue/Close"]:::logic
        Calc_MAR -->|"MAR > 0.5"| Yawn["Yawn"]:::logic
        Calc_Pose -->|"Angle > Threshold"| Distract["Distracted"]:::logic
        
        Blink & Yawn & Distract --> State{"State Fusion"}:::logic
    end

    State -->|"Focused"| Rec["Log Data"]:::action
    State -->|"Fatigued"| Tired["Intervention"]:::action
    State -->|"Distracted"| Alert["Alert"]:::action

    subgraph FEEDBACK ["4. Feedback"]
        Tired -->|"API"| Lamp_F["Lamp: Breathe"]:::action
        Tired -->|"API"| Voice_T["Speaker: Rest"]:::action
        
        Alert -->|"API"| Lamp_B["Lamp: Bright"]:::action
        Alert -->|"API"| Voice_A["Speaker: Focus"]:::action
    end
`;

const DiagramBlock: React.FC<{ code: string; title: string; icon: React.ReactNode }> = ({ code, title, icon }) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (ref.current) {
            try {
                mermaid.initialize({ 
                    startOnLoad: true, 
                    theme: 'base',
                    themeVariables: {
                        primaryColor: '#f1f5f9',
                        primaryTextColor: '#0f172a',
                        primaryBorderColor: '#94a3b8',
                        lineColor: '#475569',
                        secondaryColor: '#ffffff',
                        tertiaryColor: '#f8fafc',
                        fontFamily: 'Inter, sans-serif'
                    } 
                });
                mermaid.run({ nodes: [ref.current] });
            } catch (e) {
                console.error("Mermaid render error", e);
            }
        }
    }, [code]);

    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8 shadow-xl text-slate-900">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
                {icon}
                <span className="ml-3">{title}</span>
            </h3>
            <div className="overflow-x-auto bg-white p-4 rounded-xl border border-gray-100 flex justify-center">
                <div ref={ref} className="mermaid w-full flex justify-center">
                    {code}
                </div>
            </div>
        </div>
    );
};

const SystemArchitecture: React.FC<SystemArchitectureProps> = ({ onBack }) => {
    return (
        <div className="min-h-screen bg-[#0f172a] text-white p-6 md:p-12 animate-fade-in">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center mb-10">
                    <button onClick={onBack} className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 mr-4 transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center">
                            <Layers className="mr-3 text-indigo-400" />
                            System Architecture
                        </h1>
                        <p className="text-gray-400 mt-1">Technical Architecture & Logic Flow</p>
                    </div>
                </div>

                <div className="space-y-8">
                    <DiagramBlock 
                        title="Architecture Layers" 
                        icon={<Layers className="text-blue-600" />}
                        code={ARCHITECTURE_GRAPH} 
                    />
                    
                    <DiagramBlock 
                        title="Core Workflow" 
                        icon={<Zap className="text-yellow-600" />}
                        code={WORKFLOW_GRAPH} 
                    />
                </div>
            </div>
        </div>
    );
};

export default SystemArchitecture;