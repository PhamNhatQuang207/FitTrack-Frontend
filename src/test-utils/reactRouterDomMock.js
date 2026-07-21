// Test double for react-router-dom. react-router-dom@7's package "exports" map
// can't be resolved by react-scripts@5's Jest resolver, so we map the module
// name to this file (see "moduleNameMapper" in package.json) instead of loading
// the real package in tests. Only the pieces our components use are provided.
const mockNavigate = jest.fn();

module.exports = {
    __esModule: true,
    useNavigate: () => mockNavigate,
    // Exposed so tests can assert on / reset navigation calls.
    mockNavigate,
};
