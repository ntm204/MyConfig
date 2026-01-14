// ===== CẤU HÌNH =====
const CONFIG = {
  color: "default", // Màu vệt con trỏ (hoặc "default" để lấy từ theme)
  style: "line", // Kiểu: "line" hoặc "block"
  trailLength: 8, // Độ dài vệt (8-12 là tối ưu)
  pollingRate: 500, // Tần suất kiểm tra con trỏ (ms)
  shadow: {
    enabled: false,
    blur: 15,
  },
};

// ===== HẰNG SỐ =====
const DEFAULTS = {
  color: "#A052FF",
  size: 3,
  sizeYMultiplier: 2.2,
  smoothX: 0.42,
  smoothY: 0.35,
  editorSelector: ".part.editor",
  cursorClass: "cursor",
};

// ===== TẠO HIỆU ỨNG VẾT CON TRỎ =====
function createTrail(options) {
  const totalParticles = options?.length || 20;
  const particlesColor = options?.color || DEFAULTS.color;
  const style = options?.style || "block";
  const canvas = options?.canvas;
  const context = canvas.getContext("2d");

  let cursor = { x: 0, y: 0 };
  let particles = [];
  let width, height;
  let sizeX = options?.size || DEFAULTS.size;
  let sizeY = options?.sizeY || sizeX * DEFAULTS.sizeYMultiplier;
  let isInitialized = false;

  class Particle {
    constructor(x, y) {
      this.position = { x, y };
    }
  }

  const updateSize = (x, y) => {
    width = x;
    height = y;
    canvas.width = x;
    canvas.height = y;
  };

  const move = (x, y) => {
    cursor.x = x + sizeX / 2;
    cursor.y = y;

    if (!isInitialized) {
      isInitialized = true;
      for (let i = 0; i < totalParticles; i++) {
        particles.push(new Particle(cursor.x, cursor.y));
      }
    }
  };

  const calculatePosition = () => {
    let x = cursor.x;
    let y = cursor.y;

    particles.forEach((particle, i) => {
      const nextParticle = particles[i + 1] || particles[0];
      particle.position.x = x;
      particle.position.y = y;

      x += (nextParticle.position.x - x) * DEFAULTS.smoothX;
      y += (nextParticle.position.y - y) * DEFAULTS.smoothY;
    });
  };

  const applyShadow = () => {
    if (CONFIG.shadow.enabled) {
      context.shadowColor = particlesColor;
      context.shadowBlur = CONFIG.shadow.blur;
    }
  };

  const drawLines = () => {
    context.beginPath();
    context.lineJoin = "round";
    context.strokeStyle = particlesColor;
    const lineWidth = Math.min(sizeX, sizeY);
    context.lineWidth = lineWidth;

    applyShadow();

    const yMutation = (sizeY - lineWidth) / 3;
    for (let i = 0; i <= 3; i++) {
      const offset = i * yMutation;
      particles.forEach((particle, index) => {
        const { x, y } = particle.position;
        index === 0
          ? context.moveTo(x, y + offset + lineWidth / 2)
          : context.lineTo(x, y + offset + lineWidth / 2);
      });
    }
    context.stroke();
  };

  const drawPath = () => {
    context.beginPath();
    context.fillStyle = particlesColor;
    applyShadow();

    particles.forEach((particle, i) => {
      const { x, y } = particle.position;
      i === 0 ? context.moveTo(x, y) : context.lineTo(x, y);
    });

    for (let i = particles.length - 1; i >= 0; i--) {
      const { x, y } = particles[i].position;
      context.lineTo(x, y + sizeY);
    }
    context.closePath();
    context.fill();

    context.beginPath();
    context.lineJoin = "round";
    context.strokeStyle = particlesColor;
    context.lineWidth = Math.min(sizeX, sizeY);

    const offset = -sizeX / 2 + sizeY / 2;
    particles.forEach((particle, i) => {
      const { x, y } = particle.position;
      i === 0 ? context.moveTo(x, y + offset) : context.lineTo(x, y + offset);
    });
    context.stroke();
  };

  const updateParticles = () => {
    if (!isInitialized) return;

    context.clearRect(0, 0, width, height);
    calculatePosition();
    style === "line" ? drawPath() : drawLines();
  };

  const updateCursorSize = (newSizeX, newSizeY) => {
    sizeX = newSizeX;
    if (newSizeY) sizeY = newSizeY;
  };

  return { updateParticles, move, updateSize, updateCursorSize };
}

