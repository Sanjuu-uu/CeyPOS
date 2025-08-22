import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './home.tsx';
import Login from './Login.tsx';
import Register from './Register.tsx';
import AboutUs from './AboutUs.tsx';


const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/about" element={<AboutUs />} />
      
        <Route path="/features" element={<div>Features Page - Coming Soon</div>} />
        <Route path="/pricing" element={<div>Pricing Page - Coming Soon</div>} />
        <Route path="/support" element={<div>Support Page - Coming Soon</div>} />
        <Route path="/contact" element={<div>Contact Page - Coming Soon</div>} />
        {/* Catch-all route for 404 */}
        <Route path="*" element={<div>Page Not Found - 404</div>} />
      </Routes>
    </Router>
  );
};

export default App;