export type PhotoFlowContext = {
  allocationId: string;
  serviceId: string;
  incidentId: string;
  serviceStatuscode: number;
  /** Phase numbers from the synced service definition; empty until the definition is ready. */
  phaseNumbers?: readonly number[];
};

export type PhotoCaptureMode = 'mandatory' | 'extra';
