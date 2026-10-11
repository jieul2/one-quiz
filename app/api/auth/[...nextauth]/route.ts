import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import KakaoProvider from "next-auth/providers/kakao";
import dbConnect from "@/lib/mongodb";
import mongoose from "mongoose";

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
    async signIn({ user }: { user: any }) {
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
    // 미들웨어와 클라이언트에서 최신 DB 권한을 항상 참조할 수 있도록 토큰과 세션에 실시간 동기화
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.email = user.email;
      }
      try {
        await dbConnect();
        const dbUser = await User.findOne({ email: token.email });
        if (dbUser) {
          token.role = dbUser.role; // DB의 최신 role 반영
        }
      } catch (e) {
        console.error(e);
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (token && session.user) {
        session.user.role = token.role;
        session.user.id = token.sub;
      }
      return session;
    }
  },
  pages: {
    signIn: '/admin',
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };