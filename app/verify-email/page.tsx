import Link from "next/link";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { hashToken } from "@/lib/token";

type VerifyEmailPageProps = {
  searchParams: Promise<{ token?: string }> | { token?: string };
};

export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const { token } = await Promise.resolve(searchParams);

  let status: "success" | "invalid" | "already" = "invalid";

  if (typeof token === "string" && token.length > 0) {
    await dbConnect();
    const tokenHash = hashToken(token);
    const user = await User.findOne({ "verifyToken.token": tokenHash });

    if (user?.emailVerified) {
      await User.updateOne({ _id: user._id }, { $unset: { verifyToken: 1 } });
      status = "already";
    } else if (user && user.verifyToken?.expiresAt && user.verifyToken.expiresAt > new Date()) {
      await User.updateOne(
        { _id: user._id },
        {
          $set: { emailVerified: new Date() },
          $unset: { verifyToken: 1 },
        }
      );
      status = "success";
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 p-6 text-center text-white">
      <h1 className="text-3xl font-bold">
        {status === "success"
          ? "Email verified"
          : status === "already"
            ? "Email already verified"
            : "Invalid or expired link"}
      </h1>
      <p className="mt-4 max-w-md text-neutral-400">
        {status === "success"
          ? "Thanks for confirming your email address."
          : status === "already"
            ? "Your email was already confirmed."
            : "This verification link is invalid or has expired. Try signing up again to receive a new link."}
      </p>
      <Link
        href="/"
        className="mt-8 rounded-full bg-red-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-red-500"
      >
        Back to KinOrbia
      </Link>
    </div>
  );
}
