// pages/api/synonyms.js
export default async function handler(req, res) {
  const { collection, id } = req.query;
  
  // Extract config differently based on method
  let config;
  
  if (req.method === 'GET') {
    // GET: config comes from query params
    config = {
      host: req.query.host,
      port: req.query.port,
      path: req.query.path,
      protocol: req.query.protocol,
      apiKey: req.query.apiKey
    };
  } else if (req.method === 'DELETE') {
    // DELETE: config should be in body
    config = req.body;
  } else {
    // POST/PUT: config is nested in body
    config = req.body.config;
  }

  if (!config || !config.host || !config.apiKey) {
    console.error('Missing config:', config);
    return res.status(400).json({ error: 'Missing configuration' });
  }

  const baseUrl = `${config.protocol}://${config.host}:${config.port}${config.path}/${collection}/synonyms`;
  const headers = {
    'X-TYPESENSE-API-KEY': config.apiKey,
    'Content-Type': 'application/json'
  };

  console.log(`${req.method} request to:`, baseUrl);
  console.log('Config:', config);

  try {
    switch (req.method) {
      case 'GET':
        const getResponse = await fetch(baseUrl, { headers });
        if (!getResponse.ok) {
          const errorText = await getResponse.text();
          console.error('GET error:', errorText);
          throw new Error('Failed to fetch synonyms');
        }
        const data = await getResponse.json();
        return res.status(200).json(data);

      case 'POST':
        // Create unique ID for new synonym
        const synonymId = `synonym-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Build synonym object based on type
        let synonymData = {
          id: synonymId,
          synonyms: req.body.synonyms
        };
        
        // Add root only if it's a one-way synonym
        if (req.body.root) {
          synonymData.root = req.body.root;
        }
        
        console.log('Creating synonym:', synonymData);
        console.log('URL:', `${baseUrl}/${synonymId}`);
        
        // Typesense requires PUT to a specific ID endpoint for creation
        const postResponse = await fetch(`${baseUrl}/${synonymId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(synonymData)
        });
        
        if (!postResponse.ok) {
          const errorText = await postResponse.text();
          console.error('POST error:', errorText);
          throw new Error(`Failed to create synonym: ${errorText}`);
        }
        
        const created = await postResponse.json();
        return res.status(200).json(created);

      case 'PUT':
        // Build update data
        let updateData = {
          id: id,
          synonyms: req.body.synonyms
        };
        
        if (req.body.root) {
          updateData.root = req.body.root;
        }
        
        console.log('Updating synonym:', updateData);
        
        const putResponse = await fetch(`${baseUrl}/${id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(updateData)
        });
        
        if (!putResponse.ok) {
          const errorText = await putResponse.text();
          console.error('PUT error:', errorText);
          throw new Error(`Failed to update synonym: ${errorText}`);
        }
        
        const updated = await putResponse.json();
        return res.status(200).json(updated);

      case 'DELETE':
        console.log('Deleting synonym with ID:', id);
        console.log('Full DELETE URL:', `${baseUrl}/${id}`);
        
        const deleteResponse = await fetch(`${baseUrl}/${id}`, {
          method: 'DELETE',
          headers: {
            'X-TYPESENSE-API-KEY': config.apiKey
            // Note: No Content-Type needed for DELETE
          }
        });
        
        if (!deleteResponse.ok) {
          const errorText = await deleteResponse.text();
          console.error('DELETE error:', errorText);
          console.error('Status:', deleteResponse.status);
          throw new Error(`Failed to delete synonym: ${errorText}`);
        }
        
        // Typesense returns the deleted synonym object
        const deleteResult = await deleteResponse.json();
        console.log('Delete successful:', deleteResult);
        return res.status(200).json({ success: true, deleted: deleteResult });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: error.message,
      details: error.toString()
    });
  }
}