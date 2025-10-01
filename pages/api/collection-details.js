// pages/api/collection-details.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { host, port, protocol, apiKey, collectionName } = req.body;
  
  if (!collectionName) {
    return res.status(400).json({ error: 'Collection name is required' });
  }
  
  try {
    const response = await fetch(
      `${protocol}://${host}:${port}/collections/${collectionName}`,
      {
        headers: {
          'X-TYPESENSE-API-KEY': apiKey
        }
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch collection details');
    }
    
    const collectionDetails = await response.json();
    
    // Return only essential schema information
    const minimalDetails = {
      name: collectionDetails.name,
      num_documents: collectionDetails.num_documents || 0,
      fields: collectionDetails.fields?.map(field => ({
        name: field.name,
        type: field.type,
        facet: field.facet,
        optional: field.optional,
        index: field.index
      })) || [],
      default_sorting_field: collectionDetails.default_sorting_field,
      created_at: collectionDetails.created_at,
      enable_nested_fields: collectionDetails.enable_nested_fields
    };
    
    res.status(200).json(minimalDetails);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}