import NextAuth, { User as NextAuthUser, Session, DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import KakaoProvider from "next-auth/providers/kakao";
import dbConnect from "@/lib/mongodb";
import mongoose from "mongoose";

// 세션 사용자 타입 확장 (role, id 추가)
declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      role?: string;
    } & DefaultSession["user"];
  }
}

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String },
  image: { type: String },
  role: { type: String, default: 'user' },
  lastLoginAt: { type: Date, default: Date.now },
});
const User = mongoose.models.User || mongoose.model('User', UserSchema);

const authOptions = {
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
    async signIn({ user }: { user: NextAuthUser }) {
      try {
        await dbConnect();
        await User.findOneAndUpdate(
          { email: user.email },
          { 
            name: user.name, 
            image: user.image, 
            lastLoginAt: new Date() 
          },
          { upsert: true, new: true }
        );
        return true;
      } catch (error) {
        console.error("User sync error:", error);
        return false;
      }
    },
    async jwt({ token, user }: { token: JWT; user?: NextAuthUser }) {
      if (user && user.email) {
        token.email = user.email;
      }
      try {
        await dbConnect();
        const dbUser = await User.findOne({ email: token.email });
        if (dbUser) {
          token.role = dbUser.role;
        }
      } catch (e) {
        console.error(e);
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (token && session.user) {
        session.user.role = token.role as string;
        session.user.id = token.sub;
      }
      return session;
    }
  },
  pages: {
    signIn: '/auth/signin', // 커스텀 로그인 페이지 경로
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };