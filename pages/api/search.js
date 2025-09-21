// pages/api/search.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { collection, query, searchFields, config } = req.body;

  if (!config || !config.host || !config.apiKey) {
    return res.status(400).json({ error: 'Missing configuration' });
  }

  const searchUrl = `${config.protocol}://${config.host}:${config.port}/collections/${collection}/documents/search`;
  
  try {
    // Build search parameters
    const searchParams = new URLSearchParams({
      q: query,
      query_by: searchFields || 'name,brand,description',
      per_page: '12',
      page: '1',
      // Include these to help identify synonym matches
      highlight_full_fields: searchFields || 'name,brand,description',
      highlight_affix_num_tokens: '4',
      enable_highlight_v1: 'true'
    });

    const response = await fetch(`${searchUrl}?${searchParams}`, {
      headers: {
        'X-TYPESENSE-API-KEY': config.apiKey
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Search error:', errorText);
      throw new Error(`Search failed: ${errorText}`);
    }

    const data = await response.json();
    
    // Process hits to extract documents and add score
    const results = data.hits?.map(hit => ({
      ...hit.document,
      score: hit.text_match,
      highlights: hit.highlights
    })) || [];

    return res.status(200).json({
      results,
      found: data.found,
      search_time_ms: data.search_time_ms,
      request_params: data.request_params
    });
  } catch (error) {
    console.error('Search API Error:', error);
    return res.status(500).json({ 
      error: error.message,
      details: error.toString()
    });
  }
}