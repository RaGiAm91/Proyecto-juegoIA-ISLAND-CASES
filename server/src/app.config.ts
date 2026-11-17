import { PROTOCOL_VERSION, ROOM_NAME } from "@island-cases/shared";
import { defineRoom, defineServer } from "colyseus";
import cors from "cors";
import express from "express";
import helmet from "helmet";

import { MatchRoom } from "./rooms/MatchRoom.js";

export const server = defineServer({
  rooms: {
    [ROOM_NAME]: defineRoom(MatchRoom),
  },
  express: (app) => {
    app.use(cors({ origin: true, credentials: true }));
    app.use(
      helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
      }),
    );
    app.use(express.json({ limit: "32kb" }));

    app.get("/health", (_request, response) => {
      response.json({
        ok: true,
        service: "island-cases-server",
        protocol: PROTOCOL_VERSION,
      });
    });
  },
});

export default server;
