
import React, { useState } from 'react';
import { Lock, User, KeyRound, ShieldCheck } from 'lucide-react';
import { apiLogin } from '../services/apiService';

interface LoginPageProps {
    onLogin: (user: { username: string, role: string }) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        
        // Call API to verify
        const result = await apiLogin(username, password);
        setIsLoading(false);
        
        if (result.success && result.role) {
            onLogin({ username, role: result.role });
        } else {
            setError(result.msg || '登录失败');
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
            <div className="bg-[#1e293b] border border-gray-700 p-8 rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-indigo-600 p-3 rounded-xl mb-4 shadow-lg shadow-indigo-500/30">
                        <ShieldCheck className="text-white w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">系统登录</h1>
                    <p className="text-gray-400 text-sm mt-2">智能学习动态效率分析与个性化建议系统</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm text-gray-400 ml-1">账号</label>
                        <div className="relative">
                            <User className="absolute left-3 top-3.5 text-gray-500 w-5 h-5" />
                            <input 
                                type="text"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                className="w-full bg-[#0f172a] border border-gray-700 text-white pl-10 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                placeholder="root / user"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm text-gray-400 ml-1">密码</label>
                        <div className="relative">
                            <KeyRound className="absolute left-3 top-3.5 text-gray-500 w-5 h-5" />
                            <input 
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full bg-[#0f172a] border border-gray-700 text-white pl-10 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                placeholder="请输入密码"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm flex items-center">
                            <Lock className="w-4 h-4 mr-2" />
                            {error}
                        </div>
                    )}

                    <button 
                        type="submit"
                        disabled={isLoading}
                        className={`w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98] ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {isLoading ? '登录中...' : '安全登录'}
                    </button>
                    
                    <div className="text-center text-xs text-gray-500 mt-4">
                        <p>管理员: root / benben123456</p>
                        <p>普通用户: user / 123456</p>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;
