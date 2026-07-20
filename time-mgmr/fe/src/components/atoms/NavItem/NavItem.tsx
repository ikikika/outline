import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './NavItem.css';

export interface NavItemProps {
  label: string;
  path: string;
  icon?: React.ReactNode;
}

export const NavItem: React.FC<NavItemProps> = ({ label, path, icon }) => {
  const location = useLocation();
  const isActive = location.pathname === path;

  return (
    <Link
      to={path}
      className={`nav-item ${isActive ? 'nav-item--active' : ''}`}
    >
      {icon && <span className="nav-item__icon">{icon}</span>}
      <span className="nav-item__label">{label}</span>
    </Link>
  );
};
