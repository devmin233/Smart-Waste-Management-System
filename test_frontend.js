const fs = require('fs');
const path = require('path');

describe('Dashboard Frontend Tests', () => {
    beforeAll(() => {
        const html = fs.readFileSync(path.resolve(__dirname, './index.html'), 'utf8');
        document.body.innerHTML = html;
    });

    test('DOM contains login form', () => {
        const loginForm = document.getElementById('login-form');
        expect(loginForm).not.toBeNull();
    });

    test('Dashboard section is initially defined', () => {
        const mapSection = document.getElementById('map');
        expect(mapSection).toBeDefined();
    });
});
