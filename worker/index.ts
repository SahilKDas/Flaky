import handler from "vinext/server/app-router-entry";

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const worker = {
  fetch(request: Request, env: Record<string, unknown>, ctx: ExecutionContext) {
    return handler.fetch(request, env, ctx);
  },
};

export default worker;
