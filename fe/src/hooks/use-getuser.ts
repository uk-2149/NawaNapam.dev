import { prisma } from "@/lib/prisma";
import { useSession } from "next-auth/react";
import * as React from "react";

export function useGetUser() {
  const { data: session, status } = useSession();
  
  // Return the full user object directly from session
  // This ensures we get all fields including username
  const user = React.useMemo(() => {
    if (status === "authenticated" && session?.user) {
      return {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
        username: session.user.username,
        phoneNumber: session.user.phoneNumber,
        gender: session.user.gender,  
      };
    }
    return null;
  }, [session, status]);

  return user;
}
