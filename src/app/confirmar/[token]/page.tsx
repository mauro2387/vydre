export default async function ConfirmarPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <p className="text-muted-foreground">Cargando confirmación...</p>
        <p className="sr-only">{token}</p>
      </div>
    </div>
  )
}
