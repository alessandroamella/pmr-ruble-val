// Storage interface for currency rate application
// Currently using external API at localhost:5050, so no local storage needed

export interface IStorage {
  // Add storage methods here if needed for caching or persistence
}

export class MemStorage implements IStorage {
  constructor() {
    // Initialize storage if needed
  }
}

export const storage = new MemStorage();
