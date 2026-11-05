import { User as NextAuthUser, Session, DefaultSession, Account } from "next-auth";
import { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import KakaoProvider from "next-auth/providers/kakao";
import dbConnect from "@/lib/mongodb";
import mongoose from "mongoose";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      role?: string;
    } & DefaultSession["user"];
  }
}

interface NewUserData {
  name?: string | null;
  image?: string | null;
  providerAccountId: string;
  lastLoginAt: Date;
  email?: string | null;
}

const UserSchema = new mongoose.Schema({
  email: { type: String, sparse: true },
  name: { type: String },
  image: { type: String },
  role: { type: String, default: "user" },
  providerAccountId: { type: String, required: true, unique: true },
  lastLoginAt: { type: Date, default: Date.now },
});
export const User = mongoose.models.User || mongoose.model("User", UserSchema);

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID || "",
      clientSecret: process.env.KAKAO_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async signIn({ user, account }: { user: NextAuthUser; account: Account | null }) {
      try {
        await dbConnect();
        const providerAccountId = account?.providerAccountId || user.id;
        if (!providerAccountId) return true;

        let dbUser = await User.findOne({ providerAccountId });

        if (!dbUser && user.email) {
          dbUser = await User.findOne({ email: user.email });
        }

        if (dbUser) {
          dbUser.providerAccountId = providerAccountId;
          dbUser.name = user.name || dbUser.name;
          dbUser.image = user.image || dbUser.image;
          dbUser.lastLoginAt = new Date();
          if (user.email) {
            dbUser.email = user.email;
          }
          await dbUser.save();
        } else {
          const userData: NewUserData = {
            name: user.name,
            image: user.image,
            providerAccountId,
            lastLoginAt: new Date(),
          };
          if (user.email) {
            userData.email = user.email;
          }
          await User.create(userData);
        }
        return true;
      } catch (error) {
        console.error("User sync error (Non-blocking):", error);
        return true;
      }
    },
    async jwt({
      token,
      user,
      account,
      trigger,
      session,
    }: {
      token: JWT;
      user?: NextAuthUser;
      account?: Account | null;
      trigger?: "signIn" | "signUp" | "update";
      session?: { user?: { email?: string } };
    }) {
      try {
        await dbConnect();

        if (account?.providerAccountId) {
          token.providerAccountId = account.providerAccountId;
        }

        if (trigger === "update" && session?.user?.email && token.providerAccountId) {
          token.email = session.user.email;
          await User.findOneAndUpdate(
            { providerAccountId: token.providerAccountId },
            { $set: { email: session.user.email } },
            { returnDocument: "after" },
          );
        } else if (user?.email) {
          token.email = user.email;
        }

        if (token.providerAccountId) {
          const dbUser = await User.findOne({ providerAccountId: token.providerAccountId });
          if (dbUser) {
            token.role = dbUser.role;
            if (dbUser.email) {
              token.email = dbUser.email;
            }
          }
        }
      } catch (e) {
        console.error("JWT Callback Error:", e);
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (token && session.user) {
        session.user.role = token.role as string;
        session.user.id = (token.providerAccountId as string) || token.sub;
        session.user.email = (token.email as string) || session.user.email;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
};
