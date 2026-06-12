const { pipeline } = require('@xenova/transformers');

async function download() {
  console.log('📥 Pre-downloading AI models for Docker image...');
  
  // Embedding model (from vectorService)
  await pipeline('feature-extraction', 'Xenova/bge-small-en-v1.5');
  
  // Classification model (from nerService)
  await pipeline('zero-shot-classification', 'Xenova/distilbert-base-uncased-mnli');
  
  // NER model (from nerService)
  await pipeline('token-classification', 'Xenova/bert-base-NER');
  
  console.log('✅ Models downloaded successfully.');
}

download().catch(err => {
  console.error('❌ Download failed:', err);
  process.exit(1);
});
