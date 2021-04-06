import { rest } from "msw";
import { setupServer } from "msw/node";

export = function newMswMock(handlers = {}) {
  Object.values(handlers).forEach((x) => {
    Object.entries(x).forEach(([k, v]) => {
      x[k] = Object.assign(jest.fn((...args: any[]) => (typeof v === "function" ? v(...args) : v)), v);
    });
  });

  const self = jest.fn();
  return Object.assign(self, {
    handlers,
    setupServer() {
      return setupServer(
        ...Object.entries(this.handlers)
          .map(([method, mocks]) =>
            Object.entries(mocks).map(([k, v]) =>
              rest[method](k, (req, res, ctx) => {
                self();
                let status = 200;
                let out;
                try {
                  out = v(typeof req.body === "string" && req.body !== "" ? JSON.parse(req.body) : req.body);
                } catch (e) {
                  if (typeof e !== "number") throw e;
                  status = e;
                  out = {};
                }
                return res(ctx.status(status), ctx.json(out));
              })
            )
          )
          .reduce((a, x) => a.concat(x), [])
      );
    },
    startServer() {
      this.setupServer().listen({
        onUnhandledRequest(req) {
          throw new Error(`Unhandled ${req.method} request to ${req.url.href}`);
        },
      });
      return this;
    },
    clear() {
      this.mockClear();
      Object.values(this.handlers).forEach((x) => Object.values(x).forEach((y) => y.mockClear()));
    },
  });
};
