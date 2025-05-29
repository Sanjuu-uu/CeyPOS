import React from 'react';
import '../../styles/global.css';
import '../../styles/dashboard-light.css';

// Custom style for the component library
const sectionStyle: React.CSSProperties = {
  paddingTop: '48px',
  paddingBottom: '48px',
  borderBottom: '1px solid var(--gray--200)'
};

const Components: React.FC = () => {
  // Random bar animation function
  const animateChartBars = (chartContainer: HTMLElement) => {
    const bars = chartContainer.querySelectorAll('.bar, .enhanced-vertical-bar');
    
    bars.forEach((bar: Element) => {
      const htmlBar = bar as HTMLElement;
      const isVertical = htmlBar.classList.contains('enhanced-vertical-bar');
      
      // Generate random value between 20% and 95%
      const randomValue = Math.floor(Math.random() * 75) + 20;
      
      if (isVertical) {
        htmlBar.style.height = `${randomValue}%`;
      } else {
        htmlBar.style.width = `${randomValue}%`;
      }
    });
  };

  const handleChartHover = (event: React.MouseEvent<HTMLElement>) => {
    const chartContainer = event.currentTarget;
    chartContainer.classList.add('chart-animating');
    animateChartBars(chartContainer);
    
    setTimeout(() => {
      chartContainer.classList.remove('chart-animating');
    }, 500);
  };

  return (
    <div className="container-large">
      
      {/* Color Palette Section */}
      <section style={sectionStyle}>
        <h2 className="section-title">Color Palette</h2>
        <div className="component-grid">
          {/* Primary Colors */}
          <div className="component-item">
            <div className="color-swatch" style={{backgroundColor: '#d8fa52'}}>
              <div className="color-preview-area"></div>
              <div className="color-overlay dark-text">
                <div className="color-name">Verde Primary</div>
                <div className="color-hex">#d8fa52</div>
                <div className="color-rgb">rgb(216, 250, 82)</div>
              </div>
            </div>
            <p className="component-description">Main CTA & Small Primary Button</p>
          </div>
          <div className="component-item">
            <div className="color-swatch" style={{backgroundColor: '#c5f542'}}>
              <div className="color-preview-area"></div>
              <div className="color-overlay dark-text">
                <div className="color-name">Verde Hover</div>
                <div className="color-hex">#c5f542</div>
                <div className="color-rgb">rgb(197, 245, 66)</div>
              </div>
            </div>
            <p className="component-description">Verde primary hover state</p>
          </div>
          <div className="component-item">
            <div className="color-swatch" style={{backgroundColor: '#b39efc'}}>
              <div className="color-preview-area"></div>
              <div className="color-overlay dark-text">
                <div className="color-name">Purple Primary</div>
                <div className="color-hex">#b39efc</div>
                <div className="color-rgb">rgb(179, 158, 252)</div>
              </div>
            </div>
            <p className="component-description">Purple accent color</p>
          </div>
          <div className="component-item">
            <div className="color-swatch" style={{backgroundColor: '#ef94b5'}}>
              <div className="color-preview-area"></div>
              <div className="color-overlay dark-text">
                <div className="color-name">Pink Primary</div>
                <div className="color-hex">#ef94b5</div>
                <div className="color-rgb">rgb(239, 148, 181)</div>
              </div>
            </div>
            <p className="component-description">Pink accent color</p>
          </div>
          
          {/* Gray Scale */}
          <div className="component-item">
            <div className="color-swatch" style={{backgroundColor: '#fff'}}>
              <div className="color-preview-area"></div>
              <div className="color-overlay dark-text">
                <div className="color-name">White</div>
                <div className="color-hex">#fff</div>
                <div className="color-rgb">rgb(255, 255, 255)</div>
              </div>
            </div>
            <p className="component-description">Main white background</p>
          </div>
          <div className="component-item">
            <div className="color-swatch" style={{backgroundColor: '#e4e5e7'}}>
              <div className="color-preview-area"></div>
              <div className="color-overlay dark-text">
                <div className="color-name">Gray 200</div>
                <div className="color-hex">#e4e5e7</div>
                <div className="color-rgb">rgb(228, 229, 231)</div>
              </div>
            </div>
            <p className="component-description">Light gray for borders & backgrounds</p>
          </div>
          <div className="component-item">
            <div className="color-swatch" style={{backgroundColor: '#d2d3d5'}}>
              <div className="color-preview-area"></div>
              <div className="color-overlay dark-text">
                <div className="color-name">Gray 200 Hover</div>
                <div className="color-hex">#d2d3d5</div>
                <div className="color-rgb">rgb(210, 211, 213)</div>
              </div>
            </div>
            <p className="component-description">Gray 200 hover state</p>
          </div>
          <div className="component-item">
            <div className="color-swatch" style={{backgroundColor: '#9da0a7'}}>
              <div className="color-preview-area"></div>
              <div className="color-overlay">
                <div className="color-name">Gray 400</div>
                <div className="color-hex">#9da0a7</div>
                <div className="color-rgb">rgb(157, 160, 167)</div>
              </div>
            </div>
            <p className="component-description">Medium gray for placeholders</p>
          </div>
          <div className="component-item">
            <div className="color-swatch" style={{backgroundColor: '#6b6e76'}}>
              <div className="color-preview-area"></div>
              <div className="color-overlay">
                <div className="color-name">Gray 500</div>
                <div className="color-hex">#6b6e76</div>
                <div className="color-rgb">rgb(107, 110, 118)</div>
              </div>
            </div>
            <p className="component-description">Dark gray for secondary text</p>
          </div>
          <div className="component-item">
            <div className="color-swatch" style={{backgroundColor: '#0f0f10'}}>
              <div className="color-preview-area"></div>
              <div className="color-overlay">
                <div className="color-name">Gray 900</div>
                <div className="color-hex">#0f0f10</div>
                <div className="color-rgb">rgb(15, 15, 16)</div>
              </div>
            </div>
            <p className="component-description">Main text & dark elements</p>
          </div>
          <div className="component-item">
            <div className="color-swatch" style={{backgroundColor: 'rgba(15, 15, 16, 0.8)'}}>
              <div className="color-preview-area"></div>
              <div className="color-overlay">
                <div className="color-name">Gray 900 Hover</div>
                <div className="color-hex">rgba(15, 15, 16, 0.8)</div>
                <div className="color-rgb">rgba(15, 15, 16, 0.8)</div>
              </div>
            </div>
            <p className="component-description">Gray 900 hover state</p>
          </div>
          
          {/* Card Colors */}
          <div className="component-item">
            <div className="color-swatch" style={{backgroundColor: '#19191a'}}>
              <div className="color-preview-area"></div>
              <div className="color-overlay">
                <div className="color-name">Card Primary</div>
                <div className="color-hex">#19191a</div>
                <div className="color-rgb">rgb(25, 25, 26)</div>
              </div>
            </div>
            <p className="component-description">Dark card background</p>
          </div>
          <div className="component-item">
            <div className="color-swatch" style={{backgroundColor: '#232324'}}>
              <div className="color-preview-area"></div>
              <div className="color-overlay">
                <div className="color-name">Card Hover</div>
                <div className="color-hex">#232324</div>
                <div className="color-rgb">rgb(35, 35, 36)</div>
              </div>
            </div>
            <p className="component-description">Dark card hover state</p>
          </div>
        </div>
      </section>

      {/* Typography Section */}
      <section style={sectionStyle}>
        <h2 className="section-title">Typography</h2>
        <div className="component-grid">
          <div className="component-item">
            <h1>Heading 1</h1>
            <p className="component-description">56px, 500 weight, 1.2 line height</p>
          </div>
          <div className="component-item">
            <h2>Heading 2</h2>
            <p className="component-description">48px, 500 weight, 1.2 line height</p>
          </div>
          <div className="component-item">
            <h3>Heading 3</h3>
            <p className="component-description">40px, 500 weight, 1.2 line height</p>
          </div>
          <div className="component-item">
            <p className="paragraph-large">Paragraph Large</p>
            <p className="component-description">16px, 400 weight, 24px line height</p>
          </div>
          <div className="component-item">
            <p className="paragraph-regular">Paragraph Regular</p>
            <p className="component-description">14px, 400 weight, 22px line height</p>
          </div>
          <div className="component-item">
            <p className="paragraph-small">Paragraph Small</p>
            <p className="component-description">12px, 400 weight, 20px line height</p>
          </div>
          <div className="component-item">
            <div className="label-regular">Label Regular</div>
            <p className="component-description">12px, 500 weight, uppercase</p>
          </div>
          <div className="component-item">
            <div className="subheading-regular">Subheading Regular</div>
            <p className="component-description">16px, 600 weight, 24px line height</p>
          </div>
        </div>
      </section>

      {/* Button Section */}
      <section style={sectionStyle}>
        <h2 className="section-title">Buttons</h2>
        <div className="component-grid">
          <div className="component-item">
            <a href="#" className="button-primary">Primary Button</a>
            <p className="component-description">Main CTA button</p>
          </div>
          <div className="component-item">
            <a href="#" className="button-secondary">Secondary Button</a>
            <p className="component-description">Secondary CTA button</p>
          </div>
          <div className="component-item">
            <a href="#" className="button-outline">Outline Button</a>
            <p className="component-description">Outline style button</p>
          </div>
          <div className="component-item">
            <a href="#" className="button-primary-small">Small Primary</a>
            <p className="component-description">Small primary button</p>
          </div>
          <div className="component-item">
            <a href="#" className="button-outline-small">Small Outline</a>
            <p className="component-description">Small outline button</p>
          </div>
          <div className="component-item">
            <a href="#" className="button-dark">Dark Button</a>
            <p className="component-description">Dark background button</p>
          </div>
        </div>
      </section>

      {/* Form Section */}
      <section style={sectionStyle}>
        <h2 className="section-title">Form Elements</h2>
        <div className="component-grid">
          <div className="component-item wide">
            <div className="form-h">
              <input className="text-field-docked" type="email" placeholder="Enter your email" />
              <input type="submit" value="Get Started" className="submit-button" />
            </div>
            <p className="component-description">Docked search with submit button</p>
          </div>
          <div className="component-item wide">
            <input className="text-field-outline" type="text" placeholder="Search for anything..." />
            <p className="component-description">Outline text field</p>
          </div>
          <div className="component-item wide">
            <textarea className="text-field-outline text-area" placeholder="Write your message here..."></textarea>
            <p className="component-description">Text area</p>
          </div>
          <div className="component-item">
            <div className="checkbox-wrapper">
              <input id="checkbox1" type="checkbox" className="checkbox" />
              <label htmlFor="checkbox1" className="checkbox-label">Subscribe to newsletter</label>
            </div>
            <p className="component-description">Checkbox</p>
          </div>
        </div>
      </section>

      {/* Cards Section */}
      <section style={sectionStyle}>
        <h2 className="section-title">Cards & Containers</h2>
        <div className="component-grid">
          <div className="component-item wide">
            <div className="benefits-card">
              <div className="benefits-card-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="benefits-content">
                <div className="subheading-regular">Feature Title</div>
                <p className="paragraph-regular">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam venenatis orci sit amet.</p>
              </div>
            </div>
            <p className="component-description">Benefits card</p>
          </div>
          <div className="component-item wide">
            <div className="cta-card">
              <div className="cta-card-heading">
                <div className="wrap-h-space-between">
                  <div className="subheading-small text-white">Premium Plan</div>
                  <div className="arrow-button">
                    <div className="icon-x-small">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10.6693 6.27614L4.93158 12.0139L3.98877 11.0711L9.7265 5.33333H4.66932V4L12.0026 4V11.3333H10.6693V6.27614Z" fill="currentColor" />
                      </svg>
                    </div>
                  </div>
                </div>
                <p className="paragraph-small text-gray-400">Lorem Ipsum Dolor sit.</p>
              </div>
              <a href="#" className="button-dark">$24.00</a>
            </div>
            <p className="component-description">CTA Card</p>
          </div>
          <div className="component-item wide">
            <div className="testimonial-card">
              <div className="testimonial-text">
                <p className="paragraph-regular">"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam venenatis orci sit amet vehicula condimentum."</p>
              </div>
              <div className="testimonial-author">
                <div className="testimonial-author-image">
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="20" cy="20" r="20" fill="#E4E5E7"/>
                    <path d="M20 20C22.21 20 24 18.21 24 16C24 13.79 22.21 12 20 12C17.79 12 16 13.79 16 16C16 18.21 17.79 20 20 20ZM20 22C17.33 22 12 23.34 12 26V28H28V26C28 23.34 22.67 22 20 22Z" fill="#9DA0A7"/>
                  </svg>
                </div>
                <div className="testimonial-author-info">
                  <div className="subheading-small">John Smith</div>
                  <p className="paragraph-small text-gray-500">CEO, Company Inc.</p>
                </div>
              </div>
            </div>
            <p className="component-description">Testimonial Card</p>
          </div>
        </div>
      </section>

      {/* Badge Section */}
      <section style={sectionStyle}>
        <h2 className="section-title">Badges & Labels</h2>
        <div className="component-grid">
          <div className="component-item">
            <div className="badge"><div>New Feature</div></div>
            <p className="component-description">Badge</p>
          </div>
          <div className="component-item">
            <div className="link-badge">
              <div className="icon-x-small">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="8" cy="8" r="6.66667" fill="#E4E5E7"/>
                  <circle cx="8" cy="8" r="2" fill="#0F0F10"/>
                </svg>
              </div>
              <div>New</div>
            </div>
            <p className="component-description">Link Badge</p>
          </div>
          <div className="component-item">
            <div className="tag">Featured</div>
            <p className="component-description">Tag</p>
          </div>
        </div>
      </section>

      {/* Sections & Layouts */}
      <section style={sectionStyle}>
        <h2 className="section-title">Sections & Layouts</h2>
        <div className="component-grid">
          <div className="component-item wide">
            <div className="section-sample section-regular">
              <div className="subheading-regular">Section Regular</div>
              <p className="paragraph-regular text-gray-500">Padding: 96px 5%</p>
            </div>
            <p className="component-description">Regular Section</p>
          </div>
          <div className="component-item wide">
            <div className="section-sample section-large">
              <div className="subheading-regular">Section Large</div>
              <p className="paragraph-regular text-gray-500">Padding: 128px 5%</p>
            </div>
            <p className="component-description">Large Section</p>
          </div>
          <div className="component-item wide">
            <div className="section-sample section-dark">
              <div className="subheading-regular text-white">Section Dark</div>
              <p className="paragraph-regular text-gray-400">Dark background section</p>
            </div>
            <p className="component-description">Dark Section</p>
          </div>
        </div>
      </section>

      {/* Main Dashboards and Analytics */}
      <section style={sectionStyle}>
        <h2 className="section-title">Main Dashboards and Analytics</h2>
        <div className="component-grid">
          {/* Horizontal Bar Chart - Major Expenses */}
          <div className="component-item wide">
            <div 
              className="dashboard-chart-container"
              onMouseEnter={handleChartHover}
            >
              <div className="dashboard-chart-header">
                <div className="chart-title-container">
                  <div className="chart-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18 20V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 20V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M6 20V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="chart-title">Major Expenses</div>
                </div>
                <div className="time-selector">
                  Weekly
                  <div className="time-selector-icon">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="horizontal-bar-chart">
                <div className="bar-item">
                  <div className="bar-label">Personnel</div>
                  <div className="bar-container">
                    <div className="bar bar-personnel" style={{width: '50%'}}></div>
                  </div>
                </div>
                
                <div className="bar-item">
                  <div className="bar-label">Overheads</div>
                  <div className="bar-container">
                    <div className="bar bar-overheads" style={{width: '80%'}}>
                      <div className="bar-tooltip">$8,82.21</div>
                    </div>
                  </div>
                </div>
                
                <div className="bar-item">
                  <div className="bar-label">Capital</div>
                  <div className="bar-container">
                    <div className="bar bar-capital" style={{width: '40%'}}></div>
                  </div>
                </div>
                
                <div className="chart-axis">
                  <div className="axis-value">0</div>
                  <div className="axis-value">2K</div>
                  <div className="axis-value">4K</div>
                  <div className="axis-value">6K</div>
                  <div className="axis-value">8K</div>
                  <div className="axis-value">10K</div>
                </div>
              </div>
            </div>
            <p className="component-description">Horizontal Bar Chart - Major Expenses</p>
          </div>
          
          {/* Vertical Bar Chart */}
          <div className="component-item wide">
            <div 
              className="dashboard-chart-container"
              onMouseEnter={handleChartHover}
            >
              <div className="dashboard-chart-header">
                <div className="chart-title-container">
                  <div className="chart-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18 20V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 20V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M6 20V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="chart-title">Monthly Performance</div>
                </div>
                <div className="time-selector">
                  Monthly
                  <div className="time-selector-icon">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="enhanced-vertical-chart">
                <div className="enhanced-vertical-bars">
                  <div className="enhanced-bar-item">
                    <div className="enhanced-vertical-bar bar-color-1" style={{height: '50%'}}>
                      <div className="enhanced-bar-tooltip">$5,943</div>
                    </div>
                    <div className="enhanced-bar-label">Jan</div>
                  </div>
                  
                  <div className="enhanced-bar-item">
                    <div className="enhanced-vertical-bar bar-color-2" style={{height: '80%'}}>
                      <div className="enhanced-bar-tooltip">$8,821</div>
                    </div>
                    <div className="enhanced-bar-label">Feb</div>
                  </div>
                  
                  <div className="enhanced-bar-item">
                    <div className="enhanced-vertical-bar bar-color-3" style={{height: '35%'}}>
                      <div className="enhanced-bar-tooltip">$4,482</div>
                    </div>
                    <div className="enhanced-bar-label">Mar</div>
                  </div>
                  
                  <div className="enhanced-bar-item">
                    <div className="enhanced-vertical-bar bar-color-1" style={{height: '70%'}}>
                      <div className="enhanced-bar-tooltip">$7,932</div>
                    </div>
                    <div className="enhanced-bar-label">Apr</div>
                  </div>
                  
                  <div className="enhanced-bar-item">
                    <div className="enhanced-vertical-bar bar-color-2" style={{height: '60%'}}>
                      <div className="enhanced-bar-tooltip">$6,457</div>
                    </div>
                    <div className="enhanced-bar-label">May</div>
                  </div>
                  
                  <div className="enhanced-bar-item">
                    <div className="enhanced-vertical-bar bar-color-3" style={{height: '90%'}}>
                      <div className="enhanced-bar-tooltip">$9,124</div>
                    </div>
                    <div className="enhanced-bar-label">Jun</div>
                  </div>
                  
                  <div className="enhanced-bar-item">
                    <div className="enhanced-vertical-bar bar-color-1" style={{height: '65%'}}>
                      <div className="enhanced-bar-tooltip">$6,924</div>
                    </div>
                    <div className="enhanced-bar-label">Jul</div>
                  </div>
                </div>
                
                <div className="enhanced-chart-axis">
                  <div className="enhanced-axis-value">0</div>
                  <div className="enhanced-axis-value">2K</div>
                  <div className="enhanced-axis-value">4K</div>
                  <div className="enhanced-axis-value">6K</div>
                  <div className="enhanced-axis-value">8K</div>
                  <div className="enhanced-axis-value">10K</div>
                </div>
              </div>
            </div>
            <p className="component-description">Vertical Bar Chart - Monthly Performance</p>
          </div>
          
          {/* Total Income Card - Light Mode */}
          <div className="component-item">
            <div className="dashboard-card-light">
              <div className="dashboard-card-header-light">
                <div className="dashboard-label-light">TOTAL INCOME</div>
                <div className="dashboard-value-light">$96,342.00</div>
                <div className="dashboard-change-light positive">
                  <div className="arrow-icon-light">↑</div>
                  <div className="change-percentage-light">11.95%</div>
                  <div className="change-text-light">Luvy Compared to last month</div>
                </div>
              </div>
            </div>
            <p className="component-description">Income Dashboard Card - Light Mode</p>
          </div>

          {/* Profit Card - Light Mode */}
          <div className="component-item">
            <div className="dashboard-card-light">
              <div className="dashboard-card-header-light">
                <div className="dashboard-label-light">PROFIT</div>
                <div className="dashboard-value-light">$12,500.00</div>
                <div className="dashboard-change-light positive">
                  <div className="arrow-icon-light">↑</div>
                  <div className="change-percentage-light">11.95%</div>
                  <div className="change-text-light">Compared to last month</div>
                </div>
              </div>
            </div>
            <p className="component-description">Profit Dashboard Card - Light Mode</p>
          </div>

          {/* Conversion Rate Card - Light Mode */}
          <div className="component-item">
            <div className="dashboard-card-light">
              <div className="dashboard-card-header-light">
                <div className="dashboard-label-light">CONVERSION RATE</div>
                <div className="dashboard-value-light">12,96</div>
                <div className="dashboard-change-light positive">
                  <div className="arrow-icon-light">↑</div>
                  <div className="change-percentage-light">11.95%</div>
                  <div className="change-text-light">Luvy Compared to last month</div>
                </div>
              </div>
            </div>
            <p className="component-description">Conversion Rate Card - Light Mode</p>
          </div>

          {/* Total Work Card - Wide, Light Mode */}
          <div className="component-item wide">
            <div className="dashboard-card-light wide">
              <div className="dashboard-card-header-light">
                <div className="dashboard-label-light">TOTAL WORK</div>
                <div className="work-time-light">
                  <div className="clock-icon-light">•</div>
                  <div className="hours-light">45 hours · 16 mins</div>
                </div>
                <div className="time-filter-light">
                  <button className="time-button-light">5D</button>
                  <button className="time-button-light active">2W</button>
                  <button className="time-button-light">1M</button>
                  <button className="time-button-light">6M</button>
                  <button className="time-button-light">1Y</button>
                </div>
                <div className="graph-container-light">
                  <div className="graph-line-light"></div>
                  <div className="date-marker-light">Monday, 6h</div>
                </div>
              </div>
            </div>
            <p className="component-description">Work Time Dashboard Card - Light Mode</p>
          </div>

          {/* Rating Card - Light Mode */}
          <div className="component-item">
            <div className="dashboard-card-light">
              <div className="dashboard-card-header-light">
                <div className="dashboard-label-light">TOTAL RATING</div>
                <div className="rating-container-light">
                  <div className="star-icon-light">★</div>
                  <div className="rating-value-light">4.2/5</div>
                  <div className="rating-detail-light">(Overall 4.5)</div>
                </div>
              </div>
            </div>
            <p className="component-description">Rating Dashboard Card - Light Mode</p>
          </div>

          {/* Testimonials Card - Light Mode */}
          <div className="component-item">
            <div className="dashboard-card-light">
              <div className="dashboard-card-header-light">
                <div className="testimonial-header-light">
                  <div className="testimonial-title-light">24 Testimonials</div>
                  <div className="testimonial-subtitle-light">Completed in this quarter</div>
                </div>
                <div className="attendees-container-light">
                  <div className="attendee-light">A</div>
                  <div className="attendee-light">M</div>
                  <div className="attendee-light">K</div>
                  <div className="attendee-count-light">26 Attended</div>
                </div>
                <div className="bar-chart-container-light">
                  {/* Bars for graph visualization */}
                  <div className="bar-chart-bar-light" style={{height: '40%'}}></div>
                  <div className="bar-chart-bar-light" style={{height: '90%'}}></div>
                  <div className="bar-chart-bar-light" style={{height: '60%'}}></div>
                  <div className="bar-chart-bar-light" style={{height: '80%'}}></div>
                  <div className="bar-chart-bar-light" style={{height: '50%'}}></div>
                  <div className="bar-chart-bar-light" style={{height: '70%'}}></div>
                  <div className="bar-chart-bar-light" style={{height: '40%'}}></div>
                </div>
              </div>
            </div>
            <p className="component-description">Testimonials Dashboard Card - Light Mode</p>
          </div>

          {/* Feed Table - Wide, Light Mode */}
          <div className="component-item wide">
            <div className="dashboard-card-light wide">
              <table className="feed-table-light">
                <thead>
                  <tr>
                    <th>Member Name</th>
                    <th>Feed Type</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <div className="member-info-light">
                        <div className="member-avatar-light">P</div>
                        <div className="member-details-light">
                          <div className="member-name-light">Panda Express</div>
                          <div className="member-feed-light">TikTok Feed</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="feed-info-light">
                        <div className="feed-icon-light">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#333333" />
                          </svg>
                        </div>
                        <div className="feed-details-light">
                          <div className="feed-type-light">Notion & Webflow</div>
                          <div className="feed-update-light">Updates every 30 minutes</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="status-badge-light active">Active</div>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <div className="member-info-light">
                        <div className="member-avatar-light">T</div>
                        <div className="member-details-light">
                          <div className="member-name-light">Tom Bekkers</div>
                          <div className="member-feed-light">TikTok Feed</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="feed-info-light">
                        <div className="feed-icon-light">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 22l-10-10 10-10 10 10-10 10z" fill="#ef94b5" />
                          </svg>
                        </div>
                        <div className="feed-details-light">
                          <div className="feed-type-light">Notion & Webflow</div>
                          <div className="feed-update-light">Updates every 30 minutes</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="status-badge-light inactive">Inactive</div>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <div className="member-info-light">
                        <div className="member-avatar-light">I</div>
                        <div className="member-details-light">
                          <div className="member-name-light">Ilya Suhodolskiy</div>
                          <div className="member-feed-light">TikTok Feed</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="feed-info-light">
                        <div className="feed-icon-light">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M2 2h20v20H2V2z" fill="#b39efc" />
                          </svg>
                        </div>
                        <div className="feed-details-light">
                          <div className="feed-type-light">Notion & Webflow</div>
                          <div className="feed-update-light">Updates every 30 minutes</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="status-badge-light configure">Configure</div>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <div className="member-info-light">
                        <div className="member-avatar-light">L</div>
                        <div className="member-details-light">
                          <div className="member-name-light">Live Better Pikesville</div>
                          <div className="member-feed-light">TikTok Feed</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="feed-info-light">
                        <div className="feed-icon-light">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 22l-10-10 10-10 10 10-10 10z" fill="#ef94b5" />
                          </svg>
                        </div>
                        <div className="feed-details-light">
                          <div className="feed-type-light">Notion & Webflow</div>
                          <div className="feed-update-light">Updates every 30 minutes</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="status-badge-light active">Active</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="component-description">Feed Table Dashboard Card - Light Mode</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Components;
