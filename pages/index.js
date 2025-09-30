// pages/index.js
import { useState, useEffect } from "react";
import Head from "next/head";
import dynamic from "next/dynamic";
import { Search, Info } from "lucide-react";

// Dynamically import ProductCard to avoid SSR issues with Next Image
const ProductCard = dynamic(() => import("../components/ProductCard"), {
  ssr: false,
});

// Try to import Navigation - it might not exist yet
let Navigation;
try {
  Navigation = require("../components/Navigation").default;
} catch (e) {
  Navigation = () => null; // Fallback if Navigation doesn't exist
}

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
  const [destServer, setDestServer] = useState("staging");

  // Search-related state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchMetadata, setSearchMetadata] = useState(null);
  const [showScore, setShowScore] = useState(true);

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

  // Search function
  const performSearch = async () => {
    if (!searchQuery.trim() || !selectedCollection) return;

    setSearchLoading(true);
    setError("");
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collection: selectedCollection,
          query: searchQuery,
          searchFields: "name,brand,description", // Adjust based on your schema
          config,
        }),
      });

      if (!response.ok) throw new Error("Search failed");

      const data = await response.json();
      setSearchResults(data.results || []);
      setSearchMetadata({
        found: data.found,
        searchTime: data.search_time_ms,
        originalQuery: data.request_params?.q,
      });
    } catch (err) {
      setError(`Search error: ${err.message}`);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Check if synonyms might be affecting the search
  const checkSynonymMatch = (query) => {
    const queryLower = query.toLowerCase();
    const matchingSynonyms = synonyms.filter((synonym) => {
      if (synonym.root) {
        // One-way synonym
        return (
          synonym.synonyms.some((s) => s.toLowerCase().includes(queryLower)) ||
          synonym.root.toLowerCase().includes(queryLower)
        );
      } else {
        // Multi-way synonym
        return synonym.synonyms.some((s) =>
          s.toLowerCase().includes(queryLower)
        );
      }
    });
    return matchingSynonyms;
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
          body: JSON.stringify(config),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete synonym");
      }

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
      // Clear search results when collection changes
      setSearchResults([]);
      setSearchMetadata(null);
    }
  }, [selectedCollection]);

  const matchingSynonyms = searchQuery ? checkSynonymMatch(searchQuery) : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Synonyms - Typesense Manager</title>
        <meta
          name="description"
          content="Manage Typesense collection synonyms"
        />
      </Head>

      {Navigation && <Navigation />}

      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Synonyms Manager
        </h1>

        {/* Quick Navigation Links */}
        {!Navigation && (
          <div className="mb-4">
            <a href="/overrides" className="text-blue-600 hover:text-blue-800 mr-4">
              Go to Override Rules →
            </a>
          </div>
        )}

        {/* Connection Form */}
        {!isConnected && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Connect to Typesense</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select
                className="px-3 py-2 border rounded-md"
                value={destServer}
                onChange={(e) => {
                  setDestServer(e.target.value);
                  setConfig(
                    e.target.value == "production"
                      ? {
                          ...config,
                          host: "global-typesense.foodservicedirect.us",
                          port: "443",
                          path: "/",
                          protocol: "https",
                        }
                      : {
                          ...config,
                          host: "canada.paperhouse.com",
                          port: "8108",
                          path: "/collections",
                          protocol: "http",
                        }
                  );
                }}
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
                  setSearchResults([]);
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
            {/* Test Search Section */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">Test Search</h2>

              <div className="flex gap-2 mb-4">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Search products to test synonyms..."
                    className="w-full px-3 py-2 border rounded-md pr-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && performSearch()}
                  />
                  <Search
                    className="absolute right-3 top-2.5 text-gray-400"
                    size={20}
                  />
                </div>
                <button
                  onClick={performSearch}
                  disabled={searchLoading || !searchQuery.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {searchLoading ? "Searching..." : "Search"}
                </button>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showScore}
                    onChange={(e) => setShowScore(e.target.checked)}
                  />
                  <span className="text-sm">Show Scores</span>
                </label>
              </div>

              {/* Synonym Match Indicator */}
              {matchingSynonyms.length > 0 && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                  <div className="flex items-start gap-2">
                    <Info size={16} className="text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">
                        Potential synonym matches for "{searchQuery}":
                      </p>
                      <ul className="mt-1 text-sm text-blue-700">
                        {matchingSynonyms.map((syn) => (
                          <li key={syn.id} className="mt-1">
                            {syn.root ? (
                              <>
                                <span className="font-medium">{syn.root}</span>{" "}
                                → {syn.synonyms.join(", ")}
                                {syn.synonyms.includes(
                                  searchQuery.toLowerCase()
                                ) && " (one-way match)"}
                              </>
                            ) : (
                              <>{syn.synonyms.join(" ↔ ")}</>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Search Metadata */}
              {searchMetadata && (
                <div className="mb-4 text-sm text-gray-600">
                  Found {searchMetadata.found} results in{" "}
                  {searchMetadata.searchTime}ms
                  {searchMetadata.originalQuery && (
                    <span> for "{searchMetadata.originalQuery}"</span>
                  )}
                </div>
              )}

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {searchResults.map((product, index) => (
                    <ProductCard
                      key={product.id || index}
                      product={product}
                      showScore={showScore}
                      collectionName={selectedCollection}
                    />
                  ))}
                </div>
              )}

              {searchResults.length === 0 && searchMetadata && (
                <p className="text-gray-500 text-center py-8">
                  No products found for "{searchQuery}"
                </p>
              )}
            </div>

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