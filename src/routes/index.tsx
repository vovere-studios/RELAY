import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VOVERE Studios" },
      {
        name: "description",
        content: "VOVERE Studios – neues Projekt. Saubere Basis für den Start.",
      },
      { property: "og:title", content: "VOVERE Studios" },
      {
        property: "og:description",
        content: "VOVERE Studios – neues Projekt. Saubere Basis für den Start.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <p className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
        VOVERE Studios
      </p>
      <h1 className="mt-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
        Neues Projekt
      </h1>
      <p className="mt-4 max-w-md text-base text-muted-foreground">
        Die Basis steht. Verknüpfe das Projekt mit GitHub und starte dein
        Setup.
      </p>
    </div>
  );
}
