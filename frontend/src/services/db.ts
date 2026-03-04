import Dexie, { type EntityTable } from 'dexie';

export interface SyncItem {
    id?: number;
    type: 'sale' | 'credit';
    payload: any;
    createdAt: number;
    status: 'pending' | 'failed';
}

const db = new Dexie('ShopTrackDB') as Dexie & {
    syncQueue: EntityTable<SyncItem, 'id'>;
};

// Declare schema
db.version(1).stores({
    syncQueue: '++id, type, status, createdAt'
});

export default db;
