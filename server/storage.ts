// Storage interface for currency rate application
// Currently using external API at localhost:5050, so no local storage needed

// biome-ignore lint/complexity/noBannedTypes: Using empty storage type for now
export type IStorage = {};

export class MemStorage implements IStorage {}

export const storage = new MemStorage();
