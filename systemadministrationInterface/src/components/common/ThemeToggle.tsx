import React from 'react';
import { SunIcon, MoonIcon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
const ThemeToggle: React.FC = () => {
  const {
    theme,
    toggleTheme
  } = useTheme();
  return <button onClick={toggleTheme} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
      {theme === 'light' ? <MoonIcon size={20} className="text-gray-700" /> : <SunIcon size={20} className="text-yellow-300" />}
    </button>;
};
export default ThemeToggle;