import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Navigation from './components/Navigation/Navigation';
import Footer from './components/Footer/Footer';
import Components from './components/Components';
import Home from './components/Home';
import './styles/global.css';

const App: React.FC = () => {
  return (
    <Router>
      <div className="app">
        <Navigation />
        <div className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/components" element={
              <>
                <div className="hero-section" style={{
                  padding: '80px 5%', 
                  textAlign: 'center',
                  backgroundImage: 'linear-gradient(to bottom, var(--gray--200), var(--main--white))',
                }}>
                  <h1 style={{ marginBottom: '24px' }}>Global Components Library</h1>
                  <p className="paragraph-large" style={{ maxWidth: '600px', margin: '0 auto' }}>
                    This page showcases all UI elements from the POS Landing page template with exact styling, 
                    sizes, colors, and responsiveness.
                  </p>
                  <div style={{ marginTop: '24px' }}>
                    <Link to="/" className="button-outline-small">Back to Home</Link>
                  </div>
                </div>
                <div style={{ padding: '40px 5%' }}>
                  <Components />
                </div>
              </>
            } />
          </Routes>
        </div>
        <Footer />
      </div>
    </Router>
  );
};

export default App;
