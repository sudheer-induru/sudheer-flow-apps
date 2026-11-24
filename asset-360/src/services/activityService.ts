import type { CdmInstance, InstanceId, InstanceListClient } from './cdm';
import {
  INSTANCE_PAGE_SIZE,
  cdmView,
  linkedToAssetFilter,
  listAllInstances,
  readString,
  readStringList,
  readTimestamp,
} from './cdm';

export const ACTIVITY_VIEW = 'CogniteActivity';

/** A CogniteActivity linked to the asset; shown as a work order. Timestamps are epoch ms. */
export type WorkOrder = {
  space: string;
  externalId: string;
  name?: string;
  description?: string;
  sourceId?: string;
  tags: string[];
  startTime?: number;
  endTime?: number;
  scheduledStartTime?: number;
  scheduledEndTime?: number;
};

export interface ActivityService {
  getAssetWorkOrders(assetId: InstanceId): Promise<WorkOrder[]>;
}

export type ActivityServiceClient = InstanceListClient;

export class CdmActivityService implements ActivityService {
  constructor(private readonly client: ActivityServiceClient) {}

  async getAssetWorkOrders(assetId: InstanceId): Promise<WorkOrder[]> {
    const instances = await listAllInstances(
      this.client,
      {
        instanceType: 'node',
        sources: [{ source: cdmView(ACTIVITY_VIEW) }],
        filter: linkedToAssetFilter(ACTIVITY_VIEW, assetId),
        limit: INSTANCE_PAGE_SIZE,
      },
      ACTIVITY_VIEW
    );
    return instances.map(toWorkOrder);
  }
}

function toWorkOrder(instance: CdmInstance): WorkOrder {
  const { properties } = instance;
  return {
    space: instance.id.space,
    externalId: instance.id.externalId,
    name: readString(properties, 'name'),
    description: readString(properties, 'description'),
    sourceId: readString(properties, 'sourceId'),
    tags: readStringList(properties, 'tags'),
    startTime: readTimestamp(properties, 'startTime'),
    endTime: readTimestamp(properties, 'endTime'),
    scheduledStartTime: readTimestamp(properties, 'scheduledStartTime'),
    scheduledEndTime: readTimestamp(properties, 'scheduledEndTime'),
  };
}
