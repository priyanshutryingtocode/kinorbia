import StatusState from "@/components/StatusState";

export default function RouteNotFoundState({
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
  return <StatusState variant="routeNotFound" title={title} description={description} href={href} action={action} />;
}
