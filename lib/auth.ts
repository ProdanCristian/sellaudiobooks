import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "email,public_profile"
        }
      }
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        });

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/login",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (account && user) {
        const dbUser = await prisma.user.findUnique({
          where: {
            email: user.email!,
          },
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.name = dbUser.name;
          token.picture = dbUser.image;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string || session.user.name;
        session.user.image = token.picture as string || session.user.image;
      }
      
      return session;
    },
    async signIn({ account, profile }) {
      try {
        if (account?.provider === "google" || account?.provider === "facebook") {
          if (profile?.email) {
            const profileData = profile as Record<string, unknown>;
            const imageUrl = (profileData?.picture || profileData?.image) as string | null;
            
            const existingUser = await prisma.user.findUnique({
              where: { email: profile.email }
            });
            
            if (!existingUser) {
              await prisma.user.create({
                data: {
                  email: profile.email,
                  name: profile.name || '',
                  image: imageUrl
                }
              });
            } else {
              if (imageUrl && existingUser.image !== imageUrl) {
                await prisma.user.update({
                  where: { email: profile.email },
                  data: {
                    image: imageUrl,
                    name: profile.name || existingUser.name
                  }
                });
              }
            }
          }
        }
        return true;
      } catch (error) {
        console.error("SignIn callback error:", error);
        return true;
      }
    },
    async redirect({ baseUrl }) {
      return baseUrl + '/dashboard';
    },
  },
}; 