import { MongoMemoryServer } from 'mongodb-memory-server';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    mongoUri: string;
  }
}

// One throwaway mongod for the whole run (downloaded once, cached by mongodb-memory-server).
// Set MONGODB_TEST_URI to use an existing server instead, e.g. the docker-compose one.
export default async function setup(project: TestProject) {
  if (process.env.MONGODB_TEST_URI) {
    project.provide('mongoUri', process.env.MONGODB_TEST_URI);
    return;
  }
  const server = await MongoMemoryServer.create();
  project.provide('mongoUri', server.getUri());
  return async () => {
    await server.stop();
  };
}
