interface Props {
  type: string
  available: number
}

function ParkingAvailability({ type, available }: Props) {
  return (
    <div className='bg-white shadow-md rounded-2xl p-6 flex flex-col gap-2 w-full md:w-64'>
      <h3 className='text-lg font-bold'>{type}</h3>

      <span className='text-4xl font-bold text-blue-600'>
        {available}
      </span>

      <p className='text-gray-500'>Espacios disponibles</p>
    </div>
  )
}

export default ParkingAvailability