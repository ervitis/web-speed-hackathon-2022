import "regenerator-runtime/runtime";
import fastify from "fastify";
import fastifySensible from "fastify-sensible";

import { User } from "../model/index.js";

import { apiRoute } from "./routes/api.js";
import { spaRoute } from "./routes/spa.js";
import { createConnection } from "./typeorm/connection.js";
import { initialize } from "./typeorm/initialize.js";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

const server = fastify({
  logger: IS_PRODUCTION
    ? false
    : {
        prettyPrint: {
          ignore: "pid,hostname",
          translateTime: "SYS:HH:MM:ss",
        },
      },
});
server.register(fastifySensible);

let conn;

server.addHook("onReady", async () => {
    conn = await createConnection()
});

server.addHook("onRequest", async (req, res) => {
  const repo = conn.getRepository(User);

  const userId = req.headers["x-app-userid"];
  if (userId !== undefined) {
    const user = await repo.findOne(userId);
    if (user === undefined) {
      res.unauthorized();
      return;
    }
    req.user = user;
  }
});

server.addHook("onRequest", async (req, res) => {
    res.header("Cache-Control", "max-age=604800");
    res.header("Connection", "keep-alive");
});

server.register(apiRoute, { prefix: "/api" });
server.register(spaRoute);

const start = async () => {
  try {
    await initialize();
    await server.listen(process.env.PORT || 3000, "0.0.0.0");
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};
start();
