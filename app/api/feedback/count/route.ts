import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Feedback from "@/models/Feedback";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== "admin") {
      return NextResponse.json({ pendingCount: 0 });
    }

    await dbConnect();
    const pendingCount = await Feedback.countDocuments({ status: "pending" });

    return NextResponse.json({ pendingCount });
  } catch (error) {
    console.error("GET /api/feedback/count error:", error);
    return NextResponse.json({ pendingCount: 0 });
  }
}
