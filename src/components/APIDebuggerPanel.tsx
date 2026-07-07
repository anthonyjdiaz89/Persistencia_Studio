import React, { useState, useEffect } from 'react';

interface UserInfo {
  email?: string;
  plan?: string;
  credits?: number;
  usage?: any;
}

interface Generation {
  id: string;
  model: string;
  status: string;
  prompt?: string;
  resolution?: string;
  duration?: number;
  aspect_ratio?: string;
  created_at?: string;
  video_url?: string;
}

export function APIDebuggerPanel() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedGen, setSelectedGen] = useState<Generation | null>(null);

  const fetchUserInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/seedance/user');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
      const data = await response.json();
      setUserInfo(data);
    } catch (err: any) {
      setError(`Error fetching user info: ${err.message}`);
      console.error('User info error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGenerations = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/seedance/generations?limit=20');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
      const data = await response.json();
      console.log('📊 Generations response:', data);
      
      // VideoGenAPI puede devolver diferentes estructuras
      const gensList = data.generations || data.data || data.results || [];
      setGenerations(gensList);
    } catch (err: any) {
      setError(`Error fetching generations: ${err.message}`);
      console.error('Generations error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGenerationDetails = async (genId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/seedance/generations/${genId}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
      const data = await response.json();
      console.log('📹 Generation details:', data);
      setSelectedGen(data);
    } catch (err: any) {
      setError(`Error fetching generation details: ${err.message}`);
      console.error('Generation details error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserInfo();
    fetchGenerations();
  }, []);

  return (
    <div className="flex flex-col h-full bg-zinc-900 text-white overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-b border-purple-500/30">
        <h2 className="text-xl font-bold flex items-center gap-2">
          🔍 API Debugger
          <span className="text-xs text-purple-300 font-normal">VideoGenAPI Direct Access</span>
        </h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={fetchUserInfo}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? '⏳ Loading...' : '👤 Refresh User Info'}
          </button>
          <button
            onClick={fetchGenerations}
            disabled={loading}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? '⏳ Loading...' : '📊 Refresh Generations'}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-900/30 border border-red-500/50 rounded-lg">
            <div className="flex items-start gap-2">
              <span className="text-xl">⚠️</span>
              <div className="flex-1">
                <div className="font-bold text-red-300">Error</div>
                <div className="text-sm text-red-200 mt-1">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* User Info Card */}
        {userInfo && (
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
              👤 Account Information
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">Email:</span>
                <span className="font-mono">{userInfo.email || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Plan:</span>
                <span className="font-bold text-purple-400">{userInfo.plan || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Credits:</span>
                <span className="font-mono">{userInfo.credits ?? 'N/A'}</span>
              </div>
              {userInfo.usage && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-zinc-400 hover:text-white">
                    Usage Details
                  </summary>
                  <pre className="mt-2 p-2 bg-zinc-900 rounded text-xs overflow-x-auto">
                    {JSON.stringify(userInfo.usage, null, 2)}
                  </pre>
                </details>
              )}
            </div>
            <div className="mt-3 p-2 bg-zinc-900 rounded">
              <details>
                <summary className="cursor-pointer text-xs text-zinc-500 hover:text-white">
                  Raw JSON
                </summary>
                <pre className="mt-2 text-xs overflow-x-auto">
                  {JSON.stringify(userInfo, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        )}

        {/* Generations List */}
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
          <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
            📊 Recent Generations ({generations.length})
          </h3>
          
          {generations.length === 0 ? (
            <div className="text-center text-zinc-500 py-8">
              No generations found or endpoint returned empty
            </div>
          ) : (
            <div className="space-y-2">
              {generations.map((gen) => (
                <div
                  key={gen.id}
                  className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 hover:border-purple-500/50 transition-colors cursor-pointer"
                  onClick={() => fetchGenerationDetails(gen.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs text-zinc-500">{gen.id}</span>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      gen.status === 'completed' ? 'bg-green-600' :
                      gen.status === 'failed' ? 'bg-red-600' :
                      gen.status === 'processing' ? 'bg-yellow-600' :
                      'bg-gray-600'
                    }`}>
                      {gen.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-zinc-500">Model:</span>
                      <span className="ml-2 font-medium">{gen.model || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Resolution:</span>
                      <span className="ml-2 font-bold text-yellow-400">{gen.resolution || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Duration:</span>
                      <span className="ml-2">{gen.duration ? `${gen.duration}s` : 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Aspect:</span>
                      <span className="ml-2">{gen.aspect_ratio || 'N/A'}</span>
                    </div>
                  </div>
                  
                  {gen.prompt && (
                    <div className="mt-2 text-xs text-zinc-400 truncate">
                      {gen.prompt.substring(0, 100)}...
                    </div>
                  )}
                  
                  {gen.created_at && (
                    <div className="mt-2 text-xs text-zinc-600">
                      {new Date(gen.created_at).toLocaleString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Generation Details */}
        {selectedGen && (
          <div className="bg-zinc-800 border border-purple-500/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold flex items-center gap-2">
                📹 Generation Details
              </h3>
              <button
                onClick={() => setSelectedGen(null)}
                className="text-zinc-500 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="bg-zinc-900 rounded p-3 overflow-x-auto">
              <pre className="text-xs">
                {JSON.stringify(selectedGen, null, 2)}
              </pre>
            </div>
            
            {selectedGen.video_url && (
              <div className="mt-3">
                <a
                  href={selectedGen.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors"
                >
                  🎬 Open Video
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
