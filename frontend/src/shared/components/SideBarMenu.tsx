import SideBarButton from "./SideBarButton"
import { ChartSpline, ParkingMeter, Receipt, TableConfig, UserRoundCog, type LucideIcon } from "lucide-react"

export interface OpcionMenu {
  name: string
  path: string
  icon: LucideIcon
}

const OwnerOptions: OpcionMenu[] = [
  {
    name: 'Parking',
    path: '/owner/parking',
    icon: ParkingMeter,
  },
  {
    name: 'Tarifas',
    path: '/owner/rates',
    icon: Receipt,
  },
  {
    name: 'Usuarios y accesos',
    path: '/owner/users',
    icon: UserRoundCog,
  },
  {
    name: 'Reportes',
    path: '/owner/reports',
    icon: ChartSpline,
  },
  {
    name: 'Configuración',
    path: '/owner/settings',
    icon: TableConfig,
  }
]

const SideBarMenu = () => {
  return (
    <div className='sm:w-full md:w-1/6 sticky min-w-min'>
      <div className='flex w-full '>
        <ul className='w-full md:flex-col  space-y-3'>
          {OwnerOptions.map((item, index) => (
            <SideBarButton key={index} item={item} />
          ))}
        </ul>
      </div>
    </div>
  )
}

export default SideBarMenu