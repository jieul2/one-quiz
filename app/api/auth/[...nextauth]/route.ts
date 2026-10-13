import NextAuth, { User as NextAuthUser, Session, DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import KakaoProvider from "next-auth/providers/kakao";
import dbConnect from "@/lib/mongodb";
import mongoose from "mongoose";
import { withAudit } from "@/lib/withAudit";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      role?: string;
    } & DefaultSession["user"];
  }
}

const UserSchema = new mongoose.Schema({
  email: { type: String, sparse: true },
  name: { type: String },
  image: { type: String },
  role: { type: String, default: "user" },
  providerAccountId: { type: String, required: true, unique: true },
  lastLoginAt: { type: Date, default: Date.now },
});
const User = mongoose.models.User || mongoose.model("User", UserSchema);

// 👈 외부에서 가져다 쓸 수 있도록 export 추가
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
    async signIn({ user, account }: { user: NextAuthUser; account: any }) {
      try {
        await dbConnect();
        const providerAccountId = account?.providerAccountId || user.id;
        if (!providerAccountId) return true;

        const dbUser = await User.findOne({ providerAccountId });

        if (dbUser) {
          dbUser.name = user.name || dbUser.name;
          dbUser.image = user.image || dbUser.image;
          dbUser.lastLoginAt = new Date();
          await dbUser.save();
        } else {
          const userData: any = {
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
      account?: any;
      trigger?: string;
      session?: any;
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
            { new: true },
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

const handler = NextAuth(authOptions);

export const GET = withAudit(handler, "NextAuth 인증 GET 요청");
export const POST = withAudit(handler, "NextAuth 소셜 로그인/로그아웃 POST 요청");
