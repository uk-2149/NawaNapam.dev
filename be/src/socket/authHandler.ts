import { Socket } from "socket.io";
import { redis } from "../utils/redis/redisClient";

export async function handleAuth(socket: Socket, payload: any) {
  const { userId, username, gender } = payload || {};
  if (!userId) {
    socket.emit("auth:error", "userId required");
    return;
  }

  socket.data.userId = userId;
  socket.data.username = username ?? "";
  socket.data.gender = gender ?? ""; // Store user's actual gender

  const now = Date.now();

  await redis.hset(`user:${userId}`, {
    status: "available",
    socketId: socket.id,
    lastSeen: String(now),
    username: username ?? "",
    gender: gender ?? "", // Persist gender in Redis
    currentRoom: ""
  });

  
  // presence TTL
  await redis.expire(`user:${userId}`, 30);

  socket.emit("auth:ok");
  console.log(`[auth] User ${userId} authenticated with gender: ${gender}`);
}