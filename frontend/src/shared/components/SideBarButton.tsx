// import { NavLink } from "react-router-dom"
// import type { OpcionMenu } from "./SideBarMenu"

// const SideBarButton = ({ item }: { item: OpcionMenu }) => {
//   const { name, path, icon } = item
//   const Icon = icon

//   return (
//     <li className='flex flex-col backdrop-blur-sm mb-3'>
//       <NavLink
//         to={path}
//         className={({ isActive }) =>
//           `flex min-w-min shadow-sm backdrop-blur-sm shadow-[#00000063] hover:shadow-md hover:shadow-[#066aff] transform duration-200 hover:cursor-pointer justify-center py-2 rounded-md items-center gap-2 px-3 ${
//             isActive
//               ? 'bg-blue-500 text-slate-50'
//               : 'border border-transparent bg-white text-slate-800'
//           }`
//         }
//       >
//         <Icon size={20} />
        
//         <span className='w-5/6 text-sm sm:text-sm'>{name}</span>
//       </NavLink>
//     </li>
//   )
// }

// export default SideBarButton