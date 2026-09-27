import StatusState from "@/components/StatusState";

export default function NotFound() {
  return (
    <StatusState variant="profileNotFound"
      title="Your profile could not be found"
      description="Your account may no longer be available or your session may need to be renewed."
      href="/login"
      action="Return to sign in"
    />
  );
}
