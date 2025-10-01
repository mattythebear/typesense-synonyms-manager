export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { host, port, protocol, apiKey, minimal = true } = req.body;
  
  try {
    const response = await fetch(`${protocol}://${host}:${port}/collections`, {
      headers: {
        'X-TYPESENSE-API-KEY': apiKey
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch collections');
    }
    
    const collections = await response.json();
    
    // Return minimal data by default to avoid size limits
    if (minimal) {
      const minimalCollections = collections.map(col => ({
        name: col.name,
        num_documents: col.num_documents || 0,
        // Only include essential fields
        created_at: col.created_at,
        num_memory_shards: col.num_memory_shards
      }));
      res.status(200).json(minimalCollections);
    } else {
      // Full data - use with caution for large collections
      res.status(200).json(collections);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}