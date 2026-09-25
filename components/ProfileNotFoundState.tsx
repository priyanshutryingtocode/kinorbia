import StatusState from "@/components/StatusState";

export default function ProfileNotFoundState({
  title,
  description,
  href,
  action,
}: {
  title?: string;
  description?: string;
  href?: string;
  action?: string;
}) {
  return <StatusState variant="profileNotFound" title={title} description={description} href={href} action={action} />;
}
