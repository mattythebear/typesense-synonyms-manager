// pages/index.js
import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useAuth } from "../contexts/AuthContext";
import { useTypesense } from "../contexts/TypesenseContext";
import Navigation from "../components/Navigation";
import ConnectionSelector from "../components/ConnectionSelector";
import SearchPreview from "../components/SearchPreview";
import { BookOpen } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { config, selectedCollection, error: contextError, setError } = useTypesense();
  
  const [synonyms, setSynonyms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setLocalError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [newSynonym, setNewSynonym] = useState({
    synonyms: "",
    root: "",
    isOneWay: false,
  });

  // Combine errors
  const displayError = error || contextError;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Fetch synonyms for selected collection
  const fetchSynonyms = async () => {
    if (!selectedCollection) return;

    setLoading(true);
    setLocalError("");
    setError("");
    try {
      const params = new URLSearchParams({
        collection: selectedCollection,
        host: config.host,
        port: config.port,
        path: "/collections", // config.path,
        protocol: config.protocol,
        apiKey: config.apiKey
      });
      
      console.log('Fetching synonyms with params:', params.toString());
      
      const response = await fetch(`/api/synonyms?${params.toString()}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch synonyms:', response.status, errorText);
        throw new Error(`Failed to fetch synonyms: ${response.status}`);
      }

      const data = await response.json();
      setSynonyms(data.synonyms || []);
    } catch (err) {
      console.error('Fetch synonyms error:', err);
      setLocalError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Add or update synonym
  const saveSynonym = async () => {
    setLoading(true);
    setLocalError("");
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
      setLocalError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete synonym
  const deleteSynonym = async (id) => {
    if (!confirm("Are you sure you want to delete this synonym?")) return;

    setLoading(true);
    setLocalError("");
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
      setLocalError(err.message);
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
    } else {
      setSynonyms([]);
    }
  }, [selectedCollection]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Synonyms - FSD Typesense Manager</title>
        <meta
          name="description"
          content="Manage Typesense collection synonyms"
        />
      </Head>

      <Navigation />

      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
          <BookOpen size={32} />
          Synonyms Manager
        </h1>

        {/* Shared Connection Selector */}
        <ConnectionSelector />

        {/* Synonyms Management */}
        {selectedCollection && (
          <>
            {/* Shared Search Preview */}
            <SearchPreview synonyms={synonyms} />

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
        {displayError && (
          <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {displayError}
          </div>
        )}
      </div>
    </div>
  );
}