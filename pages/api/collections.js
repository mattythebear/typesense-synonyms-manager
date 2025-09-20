export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { host, port, protocol, apiKey } = req.body;
  
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
    res.status(200).json(collections);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}