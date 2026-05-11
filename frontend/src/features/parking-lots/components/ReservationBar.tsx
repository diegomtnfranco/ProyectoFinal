function ReservationBar() {
  return (
    <div className='fixed bottom-0 left-0 w-full bg-white shadow-2xl p-4 flex items-center justify-between'>
      <div>
        <h3 className='font-bold text-lg'>Reserva tu espacio</h3>

        <p className='text-gray-500'>Seleccioná un horario disponible</p>
      </div>

      <button className='bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold transition-all'>
        Reservar
      </button>
    </div>
  )
}

export default ReservationBar