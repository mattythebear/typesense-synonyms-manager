// components/ConnectionSelector.js
import { useTypesense } from '../contexts/TypesenseContext';
import { Database, X } from 'lucide-react';

export default function ConnectionSelector() {
  const {
    config,
    setConfig,
    collections,
    selectedCollection,
    setSelectedCollection,
    isConnected,
    loading,
    destServer,
    updateDestServer,
    connectToTypesense,
    disconnect
  } = useTypesense();

  if (!isConnected) {
    return (
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Database size={20} />
          Connect to Typesense
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select
            className="px-3 py-2 border rounded-md"
            value={destServer}
            onChange={(e) => updateDestServer(e.target.value)}
          >
            <option value="staging">Staging</option>
            <option value="production">Production</option>
          </select>
          <input
            type="password"
            placeholder="API Key"
            className="px-3 py-2 border rounded-md"
            value={config.apiKey}
            onChange={(e) =>
              setConfig({ ...config, apiKey: e.target.value })
            }
          />
        </div>
        <button
          onClick={connectToTypesense}
          disabled={loading || !config.host || !config.apiKey}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? "Connecting..." : "Connect"}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Database size={20} />
          Collection
        </h2>
        <button
          onClick={disconnect}
          className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
        >
          <X size={16} />
          Disconnect
        </button>
      </div>
      <div className="space-y-2">
        <select
          className="w-full px-3 py-2 border rounded-md"
          value={selectedCollection}
          onChange={(e) => setSelectedCollection(e.target.value)}
        >
          <option value="">Select a collection...</option>
          {collections.map((col) => (
            <option key={col.name} value={col.name}>
              {col.name} ({col.num_documents?.toLocaleString() || 0} documents)
            </option>
          ))}
        </select>
        {selectedCollection && (
          <div className="text-sm text-gray-600">
            Connected to: <span className="font-medium">{config.host}</span> ({destServer})
          </div>
        )}
      </div>
    </div>
  );
}