import ProfileNotFoundState from "@/components/ProfileNotFoundState";

export default function NotFound() {
  return (
    <ProfileNotFoundState
      title="Your profile could not be found"
      description="Your account may no longer be available or your session may need to be renewed."
      href="/login"
      action="Return to sign in"
    />
  );
}
