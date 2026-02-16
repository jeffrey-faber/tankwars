// Vitest setup file
import { vi } from 'vitest';

// Mock DOM elements
class MockElement {
    constructor(tag) {
        this.tagName = tag.toUpperCase();
        this.id = '';
        this.className = '';
        this._innerHTML = '';
        this.style = {};
        this.children = [];
        this.listeners = new Map();
        this.classList = {
            add: vi.fn((cls) => {
                if (!this.className.includes(cls)) {
                    this.className += (this.className ? ' ' : '') + cls;
                }
            }),
            remove: vi.fn((cls) => {
                this.className = this.className.replace(cls, '').trim();
            }),
            contains: vi.fn((cls) => this.className.includes(cls)),
        };
    }

    get innerHTML() {
        return this._innerHTML;
    }

    set innerHTML(val) {
        this._innerHTML = val;
        if (val === '') {
            this.children = [];
        }
    }

    appendChild(child) {
        this.children.push(child);
        return child;
    }

    querySelector(selector) {
        if (selector.startsWith('#')) {
            const id = selector.slice(1);
            return this.children.find(c => c.id === id) || null;
        }
        return null;
    }

    addEventListener(event, handler) {
        if (!this.listeners.has(event)) this.listeners.set(event, []);
        this.listeners.get(event).push(handler);
    }

    dispatchEvent(event) {
        const type = event.type || event;
        if (this.listeners.has(type)) {
            this.listeners.get(type).forEach(cb => cb(event));
        }
        return true;
    }

    click() {
        this.dispatchEvent({ type: 'click' });
    }

    cloneNode() {
        return new MockElement(this.tagName);
    }
}

class MockCanvas extends MockElement {
    constructor() {
        super('canvas');
        this.width = 0;
        this.height = 0;
    }

    getContext() {
        return {
            clearRect: vi.fn(),
            createImageData: (width, height) => ({
                data: new Uint8Array(width * height * 4),
            }),
            putImageData: vi.fn(),
            drawImage: vi.fn(),
            fillRect: vi.fn(),
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            stroke: vi.fn(),
            arc: vi.fn(),
            fillText: vi.fn(),
            fillStyle: '',
            strokeStyle: '',
            lineWidth: 0,
            font: '',
        };
    }
}

const elements = new Map();

const listeners = new Map();

global.document = {
    createElement: vi.fn((tag) => {
        let el;
        if (tag === 'canvas') {
            el = new MockCanvas();
        } else {
            el = new MockElement(tag);
        }
        return el;
    }),
    body: new MockElement('body'),
    documentElement: new MockElement('html'),
    head: new MockElement('head'),
    getElementById: vi.fn((id) => {
        if (id === 'storeButton') return global.document.body.children.find(c => c.id === 'storeButton') || null;
        if (id === 'gameCanvas') return new MockCanvas();
        return global.document.body.children.find(c => c.id === id) || null;
    }),
    querySelector: vi.fn((selector) => {
        const findRecursive = (el, sel) => {
            if (sel.startsWith('.')) {
                const cls = sel.slice(1);
                if (el.className.includes(cls)) return el;
            } else if (sel.startsWith('#')) {
                const id = sel.slice(1);
                if (el.id === id) return el;
            } else {
                if (el.tagName === sel.toUpperCase()) return el;
            }
            for (const child of el.children) {
                const found = findRecursive(child, sel);
                if (found) return found;
            }
            return null;
        };
        return findRecursive(global.document.body, selector);
    }),
    addEventListener: vi.fn((event, cb) => {
        if (!listeners.has(event)) listeners.set(event, []);
        listeners.get(event).push(cb);
    }),
    dispatchEvent: vi.fn((event) => {
        const type = event.type || event;
        if (listeners.has(type)) {
            listeners.get(type).forEach(cb => cb(event));
        }
    }),
};

global.window = {
    ...global.window,
    location: {
        search: '',
        reload: vi.fn(),
    },
    localStorage: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
    },
    confirm: vi.fn(() => true),
    addEventListener: global.document.addEventListener,
    dispatchEvent: global.document.dispatchEvent,
    requestAnimationFrame: vi.fn(),
    cancelAnimationFrame: vi.fn(),
    navigator: {
        vibrate: vi.fn(),
    }
};

global.localStorage = global.window.localStorage;
global.confirm = global.window.confirm;
global.requestAnimationFrame = global.window.requestAnimationFrame;
global.navigator = global.window.navigator;


