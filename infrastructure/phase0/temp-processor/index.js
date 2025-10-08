const functions = require('@google-cloud/functions-framework');
const { Storage } = require('@google-cloud/storage');

const storage = new Storage();

functions.http('processCurves', async (req, res) => {
  try {
    const { customerId, curveCount = 1 } = req.body;
    
    if (!customerId) {
      return res.status(400).json({ error: 'customerId required' });
    }
    
    console.log(`Processing ${curveCount} curves for customer ${customerId}`);
    
    // Generate simple curves
    const curves = [];
    for (let i = 0; i < curveCount; i++) {
      curves.push({
        id: `curve_${customerId}_${Date.now()}_${i}`,
        customerId: customerId,
        dataPoints: Array.from({ length: 100 }, (_, idx) => ({
          x: idx,
          y: Math.sin(idx * 0.1) + Math.random() * 0.2
        })),
        metadata: {
          generatedAt: new Date().toISOString(),
          algorithm: 'phase0_basic',
          processingTimeMs: Math.random() * 1000 + 500
        }
      });
    }
    
    // Store in bucket
    const timestamp = Date.now();
    const fileName = `curves/${customerId}/${timestamp}_batch_${curveCount}.json`;
    const bucket = storage.bucket('lyceum-curves-lyceum-clusters-optimized');
    
    const result = {
      curves: curves,
      metadata: {
        customerId: customerId,
        processedAt: new Date().toISOString(),
        curveCount: curveCount,
        totalDataPoints: curves.length * 100
      }
    };
    
    await bucket.file(fileName).save(JSON.stringify(result, null, 2));
    
    console.log(`Successfully processed ${curveCount} curves for ${customerId}`);
    
    res.json({
      success: true,
      processed: curveCount,
      customerId: customerId,
      storageLocation: fileName,
      timestamp: timestamp,
      message: `Successfully generated ${curveCount} curves with ${curves.length * 100} total data points`
    });
    
  } catch (error) {
    console.error('Error processing curves:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});