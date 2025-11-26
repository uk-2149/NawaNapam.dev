import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, username, phoneNumber, gender } = body;

    // Basic validation
    if (!email || !password || !username || !phoneNumber || !gender) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check existing user
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }, { phoneNumber }],
      },
    });

    if (existingUser) {
      const field = existingUser.email === email
        ? "Email"
        : existingUser.username === username
        ? "Username"
        : "Phone number";

      return NextResponse.json(
        { error: `${field} already exists` },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const createdUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        username,
        name: username,
        isAnonymous: false,
        phoneNumber,
        gender,
      },
      select: {
        id: true,
        email: true,
        username: true,
        phoneNumber: true,
        gender: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      { message: "User created successfully", user: createdUser },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
