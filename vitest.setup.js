// Vitest setup file
import { vi } from 'vitest';

// Mock Canvas API
const mockCanvas = {
  getContext: () => ({
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
    // Canvas properties
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
  }),
};

global.document = {
  createElement: (tag) => {
    if (tag === 'canvas') {
      return {
        ...mockCanvas,
        width: 0,
        height: 0,
      };
    }
    return {};
  },
};

global.window = {
    ...global.window,
    requestAnimationFrame: (callback) => {
        setTimeout(callback, 0);
    },
    cancelAnimationFrame: (id) => {
        clearTimeout(id);
    },
}

