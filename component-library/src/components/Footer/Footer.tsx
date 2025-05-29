import React from 'react';
import '../../styles/global.css';

const Footer: React.FC = () => {
  return (
    <section className="section-footer">
      <div className="container-large">
        <div className="footer-grid">
          <div className="footer-column-primary">
            <div className="wrap-v-large">
              <a
                href="/"
                className="footer-logo"
              >
                <img src="/images/nav-20logo.svg" loading="lazy" alt="Logo" />
              </a>
              <div className="wrap-v-x-small">
                <div className="subheading-regular">
                  Start your 7-day free trial
                </div>
                <p className="paragraph-regular text-gray-500">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam
                  vehicula condimentum.
                </p>
              </div>
            </div>
            <div className="wrap-h-x-small">
              <a
                href="http://www.instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="social-link"
              >
                <div className="icon-small">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M10.8567 1.66748C11.7946 1.66903 12.2698 1.67399 12.6805 1.68621L12.8422 1.69151C13.0291 1.69815 13.2134 1.70648 13.4357 1.7169C14.3224 1.75786 14.9273 1.89815 15.4586 2.1044C16.0078 2.3162 16.4717 2.60231 16.9349 3.06551C17.3974 3.5287 17.6836 3.99398 17.8961 4.5419C18.1016 5.07245 18.2419 5.67801 18.2836 6.56481C18.2935 6.78703 18.3015 6.97136 18.3081 7.15824L18.3133 7.31997C18.3255 7.7306 18.3311 8.20591 18.3328 9.14375L18.3335 9.76516C18.3336 9.84108 18.3336 9.91942 18.3336 10.0002L18.3335 10.2353L18.333 10.8567C18.3314 11.7946 18.3265 12.2698 18.3142 12.6805L18.3089 12.8422C18.3023 13.0291 18.294 13.2134 18.2836 13.4357C18.2426 14.3224 18.1016 14.9273 17.8961 15.4586C17.6842 16.0078 17.3974 16.4717 16.9349 16.9349C16.4717 17.3974 16.0057 17.6836 15.4586 17.8961C14.9273 18.1016 14.3224 18.2419 13.4357 18.2836C13.2134 18.2935 13.0291 18.3015 12.8422 18.3081L12.6805 18.3133C12.2698 18.3255 11.7946 18.3311 10.8567 18.3328L10.2353 18.3335C10.1594 18.3336 10.0811 18.3336 10.0002 18.3336L9.76516 18.3335L9.14375 18.333C8.20591 18.3314 7.7306 18.3265 7.31997 18.3142L7.15824 18.3089C6.97136 18.3023 6.78703 18.294 6.56481 18.2836C5.67801 18.2426 5.07384 18.1016 4.5419 17.8961C3.99328 17.6842 3.5287 17.3974 3.06551 16.9349C2.60231 16.4717 2.3169 16.0057 2.1044 15.4586C1.89815 14.9273 1.75856 14.3224 1.7169 13.4357C1.707 13.2134 1.69892 13.0291 1.69238 12.8422L1.68714 12.6805C1.67495 12.2698 1.66939 11.7946 1.66759 10.8567L1.66748 9.14375C1.66903 8.20591 1.67399 7.7306 1.68621 7.31997L1.69151 7.15824C1.69815 6.97136 1.70648 6.78703 1.7169 6.56481C1.75786 5.67731 1.89815 5.07315 2.1044 4.5419C2.3162 3.99328 2.60231 3.5287 3.06551 3.06551C3.5287 2.60231 3.99398 2.3169 4.5419 2.1044C5.07315 1.89815 5.67731 1.75856 6.56481 1.7169C6.78703 1.707 6.97136 1.69892 7.15824 1.69238L7.31997 1.68714C7.7306 1.67495 8.20591 1.66939 9.14375 1.66759L10.8567 1.66748ZM10.0002 5.83356C7.69781 5.83356 5.83356 7.69984 5.83356 10.0002C5.83356 12.3027 7.69984 14.1669 10.0002 14.1669C12.3027 14.1669 14.1669 12.3006 14.1669 10.0002C14.1669 7.69781 12.3006 5.83356 10.0002 5.83356ZM10.0002 7.50023C11.381 7.50023 12.5002 8.61908 12.5002 10.0002C12.5002 11.381 11.3813 12.5002 10.0002 12.5002C8.6195 12.5002 7.50023 11.3813 7.50023 10.0002C7.50023 8.6195 8.61908 7.50023 10.0002 7.50023ZM14.3752 4.58356C13.8008 4.58356 13.3336 5.05015 13.3336 5.62452C13.3336 6.19889 13.8002 6.6662 14.3752 6.6662C14.9496 6.6662 15.4169 6.19961 15.4169 5.62452C15.4169 5.05015 14.9488 4.58284 14.3752 4.58356Z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
              </a>
              <a
                href="http://www.twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="social-link"
              >
                <div className="icon-small">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M15.1706 1.875H17.9273L11.9048 8.75833L18.9898 18.125H13.4423L9.09729 12.4442L4.12566 18.125H1.36733L7.809 10.7625L1.01233 1.875H6.70066L10.6281 7.0675L15.1706 1.875ZM14.2031 16.475H15.7306L5.87066 3.43833H4.2315L14.2031 16.475Z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
              </a>
              <a
                href="http://www.linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="social-link"
              >
                <div className="icon-small">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M15.2802 15.2825H13.059V11.8018C13.059 10.9718 13.0421 9.90375 11.9015 9.90375C10.7434 9.90375 10.5665 10.8069 10.5665 11.7406V15.2825H8.3452V8.125H10.479V9.10058H10.5077C10.8059 8.53808 11.5309 7.94437 12.614 7.94437C14.8646 7.94437 15.2809 9.42567 15.2809 11.3538L15.2802 15.2825ZM5.83648 7.14562C5.12148 7.14562 4.5471 6.56687 4.5471 5.855C4.5471 5.14375 5.1221 4.56563 5.83648 4.56563C6.54898 4.56563 7.12648 5.14375 7.12648 5.855C7.12648 6.56687 6.54835 7.14562 5.83648 7.14562ZM6.95023 15.2825H4.72273V8.125H6.95023V15.2825ZM16.3915 2.5H3.60773C2.99585 2.5 2.50085 2.98375 2.50085 3.58063V16.4194C2.50085 17.0168 2.99585 17.5 3.60773 17.5H16.3896C17.0009 17.5 17.5009 17.0168 17.5009 16.4194V3.58063C17.5009 2.98375 17.0009 2.5 16.3896 2.5H16.3915Z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
              </a>
              <a
                href="http://www.facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="social-link"
              >
                <div className="icon-small">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M10.0008 1.6665C5.39844 1.6665 1.66748 5.39746 1.66748 9.99984C1.66748 14.1593 4.71486 17.6068 8.69875 18.2319V12.4087H6.58284V9.99984H8.69875V8.1639C8.69875 6.07536 9.94283 4.92171 11.8463 4.92171C12.7581 4.92171 13.7117 5.08447 13.7117 5.08447V7.13525H12.6609C11.6257 7.13525 11.3029 7.77762 11.3029 8.43667V9.99984H13.6141L13.2447 12.4087H11.3029V18.2319C15.2867 17.6068 18.3342 14.1593 18.3342 9.99984C18.3342 5.39746 14.6032 1.6665 10.0008 1.6665Z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
              </a>
            </div>
          </div>
          <div className="footer-link-grid">
            <div className="footer-column">
              <div className="label-regular">Pages</div>
              <div className="wrap-v-regular">
                <a href="/product" className="footer-link">
                  <div>Product</div>
                  <div className="link-badge">
                    <div className="icon-x-small">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <circle
                          cx="7.99992"
                          cy="8.00016"
                          r="6.66667"
                          fill="#E4E5E7"
                        />
                        <circle cx="8" cy="8" r="2" fill="#0F0F10" />
                      </svg>
                    </div>
                    <div>New</div>
                  </div>
                </a>
                <a href="/about" className="footer-link">
                  <div>About</div>
                </a>
                <a href="/blog" className="footer-link">
                  <div>Blog</div>
                </a>
                <a href="/pricing" className="footer-link">
                  <div>Pricing</div>
                </a>
                <a href="/contact" className="footer-link">
                  <div>Contact</div>
                </a>
              </div>
            </div>
            <div className="footer-column">
              <div className="label-regular">Pages</div>
              <div className="wrap-v-regular">
                <a href="/login" className="footer-link">
                  <div>Login</div>
                </a>
                <a href="/register" className="footer-link">
                  <div>Register</div>
                </a>
                <a href="/template/getting-started" className="footer-link">
                  <div>Get Started</div>
                </a>
                <a href="/template/changelog" className="footer-link">
                  <div>Changelog</div>
                  <div className="link-badge">
                    <div className="icon-x-small">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <circle
                          cx="7.99992"
                          cy="8.00016"
                          r="6.66667"
                          fill="#E4E5E7"
                        />
                        <circle cx="8" cy="8" r="2" fill="#0F0F10" />
                      </svg>
                    </div>
                    <div>New</div>
                  </div>
                </a>
                <a href="/template/licence" className="footer-link">
                  <div>Lincence</div>
                </a>
                <a href="/template/style-guide" className="footer-link">
                  <div>Style Guide</div>
                </a>
              </div>
            </div>
          </div>
        </div>        <div className="footer-legal-wrapper">          <p className="paragraph-small text-gray-500">
            ©2025 <span className="span-link">"POS" All Rights Recieved</span> - Powered by <span className="span-link">Ceynode</span>
          </p>
          <div className="legal">
            <a href="#" className="legal-link">Privacy Policy</a>
            <a href="#" className="legal-link">Terms of Service</a>
            <a href="#" className="legal-link">Cookies Settings</a>
          </div>
        </div>
      </div>
      <div className="background-wrapper">
        <img
          src="/images/footer-20background.png"
          loading="lazy"
          width="1474"
          alt=""
          className="background-small"
        />
      </div>
    </section>
  );
};

export default Footer;
