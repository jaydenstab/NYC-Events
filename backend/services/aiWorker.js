const { parentPort } = require('worker_threads');
const { pipeline } = require('@xenova/transformers');
const chrono = require('chrono-node');

let pipelines = {};

async function init() {
    pipelines.embed = await pipeline('feature-extraction', 'Xenova/bge-small-en-v1.5');
    pipelines.classify = await pipeline('zero-shot-classification', 'Xenova/distilbert-base-uncased-mnli');
    pipelines.ner = await pipeline('token-classification', 'Xenova/bert-base-NER');
}

function extractTimeRegex(text) {
    const pattern = /\d{1,2}(?::\d{2})?\s*(?:AM|PM|a\.m\.|p\.m\.)/i;
    const match = text.match(pattern);
    return match ? match[0].toUpperCase() : 'TBD';
}

function extractDateRegex(text) {
    const monthPattern = /(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}/i;
    const monthMatch = text.match(monthPattern);
    if (monthMatch) {
      const year = new Date().getFullYear();
      const parsed = new Date(`${monthMatch[0]}, ${year}`);
      if (!isNaN(parsed.getTime())) {
          // If the date has already passed in the current year, assume next year
          if (parsed < new Date().setHours(0,0,0,0)) {
              parsed.setFullYear(year + 1);
          }
          return parsed.toISOString().split('T')[0];
      }
    }
    return 'TBD';
}

parentPort.on('message', async (task) => {
    const { id, type, payload } = task;
    try {
        if (Object.keys(pipelines).length === 0) await init();

        let result;
        switch (type) {
            case 'EMBED':
                const out = await pipelines.embed(payload.text, { pooling: 'mean', normalize: true });
                result = Array.from(out.data);
                break;
            case 'CLASSIFY':
                result = await pipelines.classify(payload.text, payload.labels, { multi_label: false });
                break;
            case 'EXTRACT_ALL':
                const [cRes, nRes] = await Promise.all([
                    pipelines.classify(payload.text, payload.categories),
                    pipelines.ner(payload.text)
                ]);
                
                const locations = [];
                for (const ent of nRes) {
                    if (ent.entity.includes('LOC')) {
                        const word = ent.word.replace('##', '');
                        if (word.length > 2 && !['NYC', 'The', 'New'].includes(word)) {
                            locations.push(word);
                        }
                    }
                }

                // Reference date for chrono
                const referenceDate = new Date();
                const chronoRes = chrono.parse(payload.text, referenceDate);
                let date = 'TBD', time = 'TBD';
                
                if (chronoRes.length > 0) {
                    const d = chronoRes[0].start.date();
                    date = d.toISOString().split('T')[0];
                    if (chronoRes[0].start.isCertain('hour')) {
                        time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                    }
                }
                
                if (date === 'TBD') date = extractDateRegex(payload.text);
                if (time === 'TBD') time = extractTimeRegex(payload.text);

                // Heuristic location fallback
                let address = locations[0] || 'New York, NY';
                if (address === 'New York, NY') {
                    const atMatch = payload.text.match(/at\s+([^,.]+)/i) || payload.text.match(/@\s+([^,.]+)/i);
                    if (atMatch && atMatch[1].length > 3) address = atMatch[1].trim();
                }

                let eventName = '';
                const personOrgs = nRes.filter((ent) =>
                  ent.entity.includes('PER') || ent.entity.includes('ORG')
                );
                if (personOrgs.length > 0) {
                  eventName = personOrgs
                    .map((e) => e.word.replace('##', ''))
                    .join(' ')
                    .trim();
                }
                if (!eventName || eventName.length < 3) {
                  const firstLine = payload.text.split('\n')[0].trim();
                  eventName = firstLine.length > 5 ? firstLine.substring(0, 100) : '';
                }

                result = {
                    eventName,
                    category: cRes.labels[0],
                    address,
                    date,
                    startTime: time
                };
                break;
        }
        parentPort.postMessage({ id, status: 'success', result });
    } catch (err) {
        parentPort.postMessage({ id, status: 'error', error: err.message });
    }
});
