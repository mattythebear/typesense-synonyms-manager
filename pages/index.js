import { useState, useEffect } from "react";
import Head from "next/head";

export default function Home() {
  const [config, setConfig] = useState({
    host: "",
    port: "8108",
    path: "/collections",
    protocol: "http",
    apiKey: "",
  });
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState("");
  const [synonyms, setSynonyms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newSynonym, setNewSynonym] = useState({
    synonyms: "",
    root: "",
    isOneWay: false,
  });

  // Connect to Typesense
  const connectToTypesense = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (!response.ok) throw new Error("Failed to connect to Typesense");

      const data = await response.json();
      setCollections(data);
      setIsConnected(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch synonyms for selected collection
  const fetchSynonyms = async () => {
    if (!selectedCollection) return;

    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        "/api/synonyms?" +
          new URLSearchParams({
            collection: selectedCollection,
            ...config,
          })
      );

      if (!response.ok) throw new Error("Failed to fetch synonyms");

      const data = await response.json();
      setSynonyms(data.synonyms || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Add or update synonym
  const saveSynonym = async () => {
    setLoading(true);
    setError("");

    const synonymData = newSynonym.isOneWay
      ? {
          root: newSynonym.root.trim(),
          synonyms: newSynonym.synonyms
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        }
      : {
          synonyms: newSynonym.synonyms
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        };

    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId
        ? `/api/synonyms?id=${editingId}&collection=${selectedCollection}`
        : `/api/synonyms?collection=${selectedCollection}`;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...synonymData,
          config,
        }),
      });

      if (!response.ok) throw new Error("Failed to save synonym");

      await fetchSynonyms();
      setNewSynonym({ synonyms: "", root: "", isOneWay: false });
      setEditingId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete synonym
  const deleteSynonym = async (id) => {
    if (!confirm("Are you sure you want to delete this synonym?")) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/synonyms?id=${id}&collection=${selectedCollection}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(config), // Send config directly, not nested
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete synonym");
      }

      // Refresh the synonyms list
      await fetchSynonyms();
    } catch (err) {
      console.error("Delete error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Edit synonym
  const startEdit = (synonym) => {
    setEditingId(synonym.id);
    setNewSynonym({
      synonyms: synonym.synonyms.join(", "),
      root: synonym.root || "",
      isOneWay: !!synonym.root,
    });
  };

  // Cancel edit
  const cancelEdit = () => {
    setEditingId(null);
    setNewSynonym({ synonyms: "", root: "", isOneWay: false });
  };

  useEffect(() => {
    if (selectedCollection) {
      fetchSynonyms();
    }
  }, [selectedCollection]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Typesense Synonyms Manager</title>
        <meta
          name="description"
          content="Manage Typesense collection synonyms"
        />
      </Head>

      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Typesense Synonyms Manager
        </h1>

        {/* Connection Form */}
        {!isConnected && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Connect to Typesense</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input
                type="text"
                placeholder="Host (e.g., localhost)"
                className="px-3 py-2 border rounded-md"
                value={config.host}
                onChange={(e) => setConfig({ ...config, host: e.target.value })}
              />
              <input
                type="text"
                placeholder="Port (default: 8108)"
                className="px-3 py-2 border rounded-md"
                value={config.port}
                onChange={(e) => setConfig({ ...config, port: e.target.value })}
              />
              <select
                className="px-3 py-2 border rounded-md"
                value={config.protocol}
                onChange={(e) =>
                  setConfig({ ...config, protocol: e.target.value })
                }
              >
                <option value="http">HTTP</option>
                <option value="https">HTTPS</option>
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
        )}

        {/* Collection Selector */}
        {isConnected && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Select Collection</h2>
              <button
                onClick={() => {
                  setIsConnected(false);
                  setSelectedCollection("");
                  setSynonyms([]);
                }}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Disconnect
              </button>
            </div>
            <select
              className="w-full px-3 py-2 border rounded-md"
              value={selectedCollection}
              onChange={(e) => setSelectedCollection(e.target.value)}
            >
              <option value="">Select a collection...</option>
              {collections.map((col) => (
                <option key={col.name} value={col.name}>
                  {col.name} ({col.num_documents} documents)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Synonyms Management */}
        {selectedCollection && (
          <>
            {/* Add/Edit Synonym Form */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">
                {editingId ? "Edit Synonym" : "Add New Synonym"}
              </h2>

              {/* Synonym Type Toggle */}
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newSynonym.isOneWay}
                    onChange={(e) =>
                      setNewSynonym({
                        ...newSynonym,
                        isOneWay: e.target.checked,
                      })
                    }
                    className="mr-2"
                  />
                  <span className="font-medium">One-way synonym</span>
                </label>
                <p className="text-sm text-gray-600 mt-1">
                  {newSynonym.isOneWay
                    ? "→ One-way: Root word maps to synonyms (root → synonyms)"
                    : "↔ Multi-way: All words are interchangeable (word1 ↔ word2 ↔ word3)"}
                </p>
              </div>

              <div className="space-y-4">
                {newSynonym.isOneWay && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Root Word
                    </label>
                    <input
                      type="text"
                      placeholder="Enter the root word"
                      className="w-full px-3 py-2 border rounded-md"
                      value={newSynonym.root}
                      onChange={(e) =>
                        setNewSynonym({ ...newSynonym, root: e.target.value })
                      }
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {newSynonym.isOneWay
                      ? "Synonym Words"
                      : "Synonyms (comma-separated)"}
                  </label>
                  <input
                    type="text"
                    placeholder={
                      newSynonym.isOneWay
                        ? "Words that map to the root (comma-separated)"
                        : "Enter synonyms separated by commas"
                    }
                    className="w-full px-3 py-2 border rounded-md"
                    value={newSynonym.synonyms}
                    onChange={(e) =>
                      setNewSynonym({ ...newSynonym, synonyms: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={saveSynonym}
                  disabled={
                    loading ||
                    !newSynonym.synonyms ||
                    (newSynonym.isOneWay && !newSynonym.root)
                  }
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
                >
                  {loading ? "Saving..." : editingId ? "Update" : "Add Synonym"}
                </button>
                {editingId && (
                  <button
                    onClick={cancelEdit}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {/* Synonyms List */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Current Synonyms</h2>

              {loading && <p className="text-gray-500">Loading...</p>}

              {!loading && synonyms.length === 0 && (
                <p className="text-gray-500">
                  No synonyms found for this collection.
                </p>
              )}

              {!loading && synonyms.length > 0 && (
                <div className="space-y-3">
                  {synonyms.map((synonym) => (
                    <div
                      key={synonym.id}
                      className="border rounded-lg p-4 hover:bg-gray-50"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded ${
                                synonym.root
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-green-100 text-green-800"
                              }`}
                            >
                              {synonym.root ? "→ One-way" : "↔ Multi-way"}
                            </span>
                            <span className="text-xs text-gray-500">
                              ID: {synonym.id}
                            </span>
                          </div>

                          {synonym.root ? (
                            <p className="text-gray-700">
                              <span className="font-semibold">
                                {synonym.root}
                              </span>
                              <span className="mx-2">→</span>
                              <span>{synonym.synonyms.join(", ")}</span>
                            </p>
                          ) : (
                            <p className="text-gray-700">
                              {synonym.synonyms.join(" ↔ ")}
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => startEdit(synonym)}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteSynonym(synonym.id)}
                            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
