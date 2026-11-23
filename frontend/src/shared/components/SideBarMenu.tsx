import { ownerMenu } from './OwnerMenu'
import SideBarNav from './SideBarNav'

/** Menú lateral del dueño (contraíble en escritorio) */
const SideBarMenu = () => <SideBarNav items={ownerMenu} />

export default SideBarMenu
