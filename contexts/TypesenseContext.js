// contexts/TypesenseContext.js
import { createContext, useContext, useState, useEffect } from 'react';

const TypesenseContext = createContext({});

export function useTypesense() {
  return useContext(TypesenseContext);
}

export function TypesenseProvider({ children }) {
  const [config, setConfig] = useState({
    host: "",
    port: "8108",
    protocol: "http",
    apiKey: "",
  });
  
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [destServer, setDestServer] = useState("staging");

  // Helper function to refetch collections
  const refetchCollections = async (configToUse) => {
    try {
      const response = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...configToUse,
          minimal: true  // Request minimal data to avoid size limits
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setCollections(data);
      }
    } catch (err) {
      console.warn('Could not refetch collections:', err);
    }
  };

  // Load saved state from localStorage on mount
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem('typesense-config');
      const savedCollection = localStorage.getItem('typesense-selected-collection');
      const savedCollections = localStorage.getItem('typesense-collections');
      const savedIsConnected = localStorage.getItem('typesense-is-connected');
      
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig);
        setConfig(parsedConfig);
        setDestServer(parsedConfig.protocol === 'https' ? 'production' : 'staging');
      }
      if (savedCollection) {
        setSelectedCollection(savedCollection);
      }
      if (savedCollections) {
        setCollections(JSON.parse(savedCollections));
      }
      if (savedIsConnected === 'true' && savedConfig) {
        // Re-fetch collections if we were connected
        const parsedConfig = JSON.parse(savedConfig);
        if (parsedConfig.apiKey) {
          setIsConnected(true);
          // Optionally refetch full collections data
          refetchCollections(parsedConfig);
        }
      }
    } catch (e) {
      console.warn('Error loading saved state:', e);
      // Clear corrupted localStorage data
      localStorage.removeItem('typesense-collections');
    }
  }, []);

  // Save state to localStorage when it changes
  useEffect(() => {
    if (config.apiKey) {
      localStorage.setItem('typesense-config', JSON.stringify(config));
    }
  }, [config]);

  useEffect(() => {
    localStorage.setItem('typesense-selected-collection', selectedCollection);
  }, [selectedCollection]);

  useEffect(() => {
    // Only store essential collection info to avoid quota issues
    try {
      const essentialCollections = collections.map(col => ({
        name: col.name,
        num_documents: col.num_documents
      }));
      localStorage.setItem('typesense-collections', JSON.stringify(essentialCollections));
    } catch (e) {
      console.warn('Could not save collections to localStorage:', e);
      // If still too large, don't save collections - they'll be refetched on reconnect
    }
  }, [collections]);

  useEffect(() => {
    localStorage.setItem('typesense-is-connected', isConnected.toString());
  }, [isConnected]);

  const connectToTypesense = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...config,
          minimal: true  // Request minimal data to avoid size limits
        }),
      });

      if (!response.ok) throw new Error("Failed to connect to Typesense");

      const data = await response.json();
      setCollections(data);
      setIsConnected(true);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateDestServer = (server) => {
    setDestServer(server);
    setConfig(
      server === "production"
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
  };

  // Fetch detailed information for a specific collection
  const fetchCollectionDetails = async (collectionName) => {
    if (!collectionName || !config.apiKey) return null;
    
    try {
      const response = await fetch("/api/collection-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...config,
          collectionName
        }),
      });
      
      if (!response.ok) throw new Error("Failed to fetch collection details");
      
      const details = await response.json();
      return details;
    } catch (err) {
      console.error('Could not fetch collection details:', err);
      return null;
    }
  };

  const disconnect = () => {
    setIsConnected(false);
    setSelectedCollection("");
    setCollections([]);
    setConfig({
      host: "",
      port: "8108",
      protocol: "http",
      apiKey: "",
    });
    localStorage.removeItem('typesense-config');
    localStorage.removeItem('typesense-selected-collection');
    localStorage.removeItem('typesense-collections');
    localStorage.removeItem('typesense-is-connected');
  };

  return (
    <TypesenseContext.Provider value={{
      config,
      setConfig,
      collections,
      setCollections,
      selectedCollection,
      setSelectedCollection,
      isConnected,
      setIsConnected,
      loading,
      setLoading,
      error,
      setError,
      destServer,
      setDestServer,
      updateDestServer,
      connectToTypesense,
      disconnect,
      fetchCollectionDetails
    }}>
      {children}
    </TypesenseContext.Provider>
  );
}