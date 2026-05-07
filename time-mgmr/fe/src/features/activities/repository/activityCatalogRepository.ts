import type { IActivity } from '../types';
import {
  idbClearStore,
  idbDelete,
  idbGetAll,
  idbGetById,
  idbPut,
  idbPutMany,
  STORE_ACTIVITY_CATALOG,
} from './indexedDbStore';

export interface IActivityCatalogRepository {
  listAll(): Promise<IActivity[]>;
  getById(id: string): Promise<IActivity | undefined>;
  putMany(activities: IActivity[]): Promise<void>;
  upsert(activity: IActivity): Promise<IActivity>;
  remove(id: string): Promise<void>;
  replaceAll(activities: IActivity[]): Promise<void>;
}

export const activityCatalogRepository: IActivityCatalogRepository = {
  async listAll() {
    const rows = await idbGetAll<IActivity>(STORE_ACTIVITY_CATALOG);
    return rows.sort((a, b) => a.title.localeCompare(b.title));
  },

  async getById(id) {
    return idbGetById<IActivity>(STORE_ACTIVITY_CATALOG, id);
  },

  async putMany(activities) {
    await idbPutMany(STORE_ACTIVITY_CATALOG, activities);
  },

  async upsert(activity) {
    await idbPut(STORE_ACTIVITY_CATALOG, activity);
    return activity;
  },

  async remove(id) {
    await idbDelete(STORE_ACTIVITY_CATALOG, id);
  },

  async replaceAll(activities) {
    await idbClearStore(STORE_ACTIVITY_CATALOG);
    await idbPutMany(STORE_ACTIVITY_CATALOG, activities);
  },
};
