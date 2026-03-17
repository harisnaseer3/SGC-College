import { NavLink } from 'react-router-dom';

const SidebarItem = ({ name, icon, path }) => {
    return (
        <NavLink
            to={path}
            className={({ isActive }) => 
                `w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 group
                ${isActive 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                    : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-50'}`
            }
        >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icon} />
            </svg>
            <span className="font-medium tracking-wide">{name}</span>
            {({ isActive }) => isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white opacity-50"></div>
            )}
        </NavLink>
    );
};

export default SidebarItem;
