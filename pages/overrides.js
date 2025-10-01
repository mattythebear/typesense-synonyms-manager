// pages/overrides.js
import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useAuth } from "../contexts/AuthContext";
import { useTypesense } from "../contexts/TypesenseContext";
import Navigation from "../components/Navigation";
import ConnectionSelector from "../components/ConnectionSelector";
import SearchPreview from "../components/SearchPreview";
import { Plus, Trash2, Edit, Shield, Filter, Hash, X } from "lucide-react";

export default function Overrides() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { config, selectedCollection, error: contextError, setError } = useTypesense();
  
  const [overrides, setOverrides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setLocalError] = useState("");
  
  // Override form state
  const [editingId, setEditingId] = useState(null);
  const [overrideForm, setOverrideForm] = useState({
    id: "",
    query: "",
    match: "exact",
    filter_by: "",
    includes: [],
    excludes: [],
    filter_curated_hits: false,
    remove_matched_tokens: false,
    stop_processing: false
  });
  
  const [includeInput, setIncludeInput] = useState({ id: "", position: 1 });
  const [excludeInput, setExcludeInput] = useState("");

  // Combine errors
  const displayError = error || contextError;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Fetch overrides for selected collection
  const fetchOverrides = async () => {
    if (!selectedCollection) return;

    setLoading(true);
    setLocalError("");
    setError("");
    try {
      const params = new URLSearchParams({
        collection: selectedCollection,
        host: config.host,
        port: config.port,
        path: config.path,
        protocol: config.protocol,
        apiKey: config.apiKey
      });
      
      // console.log('Fetching overrides with params:', params.toString());
      
      const response = await fetch(`/api/overrides?${params.toString()}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch overrides:', response.status, errorText);
        throw new Error(`Failed to fetch overrides: ${response.status}`);
      }

      const data = await response.json();
      setOverrides(data.overrides || []);
    } catch (err) {
      console.error('Fetch overrides error:', err);
      setLocalError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Add document to includes list
  const addInclude = () => {
    if (!includeInput.id) return;
    setOverrideForm({
      ...overrideForm,
      includes: [...overrideForm.includes, { ...includeInput }]
    });
    setIncludeInput({ id: "", position: overrideForm.includes.length + 2 });
  };

  // Remove document from includes list
  const removeInclude = (index) => {
    const newIncludes = overrideForm.includes.filter((_, i) => i !== index);
    setOverrideForm({ ...overrideForm, includes: newIncludes });
  };

  // Add document to excludes list
  const addExclude = () => {
    if (!excludeInput) return;
    setOverrideForm({
      ...overrideForm,
      excludes: [...overrideForm.excludes, { id: excludeInput }]
    });
    setExcludeInput("");
  };

  // Remove document from excludes list
  const removeExclude = (index) => {
    const newExcludes = overrideForm.excludes.filter((_, i) => i !== index);
    setOverrideForm({ ...overrideForm, excludes: newExcludes });
  };

  // Save override
  const saveOverride = async () => {
    if (!overrideForm.query) {
      setLocalError("Query is required");
      return;
    }

    setLoading(true);
    setLocalError("");
    setError("");

    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId
        ? `/api/overrides?id=${editingId}&collection=${selectedCollection}`
        : `/api/overrides?collection=${selectedCollection}`;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...overrideForm,
          config,
        }),
      });

      if (!response.ok) throw new Error("Failed to save override");

      await fetchOverrides();
      resetForm();
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete override
  const deleteOverride = async (id) => {
    if (!confirm("Are you sure you want to delete this override?")) return;

    setLoading(true);
    setLocalError("");
    setError("");

    try {
      const response = await fetch(
        `/api/overrides?id=${id}&collection=${selectedCollection}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete override");
      }

      await fetchOverrides();
    } catch (err) {
      console.error("Delete error:", err);
      setLocalError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Edit override
  const startEdit = (override) => {
    setEditingId(override.id);
    setOverrideForm({
      id: override.id,
      query: override.rule.query,
      match: override.rule.match || "exact",
      filter_by: override.rule.filter_by || "",
      includes: override.includes || [],
      excludes: override.excludes || [],
      filter_curated_hits: override.filter_curated_hits || false,
      remove_matched_tokens: override.remove_matched_tokens || false,
      stop_processing: override.stop_processing || false
    });
  };

  // Reset form
  const resetForm = () => {
    setEditingId(null);
    setOverrideForm({
      id: "",
      query: "",
      match: "exact",
      filter_by: "",
      includes: [],
      excludes: [],
      filter_curated_hits: false,
      remove_matched_tokens: false,
      stop_processing: false
    });
    setIncludeInput({ id: "", position: 1 });
    setExcludeInput("");
  };

  useEffect(() => {
    if (selectedCollection) {
      fetchOverrides();
    } else {
      setOverrides([]);
    }
  }, [selectedCollection]);

  if (authLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Override Rules - FSD Typesense Manager</title>
      </Head>

      <Navigation />

      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
          <Shield size={32} />
          Override Rules Manager
        </h1>

        {/* Shared Connection Selector */}
        <ConnectionSelector />

        {/* Override Management */}
        {selectedCollection && (
          <>
            {/* Shared Search Preview - pass overrides */}
            <SearchPreview overrides={overrides} />

            {/* Add/Edit Override Form */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">
                {editingId ? "Edit Override Rule" : "Add New Override Rule"}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Query <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Search query to override"
                    className="w-full px-3 py-2 border rounded-md"
                    value={overrideForm.query}
                    onChange={(e) => setOverrideForm({ ...overrideForm, query: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Match Type
                  </label>
                  <select
                    className="w-full px-3 py-2 border rounded-md"
                    value={overrideForm.match}
                    onChange={(e) => setOverrideForm({ ...overrideForm, match: e.target.value })}
                  >
                    <option value="exact">Exact</option>
                    <option value="contains">Contains</option>
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filter By (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., category:electronics && price:>100"
                  className="w-full px-3 py-2 border rounded-md"
                  value={overrideForm.filter_by}
                  onChange={(e) => setOverrideForm({ ...overrideForm, filter_by: e.target.value })}
                />
              </div>

              {/* Include Documents */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Include Documents (Pin to top)
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Document ID"
                    className="flex-1 px-3 py-2 border rounded-md"
                    value={includeInput.id}
                    onChange={(e) => setIncludeInput({ ...includeInput, id: e.target.value })}
                  />
                  <input
                    type="number"
                    placeholder="Position"
                    className="w-24 px-3 py-2 border rounded-md"
                    min="1"
                    value={includeInput.position}
                    onChange={(e) => setIncludeInput({ ...includeInput, position: parseInt(e.target.value) || 1 })}
                  />
                  <button
                    onClick={addInclude}
                    className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    <Plus size={20} />
                  </button>
                </div>
                {overrideForm.includes.length > 0 && (
                  <div className="space-y-1">
                    {overrideForm.includes.map((inc, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <Hash size={14} className="text-gray-400" />
                        <span className="flex-1">ID: {inc.id}</span>
                        <span className="text-gray-500">Position: {inc.position}</span>
                        <button
                          onClick={() => removeInclude(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Exclude Documents */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exclude Documents (Hide from results)
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Document ID to exclude"
                    className="flex-1 px-3 py-2 border rounded-md"
                    value={excludeInput}
                    onChange={(e) => setExcludeInput(e.target.value)}
                  />
                  <button
                    onClick={addExclude}
                    className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    <Plus size={20} />
                  </button>
                </div>
                {overrideForm.excludes.length > 0 && (
                  <div className="space-y-1">
                    {overrideForm.excludes.map((exc, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <X size={14} className="text-gray-400" />
                        <span className="flex-1">ID: {exc.id}</span>
                        <button
                          onClick={() => removeExclude(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Additional Options */}
              <div className="space-y-2 mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={overrideForm.filter_curated_hits}
                    onChange={(e) => setOverrideForm({ ...overrideForm, filter_curated_hits: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm">Filter curated hits</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={overrideForm.remove_matched_tokens}
                    onChange={(e) => setOverrideForm({ ...overrideForm, remove_matched_tokens: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm">Remove matched tokens from query</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={overrideForm.stop_processing}
                    onChange={(e) => setOverrideForm({ ...overrideForm, stop_processing: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm">Stop processing further rules</span>
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={saveOverride}
                  disabled={loading || !overrideForm.query}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? "Saving..." : editingId ? "Update Override" : "Add Override"}
                </button>
                {editingId && (
                  <button
                    onClick={resetForm}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {/* Overrides List */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Current Override Rules</h2>

              {loading && <p className="text-gray-500">Loading...</p>}

              {!loading && overrides.length === 0 && (
                <p className="text-gray-500">No override rules found for this collection.</p>
              )}

              {!loading && overrides.length > 0 && (
                <div className="space-y-3">
                  {overrides.map((override) => (
                    <div key={override.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Shield size={16} className="text-blue-500" />
                            <span className="font-medium">{override.rule.query}</span>
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {override.rule.match || "exact"}
                            </span>
                          </div>

                          {override.rule.filter_by && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                              <Filter size={14} />
                              <span>Filter: {override.rule.filter_by}</span>
                            </div>
                          )}

                          {override.includes && override.includes.length > 0 && (
                            <div className="text-sm text-green-600 mb-1">
                              Includes: {override.includes.map(inc => `${inc.id} (pos: ${inc.position})`).join(", ")}
                            </div>
                          )}

                          {override.excludes && override.excludes.length > 0 && (
                            <div className="text-sm text-red-600 mb-1">
                              Excludes: {override.excludes.map(exc => exc.id).join(", ")}
                            </div>
                          )}

                          <div className="flex gap-4 text-xs text-gray-500 mt-2">
                            {override.filter_curated_hits && <span>✓ Filter curated</span>}
                            {override.remove_matched_tokens && <span>✓ Remove tokens</span>}
                            {override.stop_processing && <span>✓ Stop processing</span>}
                          </div>
                        </div>

                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => startEdit(override)}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => deleteOverride(override.id)}
                            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            <Trash2 size={16} />
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