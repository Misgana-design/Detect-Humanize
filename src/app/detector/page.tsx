import { redirect } from "next/navigation";

export default async function DetectorAliasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (typeof value === "string") query.set(key, value);
  });

  const queryString = query.toString();
  redirect(queryString ? `/detect?${queryString}` : "/detect");
}
