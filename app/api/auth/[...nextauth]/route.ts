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
        // 이미 가입된 유저라면 정보 및 최근 로그인 일자 갱신, 아니면 신규 생성
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
    async session({ session }: { session: any }) {
      try {
        await dbConnect();
        const dbUser = await User.findOne({ email: session.user.email });
        if (dbUser) {
          session.user.role = dbUser.role; // 세션에 권한(role) 탑재
          session.user.id = dbUser._id;
        }
      } catch (e) {
        console.error(e);
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