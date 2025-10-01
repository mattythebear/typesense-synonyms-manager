// components/SearchPreview.js
import { useState, useEffect } from 'react';
import { useTypesense } from '../contexts/TypesenseContext';
import dynamic from "next/dynamic";
import { Search, Info, ChevronUp, ChevronDown } from 'lucide-react';

// Dynamically import ProductCard to avoid SSR issues
const ProductCard = dynamic(() => import("./ProductCard"), {
  ssr: false,
});

export default function SearchPreview({ synonyms = [], overrides = [] }) {
  const { config, selectedCollection } = useTypesense();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchMetadata, setSearchMetadata] = useState(null);
  const [showScore, setShowScore] = useState(true);
  const [error, setError] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);

  // Clear results when collection changes
  useEffect(() => {
    setSearchResults([]);
    setSearchMetadata(null);
    setSearchQuery("");
  }, [selectedCollection]);

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
          searchFields: "name,category,description,category_l4,category_l3,category_l2,category_l1,manufacturer,brand",
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
    if (!synonyms || synonyms.length === 0) return [];
    const queryLower = query.toLowerCase();
    return synonyms.filter((synonym) => {
      if (synonym.root) {
        return (
          synonym.synonyms.some((s) => s.toLowerCase().includes(queryLower)) ||
          synonym.root.toLowerCase().includes(queryLower)
        );
      } else {
        return synonym.synonyms.some((s) =>
          s.toLowerCase().includes(queryLower)
        );
      }
    });
  };

  // Check if overrides might be affecting the search
  const checkOverrideMatch = (query) => {
    if (!overrides || overrides.length === 0) return [];
    const queryLower = query.toLowerCase();
    return overrides.filter((override) => {
      const ruleQuery = override.rule.query.toLowerCase();
      if (override.rule.match === 'exact') {
        return queryLower === ruleQuery;
      } else if (override.rule.match === 'contains') {
        return queryLower.includes(ruleQuery);
      }
      return false;
    });
  };

  const matchingSynonyms = searchQuery ? checkSynonymMatch(searchQuery) : [];
  const matchingOverrides = searchQuery ? checkOverrideMatch(searchQuery) : [];

  if (!selectedCollection) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow mb-8">
      <div 
        className="p-6 border-b cursor-pointer hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Search size={20} />
            Test Search Preview
          </h2>
          <div className="flex items-center gap-2">
            {searchMetadata && (
              <span className="text-sm text-gray-500">
                {searchMetadata.found} results
              </span>
            )}
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="p-6">
          <div className="flex gap-2 mb-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search products to test synonyms and overrides..."
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

          {/* Match Indicators */}
          {(matchingSynonyms.length > 0 || matchingOverrides.length > 0) && (
            <div className="mb-4 space-y-2">
              {matchingSynonyms.length > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                  <div className="flex items-start gap-2">
                    <Info size={16} className="text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">
                        Synonym matches for "{searchQuery}":
                      </p>
                      <ul className="mt-1 text-sm text-blue-700">
                        {matchingSynonyms.map((syn) => (
                          <li key={syn.id} className="mt-1">
                            {syn.root ? (
                              <>
                                <span className="font-medium">{syn.root}</span>{" "}
                                → {syn.synonyms.join(", ")}
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

              {matchingOverrides.length > 0 && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded">
                  <div className="flex items-start gap-2">
                    <Info size={16} className="text-purple-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-purple-800">
                        Override rules matching "{searchQuery}":
                      </p>
                      <ul className="mt-1 text-sm text-purple-700">
                        {matchingOverrides.map((override) => (
                          <li key={override.id} className="mt-1">
                            <span className="font-medium">{override.rule.query}</span>
                            {override.includes?.length > 0 && (
                              <span> (pins {override.includes.length} items)</span>
                            )}
                            {override.excludes?.length > 0 && (
                              <span> (hides {override.excludes.length} items)</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Search Metadata */}
          {searchMetadata && (
            <div className="mb-4 text-sm text-gray-600">
              Found {searchMetadata.found} results in {searchMetadata.searchTime}ms
              {searchMetadata.originalQuery && (
                <span> for "{searchMetadata.originalQuery}"</span>
              )}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
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
      )}
    </div>
  );
}