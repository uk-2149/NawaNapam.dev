import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import React from "react";

const Private = async ({ children }: { children: React.ReactNode }) => {
  const session = await getServerSession(authOptions);
  if (session) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { phoneNumber: true, gender: true },
    });
    if(!user?.phoneNumber || !user?.gender){
      redirect("/complete-profile");
    }
    return <div>{children}</div>;
  }
  redirect("/signup");
};

export default Private;
