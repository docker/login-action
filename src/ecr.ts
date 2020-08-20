export const isECR = async (registry: string): Promise<boolean> => {
  return registry.includes('amazonaws');
};

export const getRegion = async (registry: string): Promise<string> => {
  return registry.substring(registry.indexOf('ecr.') + 4, registry.indexOf('.amazonaws'));
};
