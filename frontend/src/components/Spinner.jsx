export default function Spinner({ fullscreen }) {
  const el = (
    <div className="flex items-center justify-center">
      <div className="h-8 w-8 rounded-full border-4 border-brand-100 border-t-brand-600 animate-spin" />
    </div>
  )
  if (fullscreen)
    return <div className="fixed inset-0 flex items-center justify-center bg-white">{el}</div>
  return el
}
