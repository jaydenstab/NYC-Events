const { Worker } = require('worker_threads');
const path = require('path');
const { randomUUID } = require('crypto');
const { logger } = require('../logger');
const metrics = require('./metrics');

const MAX_QUEUE_SIZE = parseInt(process.env.AI_MAX_QUEUE_SIZE, 10) || 500;

class AiOrchestrator {
    constructor() {
        const requestedPoolSize = parseInt(process.env.AI_WORKER_POOL_SIZE, 10);
        this.poolSize = !isNaN(requestedPoolSize) ? requestedPoolSize : 1;
        
        this.workers = [];
        this.pendingTasks = new Map();
        this.taskQueue = [];
        this.isInitialized = false;
        this.isTerminated = false;
        
        logger.info('ai_orchestrator_instance_created', { poolSize: this.poolSize });
    }

    initPool() {
        if (this.isInitialized || this.isTerminated) return;
        logger.info('ai_orchestrator_init', { poolSize: this.poolSize });
        for (let i = 0; i < this.poolSize; i++) {
            this.spawnWorker(i);
        }
        this.isInitialized = true;
    }

    spawnWorker(index) {
        if (this.isTerminated) return;
        
        const workerPath = path.join(__dirname, 'aiWorker.js');
        const worker = new Worker(workerPath);
        const workerObj = { id: index, worker, busy: false };

        worker.on('message', (response) => {
            const { id, status, result, error } = response;
            const task = this.pendingTasks.get(id);
            
            if (task) {
                if (status === 'success') task.resolve(result);
                else task.reject(new Error(error));
                this.pendingTasks.delete(id);
            }

            workerObj.busy = false;
            metrics.setAiQueueDepth(this.taskQueue.length);
            this.processNextTask();
        });

        worker.on('error', (err) => {
            logger.error('ai_worker_error', { workerId: index, message: err.message });
            this.handleWorkerExit(index);
        });

        worker.on('exit', (code) => {
            if (code !== 0 && !this.isTerminated) {
                logger.warn('ai_worker_exit_unexpected', { workerId: index, code });
                this.handleWorkerExit(index);
            }
        });

        this.workers[index] = workerObj;
    }

    handleWorkerExit(index) {
        if (this.isTerminated) return;

        for (const [id, task] of this.pendingTasks) {
            task.reject(new Error(`AI worker ${index} crashed`));
            this.pendingTasks.delete(id);
        }

        setTimeout(() => {
            if (!this.isTerminated) {
                logger.info('ai_worker_respawn', { workerId: index });
                this.spawnWorker(index);
            }
        }, 2000);
    }

    async _sendTask(type, payload) {
        if (!this.isInitialized) this.initPool();
        if (this.isTerminated) return Promise.reject(new Error('Orchestrator terminated'));

        if (this.taskQueue.length >= MAX_QUEUE_SIZE) {
            metrics.setAiQueueDepth(this.taskQueue.length);
            const err = new Error(`AI task queue full (max ${MAX_QUEUE_SIZE})`);
            err.code = 'AI_QUEUE_FULL';
            return Promise.reject(err);
        }

        const id = randomUUID();
        return new Promise((resolve, reject) => {
            this.taskQueue.push({ id, type, payload, resolve, reject });
            metrics.setAiQueueDepth(this.taskQueue.length);
            this.processNextTask();
        });
    }

    processNextTask() {
        if (this.taskQueue.length === 0 || this.isTerminated) return;

        const availableWorker = this.workers.find(w => w && !w.busy);
        if (!availableWorker) return;

        const task = this.taskQueue.shift();
        availableWorker.busy = true;
        this.pendingTasks.set(task.id, { resolve: task.resolve, reject: task.reject });
        
        availableWorker.worker.postMessage({
            id: task.id,
            type: task.type,
            payload: task.payload
        });
    }

    async terminate() {
        this.isTerminated = true;
        logger.info('ai_orchestrator_terminate');
        for (const w of this.workers) {
            if (w && w.worker) await w.worker.terminate();
        }
        this.workers = [];
        this.isInitialized = false;
    }

    embed(text) { return this._sendTask('EMBED', { text }); }
    classify(text, labels) { return this._sendTask('CLASSIFY', { text, labels }); }
    extractAll(text, categories) { return this._sendTask('EXTRACT_ALL', { text, categories }); }
}

module.exports = new AiOrchestrator();
