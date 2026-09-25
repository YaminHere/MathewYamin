import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: {},
        password: {},
      },

      async authorize(credentials) {
        if (
          credentials?.username ===
            process.env.ADMIN_USERNAME &&
          credentials?.password ===
            process.env.ADMIN_PASSWORD
        ) {
          return {
            id: "admin",
            name: "Admin",
          };
        }

        return null;
      },
    }),
  ],

  pages: {
    signIn: "/login",
  },

  session: {
    strategy: "jwt",
  },
});
