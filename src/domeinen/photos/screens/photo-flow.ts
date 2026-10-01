export type PhotoFlowContext = {
  allocationId: string;
  serviceId: string;
  incidentId: string;
  serviceStatuscode: number;
};

export type PhotoCaptureMode = 'mandatory' | 'extra';
