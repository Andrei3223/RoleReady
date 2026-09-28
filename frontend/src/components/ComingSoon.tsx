export function ComingSoon({ title, text }: { title: string; text: string }) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-24 text-center sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-3 text-muted-foreground">{text}</p>
    </div>
  );
}
