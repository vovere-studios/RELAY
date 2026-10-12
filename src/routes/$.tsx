import { createFileRoute } from "@tanstack/react-router";
import { seoHead } from "../lib/seo";
export const Route = createFileRoute("/$")({ head: ({ params }) => seoHead(`/${params._splat || ""}`), component: () => null });
