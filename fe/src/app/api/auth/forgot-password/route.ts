import { sendOtpEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    // Basic validation
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    // Check existing user
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (!existingUser) {
      return NextResponse.json(
        { error: "No user found with this email", existingUser },
        { status: 404 }
      );
    }

    // generate and send OTP logic would go here
    // generate 6 digit OTP
    const res = await sendOtpEmail(email);

    // console.log(res);

    const otpkey = `reset-pass-otp-${email}`;

    const otp = String(res.otp);

    // store temporary otp in database with expiration time of 5 minutes

    await redis.set(otpkey!, otp, { ex: 300 });

    return NextResponse.json(
      {
        message: "Password reset OTP sent successfully",
        res,
        otp: await redis.get(otpkey!),
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error,
      },
      { status: 500 }
    );
  }
}
