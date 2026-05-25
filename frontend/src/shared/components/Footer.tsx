const Footer = () => {
  return (
    <footer className="w-full border-t border-slate-200 bg-white py-4 text-sm text-slate-600 shadow-inner">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 text-center sm:flex-row sm:items-center sm:justify-between">
        <span>© {new Date().getFullYear()} Parking Admin. Todos los derechos reservados.</span>
      </div>
    </footer>
  )
}

export default Footer
