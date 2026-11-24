import { useCogniteSdk } from '@cognite/app-sdk/react';
import { createContext, useContext, useMemo } from 'react';

import type { ActivityService } from './activityService';
import { CdmActivityService } from './activityService';
import type { AssetService } from './assetService';
import { CdmAssetService } from './assetService';
import type { TimeSeriesService } from './timeSeriesService';
import { CdmTimeSeriesService } from './timeSeriesService';

export type Services = {
  assetService: AssetService;
  timeSeriesService: TimeSeriesService;
  activityService: ActivityService;
};

export type ServicesContextType = {
  useServices: () => Services;
};

/** Production wiring: one set of CDM services per authenticated client from `CogniteSdkProvider`. */
function useCdmServices(): Services {
  const client = useCogniteSdk();
  return useMemo(
    () => ({
      assetService: new CdmAssetService(client),
      timeSeriesService: new CdmTimeSeriesService(client),
      activityService: new CdmActivityService(client),
    }),
    [client]
  );
}

export const DEFAULT_SERVICES_CONTEXT: ServicesContextType = { useServices: useCdmServices };

/** The single injection seam for CDF reads (AGENTS.md §3). */
export const ServicesContext = createContext<ServicesContextType>(DEFAULT_SERVICES_CONTEXT);

export function useServices(): Services {
  return useContext(ServicesContext).useServices();
}
