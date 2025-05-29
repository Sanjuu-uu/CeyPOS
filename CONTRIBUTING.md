# Contributing to CeyPoS

We love your input! We want to make contributing to CeyPoS as easy and transparent as possible.

## Development Process

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Development Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation
```bash
# Clone the repository
git clone https://github.com/your-username/ceypos.git
cd ceypos

# Install dependencies for main application
npm install

# Install component library dependencies
cd component-library
npm install
cd ..

# Install admin interface dependencies
cd "System Administration and Monitoring Interface"
npm install
cd ..

# Install server dependencies
cd server
npm install
cd ..
```

### Running the Development Environment
```bash
# Run main application (port 5173)
npm run dev

# Run component library (port 3000)
cd component-library && npm run dev

# Run admin interface
cd "System Administration and Monitoring Interface" && npm run dev

# Run server
cd server && npm run dev
```

## Code Style

- Use TypeScript for all new components
- Follow the established component structure
- Use Tailwind CSS for styling
- Write meaningful commit messages
- Add JSDoc comments for complex functions

## Pull Request Process

1. Ensure your code follows the existing style
2. Update documentation if needed
3. Make sure all tests pass
4. Update the README.md if necessary

## Issue Reporting

When creating an issue, please include:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Environment details

## Questions?

Feel free to open an issue for questions or reach out to the maintainers.
