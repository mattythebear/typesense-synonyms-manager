// pages/api/overrides.js
export default async function handler(req, res) {
  const { collection, id } = req.query;
  
  console.log('Overrides API - Method:', req.method);
  console.log('Overrides API - Query params:', req.query);
  console.log('Overrides API - Collection:', collection);
  
  // Extract config based on method
  let config;
  if (req.method === 'GET') {
    config = {
      host: req.query.host,
      port: req.query.port,
      path: req.query.path,
      protocol: req.query.protocol,
      apiKey: req.query.apiKey
    };
  } else if (req.method === 'DELETE') {
    config = req.body.config || req.body;
  } else {
    config = req.body.config;
  }

  if (!config || !config.host || !config.apiKey) {
    console.error('Missing config:', config);
    return res.status(400).json({ error: 'Missing configuration' });
  }

  if (!collection) {
    console.error('Missing collection name');
    return res.status(400).json({ error: 'Collection name is required' });
  }

  const baseUrl = `${config.protocol}://${config.host}:${config.port}${config.path}/${collection}/overrides`;
  const headers = {
    'X-TYPESENSE-API-KEY': config.apiKey,
    'Content-Type': 'application/json'
  };

  console.log(`${req.method} request to:`, baseUrl);

  try {
    switch (req.method) {
      case 'GET':
        const getResponse = await fetch(baseUrl, { headers });
        if (!getResponse.ok) {
          const errorText = await getResponse.text();
          console.error('GET error:', errorText);
          throw new Error('Failed to fetch overrides');
        }
        const data = await getResponse.json();
        return res.status(200).json(data);

      case 'POST':
        // Create override with Typesense's required structure
        const overrideData = {
          id: req.body.id || `override-${Date.now()}`,
          rule: {
            query: req.body.query,
            match: req.body.match || 'exact'
          }
        };

        // Add optional rule parameters
        if (req.body.filter_by) {
          overrideData.rule.filter_by = req.body.filter_by;
        }

        // Add override actions
        if (req.body.includes) {
          overrideData.includes = req.body.includes.map(doc => ({
            id: doc.id,
            position: doc.position
          }));
        }

        if (req.body.excludes) {
          overrideData.excludes = req.body.excludes.map(doc => ({
            id: doc.id
          }));
        }

        if (req.body.filter_curated_hits !== undefined) {
          overrideData.filter_curated_hits = req.body.filter_curated_hits;
        }

        if (req.body.remove_matched_tokens !== undefined) {
          overrideData.remove_matched_tokens = req.body.remove_matched_tokens;
        }

        if (req.body.stop_processing !== undefined) {
          overrideData.stop_processing = req.body.stop_processing;
        }

        console.log('Creating override:', overrideData);
        
        const postResponse = await fetch(`${baseUrl}/${overrideData.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(overrideData)
        });
        
        if (!postResponse.ok) {
          const errorText = await postResponse.text();
          console.error('POST error:', errorText);
          throw new Error(`Failed to create override: ${errorText}`);
        }
        
        const created = await postResponse.json();
        return res.status(200).json(created);

      case 'PUT':
        const updateData = {
          id: id,
          rule: {
            query: req.body.query,
            match: req.body.match || 'exact'
          }
        };

        if (req.body.filter_by) {
          updateData.rule.filter_by = req.body.filter_by;
        }

        if (req.body.includes) {
          updateData.includes = req.body.includes.map(doc => ({
            id: doc.id,
            position: doc.position
          }));
        }

        if (req.body.excludes) {
          updateData.excludes = req.body.excludes.map(doc => ({
            id: doc.id
          }));
        }

        if (req.body.filter_curated_hits !== undefined) {
          updateData.filter_curated_hits = req.body.filter_curated_hits;
        }

        if (req.body.remove_matched_tokens !== undefined) {
          updateData.remove_matched_tokens = req.body.remove_matched_tokens;
        }

        if (req.body.stop_processing !== undefined) {
          updateData.stop_processing = req.body.stop_processing;
        }

        console.log('Updating override:', updateData);
        
        const putResponse = await fetch(`${baseUrl}/${id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(updateData)
        });
        
        if (!putResponse.ok) {
          const errorText = await putResponse.text();
          console.error('PUT error:', errorText);
          throw new Error(`Failed to update override: ${errorText}`);
        }
        
        const updated = await putResponse.json();
        return res.status(200).json(updated);

      case 'DELETE':
        console.log('Deleting override with ID:', id);
        
        const deleteResponse = await fetch(`${baseUrl}/${id}`, {
          method: 'DELETE',
          headers: {
            'X-TYPESENSE-API-KEY': config.apiKey
          }
        });
        
        if (!deleteResponse.ok) {
          const errorText = await deleteResponse.text();
          console.error('DELETE error:', errorText);
          throw new Error(`Failed to delete override: ${errorText}`);
        }
        
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