import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/global.css';

const Navigation: React.FC = () => {
  const [isNavOpen, setIsNavOpen] = useState(false);

  const toggleNav = () => {
    setIsNavOpen(!isNavOpen);
  };

  return (
    <div 
      className="navigation"
      role="banner"
    >
      <div className="navigation-container">        <div className="navigation-left">
          <Link
            to="/"
            className="navigation-logo"
          >
            <img src="/images/nav-20logo.svg" loading="lazy" width="94" alt="Logo" />
          </Link>
        </div>
        <nav role="navigation" className={`nav-menu ${isNavOpen ? 'open' : ''}`}>
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/components" className="nav-link">Components</Link>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="nav-link">GitHub</a>
          <a href="https://docs.example.com" target="_blank" rel="noopener noreferrer" className="nav-link">Documentation</a>
        </nav>
        <div className="navigation-right">
          <div className="navigation-button-group">
            <Link to="/components" className="button-outline-small">Components</Link>
            <Link to="/" className="button-primary-small">Home</Link>
          </div>
          <div
            className="menu-button"
            onClick={toggleNav}
          >
            <div className="menu-line-wrapper">
              <div className={`menu-line top ${isNavOpen ? 'open' : ''}`}></div>
              <div className={`menu-line middle ${isNavOpen ? 'open' : ''}`}></div>
              <div className={`menu-line bottom ${isNavOpen ? 'open' : ''}`}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navigation;
