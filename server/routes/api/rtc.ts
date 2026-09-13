import { defineEventHandler } from "h3";
import { handleRtcRequest } from "../../../src/lib/multiplayer/signaling.server";

export default defineEventHandler(async (event) => {
  return handleRtcRequest(event.request);
});
