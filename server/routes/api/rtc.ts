import { defineEventHandler, getRequestURL } from "h3";
import { handleRtcRequest } from "../../../src/lib/multiplayer/signaling.server";

export default defineEventHandler(async (event) => {
  const method = event.req.method;
  const body =
    method === "GET" || method === "HEAD" ? undefined : await event.req.arrayBuffer();
  return handleRtcRequest(
    new Request(getRequestURL(event), {
      method,
      headers: event.req.headers,
      body,
    }),
  );
});
