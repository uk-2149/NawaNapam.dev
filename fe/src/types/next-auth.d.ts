import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username?: string;
      phoneNumber?: string;
      gender?: "MALE" | "FEMALE" | "OTHER";
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
    username?: string;
    phoneNumber?: string;
    gender?: "MALE" | "FEMALE" | "OTHER";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username?: string;
    phoneNumber?: string;
    gender?: "MALE" | "FEMALE" | "OTHER";
  }
}