// ===== QUẢN LÝ CURSOR HANDLER =====
async function createCursorHandler(handlers) {
  const editor = await waitForEditor();
  handlers?.onStarted?.(editor);

  const state = {
    updateHandlers: [],
    cursorId: 0,
    activeCursors: {},
    lastCursor: 0,
    lastVisibility: "hidden",
  };

  const createUpdateHandler = (target, id, cursorHolder, minimap) => {
    let lastPos = { x: null, y: null };

    const update = (editorX, editorY) => {
      if (!state.activeCursors[id]) {
        state.updateHandlers.splice(state.updateHandlers.indexOf(update), 1);
        return;
      }

      const { left: x, top: y } = target.getBoundingClientRect();
      const relX = x - editorX;
      const relY = y - editorY;

      if (relX === lastPos.x && relY === lastPos.y && state.lastCursor === id)
        return;
      if (relX <= 0 || relY <= 0 || target.style.visibility === "hidden")
        return;
      if (minimap?.offsetWidth && minimap.getBoundingClientRect().left <= x)
        return;
      if (cursorHolder.getBoundingClientRect().left > x) return;

      lastPos = { x: relX, y: relY };
      state.lastCursor = id;
      handlers?.onCursorPositionUpdated?.(relX, relY);
      handlers?.onCursorSizeUpdated?.(target.clientWidth, target.clientHeight);
    };

    state.updateHandlers.push(update);
  };

  // Polling để phát hiện cursor mới/bị xóa
  setInterval(() => {
    const currentIds = [];
    let visibleCount = 0;

    for (const target of editor.getElementsByClassName(DEFAULTS.cursorClass)) {
      if (target.style.visibility !== "hidden") visibleCount++;

      const existingId = target.getAttribute("cursorId");
      if (existingId) {
        currentIds.push(+existingId);
        continue;
      }

      const id = state.cursorId++;
      currentIds.push(id);
      state.activeCursors[id] = target;
      target.setAttribute("cursorId", id);

      const cursorHolder = target.parentElement.parentElement.parentElement;
      const minimap = cursorHolder.parentElement.querySelector(".minimap");
      createUpdateHandler(target, id, cursorHolder, minimap);
    }

    const visibility = visibleCount <= 1 ? "visible" : "hidden";
    if (visibility !== state.lastVisibility) {
      handlers?.onCursorVisibilityChanged?.(visibility);
      state.lastVisibility = visibility;
    }

    for (const id in state.activeCursors) {
      if (!currentIds.includes(+id)) {
        delete state.activeCursors[+id];
      }
    }
  }, handlers?.cursorUpdatePollingRate || CONFIG.pollingRate);

  // Animation loop
  const updateLoop = () => {
    const { left: editorX, top: editorY } = editor.getBoundingClientRect();
    state.updateHandlers.forEach((handler) => handler(editorX, editorY));
    handlers?.onLoop?.();
    requestAnimationFrame(updateLoop);
  };

  // Theo dõi thay đổi kích thước editor
  new ResizeObserver(() => {
    handlers?.onEditorSizeUpdated?.(editor.clientWidth, editor.clientHeight);
  }).observe(editor);

  handlers?.onEditorSizeUpdated?.(editor.clientWidth, editor.clientHeight);
  updateLoop();
  handlers?.onReady?.();
}

async function waitForEditor() {
  let editor;
  while (!editor) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    editor = document.querySelector(DEFAULTS.editorSelector);
  }
  return editor;
}

// ===== KHỞI TẠO HIỆU ỨNG =====
let cursorCanvas, trailHandle;

createCursorHandler({
  cursorUpdatePollingRate: CONFIG.pollingRate,

  onStarted: (editor) => {
    cursorCanvas = createCanvas(editor);

    const color =
      CONFIG.color === "default"
        ? getComputedStyle(document.querySelector("body>.monaco-workbench"))
            .getPropertyValue("--vscode-editorCursor-background")
            .trim()
        : CONFIG.color;

    trailHandle = createTrail({
      length: CONFIG.trailLength,
      color,
      size: 7,
      style: CONFIG.style,
      canvas: cursorCanvas,
    });
  },

  onReady: () => {},
  onCursorPositionUpdated: (x, y) => trailHandle.move(x, y),
  onEditorSizeUpdated: (x, y) => trailHandle.updateSize(x, y),
  onCursorSizeUpdated: (x, y) => trailHandle.updateCursorSize(x, y),
  onCursorVisibilityChanged: (visibility) =>
    (cursorCanvas.style.visibility = visibility),
  onLoop: () => trailHandle.updateParticles(),
});

function createCanvas(editor) {
  const canvas = document.createElement("canvas");
  Object.assign(canvas.style, {
    pointerEvents: "none",
    position: "absolute",
    top: "0px",
    left: "0px",
    zIndex: "1000",
  });
  editor.appendChild(canvas);
  return canvas;
}
