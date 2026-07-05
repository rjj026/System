import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { jsonStore } from "../data/jsonStore.js";
import { signToken } from "../middleware/auth.js";
import { User } from "../types/index.js";

const USERS = "users";

export async function register(req: Request, res: Response) {
  const { email, password, name } = req.body ?? {};

  if (!email || !password || !name) {
    return res.status(400).json({ error: "email, password, and name are required" });
  }

  const existing = jsonStore.findOne<User>(USERS, (u) => u.email.toLowerCase() === String(email).toLowerCase());
  if (existing) {
    return res.status(409).json({ error: "An account with this email already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user: User = {
    id: uuidv4(),
    email,
    passwordHash,
    name,
    createdAt: new Date().toISOString(),
  };
  jsonStore.insert(USERS, user);

  const token = signToken({ userId: user.id, email: user.email });
  return res.status(201).json({
    token,
    user: { id: user.id, email: user.email, name: user.name },
  });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const user = jsonStore.findOne<User>(USERS, (u) => u.email.toLowerCase() === String(email).toLowerCase());
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = signToken({ userId: user.id, email: user.email });
  return res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name },
  });
}

export function me(req: Request & { user?: { userId: string; email: string } }, res: Response) {
  const users = jsonStore.getAll<User>(USERS);
  const user = users.find((u) => u.id === req.user?.userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json({ id: user.id, email: user.email, name: user.name });
}
