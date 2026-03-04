import db from './db';
import api from './api';

export const queueTransaction = async (type: 'sale' | 'credit', payload: any) => {
    await db.syncQueue.add({
        type,
        payload,
        createdAt: Date.now(),
        status: 'pending'
    });
    console.log(`[Offline Sync] Queued offline ${type}`);
};

export const processQueue = async () => {
    if (!navigator.onLine) return; // Do nothing if still offline

    const pendingItems = await db.syncQueue.where('status').equals('pending').toArray();
    if (pendingItems.length === 0) return;

    console.log(`[Offline Sync] Processing ${pendingItems.length} queued items...`);

    for (const item of pendingItems) {
        try {
            if (item.type === 'sale') {
                await api.post('/sales', item.payload);
            } else if (item.type === 'credit') {
                await api.post('/credits', item.payload);
            }

            // On success, remove from IndexedDB
            await db.syncQueue.delete(item.id!);
            console.log(`[Offline Sync] Successfully synced item ${item.id}`);
        } catch (err: any) {
            console.error(`[Offline Sync] Failed to sync item ${item.id}`, err);
            // We don't change status to failed if it's purely a network error,
            // so it will retry next time. If it's a 4xx error (e.g. invalid data),
            // we might want to flag it so it stops blocking the queue.
            if (err.response && err.response.status >= 400 && err.response.status < 500) {
                await db.syncQueue.update(item.id!, { status: 'failed' });
            }
        }
    }
};

// Listen for network becoming available to auto-drain the queue
window.addEventListener('online', () => {
    console.log('[Offline Sync] Network connection restored. Processing queue...');
    processQueue();
});
