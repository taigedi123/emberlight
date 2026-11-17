// Keyboard and mouse state. The game polls this each frame instead of reacting
// to events, so movement never stutters on key repeat and a screenshot scene
// can drive the same shape of input from its autopilot.

export function createInput(canvas) {
  const keys = new Set();
  const input = {
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
    clicks: [], // canvas-pixel points, drained by the game once a frame
    dashQueued: false,
    confirmQueued: false,
    anyKeyQueued: false,
  };

  function toCanvas(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (!event.repeat) {
      input.anyKeyQueued = true;
      if (event.code === 'ShiftLeft' || event.code === 'ShiftRight' || event.code === 'KeyK') {
        input.dashQueued = true;
      }
      if (event.code === 'Enter' || event.code === 'Space') input.confirmQueued = true;
    }
    keys.add(event.code);
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousemove', (event) => {
    const point = toCanvas(event);
    input.mouseX = point.x;
    input.mouseY = point.y;
  });
  canvas.addEventListener('mousedown', (event) => {
    const point = toCanvas(event);
    input.mouseX = point.x;
    input.mouseY = point.y;
    if (event.button === 2) {
      input.dashQueued = true;
    } else {
      input.mouseDown = true;
      input.clicks.push(point);
    }
  });
  window.addEventListener('mouseup', (event) => {
    if (event.button === 0) input.mouseDown = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  input.axisX = () => {
    let x = 0;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
    return x;
  };
  input.axisY = () => {
    let y = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
    return y;
  };
  input.firing = () => input.mouseDown || keys.has('Space') || keys.has('KeyJ');
  input.takeDash = () => {
    const was = input.dashQueued;
    input.dashQueued = false;
    return was;
  };
  input.takeConfirm = () => {
    const was = input.confirmQueued;
    input.confirmQueued = false;
    return was;
  };
  input.takeAnyKey = () => {
    const was = input.anyKeyQueued;
    input.anyKeyQueued = false;
    return was;
  };
  input.drainClicks = () => {
    const out = input.clicks;
    input.clicks = [];
    return out;
  };
  return input;
}
