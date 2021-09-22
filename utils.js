webglUtils = {
  canvasToDisplaySizeMap: new Map([[canvas, [300, 150]]]),
  onResize: function onResize(entries) {
    for (const entry of entries) {
      let width;
      let height;
      let dpr = window.devicePixelRatio;
      if (entry.devicePixelContentBoxSize) {
        // NOTE: Only this path gives the correct answer
        // The other paths are imperfect fallbacks
        // for browsers that don't provide anyway to do this
        width = entry.devicePixelContentBoxSize[0].inlineSize;
        height = entry.devicePixelContentBoxSize[0].blockSize;
        dpr = 1; // it's already in width and height
      } else if (entry.contentBoxSize) {
        if (entry.contentBoxSize[0]) {
          width = entry.contentBoxSize[0].inlineSize;
          height = entry.contentBoxSize[0].blockSize;
        } else {
          width = entry.contentBoxSize.inlineSize;
          height = entry.contentBoxSize.blockSize;
        }
      } else {
        width = entry.contentRect.width;
        height = entry.contentRect.height;
      }
      const displayWidth = Math.round(width * dpr);
      const displayHeight = Math.round(height * dpr);
      this.canvasToDisplaySizeMap.set(entry.target, [
        displayWidth,
        displayHeight,
      ]);
    }
  },

  resizeCanvasToDisplaySize: function resizeCanvasToDisplaySize(canvas) {
    // Lookup the size the browser is displaying the canvas in CSS pixels.
    const dpr = window.devicePixelRatio;
    const { width, height } = canvas.getBoundingClientRect();
    const displayWidth = Math.round(width * dpr);
    const displayHeight = Math.round(height * dpr);
    // Get the size the browser is displaying the canvas in device pixels.
    //    const [displayWidth, displayHeight] = canvasToDisplaySizeMap.get(canvas);

    // Check if the canvas is not the same size.
    const needResize =
      canvas.width != displayWidth || canvas.height != displayHeight;

    if (needResize) {
      // Make the canvas the same size
      canvas.width = displayWidth;
      canvas.height = displayHeight;
    }

    return needResize;
  },

  controller: {
    config: function constructor() {
      this.spacingConstant = 30;
      this.totalSpacing = 0;
      this.rotationDimension = 150;
      this.meterWidth = 150;
      this.updateTotalSpacing = function (value) {
        this.totalSpacing += value;
      };
    },
    rotation: function constructor(id, config) {
      this.canvas = document.createElement("canvas");
      this.canvas.setAttribute("id", "rotation-canvas-" + id);
      this.canvas.style.position = "absolute";
      this.canvas.height = config.rotationDimension;
      this.canvas.width = config.rotationDimension;
      this.canvas.style.right = config.spacingConstant + "px";
      this.canvas.style.top =
        config.totalSpacing + config.spacingConstant + "px";
      const body = document.querySelector("body");
      body.appendChild(this.canvas);
    },
  },
};

// javascript functions
class Controller {
  static controllers = [];
  lowerLimit;
  totalValue;
  domId = "";
  onInput;
  name = "";
  step = 1;
  currentValue;
  // lowerLimitEl;
  constructor(config) {
    this.onInput = config.onInput;
    this.totalValue = config.totalValue;
    this.currentValue = config.currentValue;
    this.domId = `id-${Math.random() * 100}`;
    this.lowerLimit = config.lowerLimit;
    this.name = config.name;
    this.step = config.step;
    Controller.controllers.push(this.domId);
    this.createDomNode();
  }

  createDomNode() {
    const controllersContainer = document.getElementById("controllers");
    const controllerWrapper = document.createElement("div");
    controllerWrapper.setAttribute("class", "controller-wrapper");
    const name = document.createElement("div");
    name.setAttribute("class", "lower-limit");
    name.innerHTML = this.name;
    // this.lowerLimitEl = name;

    const upperlimit = document.createElement("div");
    upperlimit.setAttribute("class", "upper-limit");
    upperlimit.innerHTML = this.totalValue;

    const input = document.createElement("input");
    input.setAttribute("type", "range");
    input.setAttribute("step", this.step);
    input.setAttribute("min", this.lowerLimit);
    input.setAttribute("max", this.totalValue);
    input.setAttribute("value", this.currentValue);
    input.addEventListener("input", (e) => {
      this.onInput(e.target.value);
      // this.lowerLimitEl.innerHTML = e.target.value;
    });
    controllerWrapper.appendChild(name);
    controllerWrapper.appendChild(input);
    controllerWrapper.appendChild(upperlimit);
    controllersContainer.appendChild(controllerWrapper);
  }
}

// Webgl functions

const createShader = (gl, type, source) => {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) {
    return shader;
  }
  console.error(gl.getShaderInfoLog(shader));

  gl.deleteShader(shader);
};

const createProgram = (vertexShader, fragmentShader) => {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);

  gl.linkProgram(program);

  const success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) {
    return program;
  }

  console.error(gl.getProgramInfoLog(program));

  gl.deleteProgram(program);
};

var m3 = {
  projection: function (width, height) {
    return [2 / width, 0, 0, 0, -2 / height, 0, -1, 1, 1];
  },

  multiply: (a, b) => {
    var a00 = a[0 * 3 + 0];
    var a01 = a[0 * 3 + 1];
    var a02 = a[0 * 3 + 2];
    var a10 = a[1 * 3 + 0];
    var a11 = a[1 * 3 + 1];
    var a12 = a[1 * 3 + 2];
    var a20 = a[2 * 3 + 0];
    var a21 = a[2 * 3 + 1];
    var a22 = a[2 * 3 + 2];
    var b00 = b[0 * 3 + 0];
    var b01 = b[0 * 3 + 1];
    var b02 = b[0 * 3 + 2];
    var b10 = b[1 * 3 + 0];
    var b11 = b[1 * 3 + 1];
    var b12 = b[1 * 3 + 2];
    var b20 = b[2 * 3 + 0];
    var b21 = b[2 * 3 + 1];
    var b22 = b[2 * 3 + 2];
    return [
      b00 * a00 + b01 * a10 + b02 * a20,
      b00 * a01 + b01 * a11 + b02 * a21,
      b00 * a02 + b01 * a12 + b02 * a22,
      b10 * a00 + b11 * a10 + b12 * a20,
      b10 * a01 + b11 * a11 + b12 * a21,
      b10 * a02 + b11 * a12 + b12 * a22,
      b20 * a00 + b21 * a10 + b22 * a20,
      b20 * a01 + b21 * a11 + b22 * a21,
      b20 * a02 + b21 * a12 + b22 * a22,
    ];
  },
};

const round = (number, precision) =>
  Math.round((number + Number.EPSILON) * precision) / precision;

const isPrecise = (x, y, precision) => {
  return round(Math.abs(x - y), precision) <= 1 / precision;
};

// This method gets the estimates after a certain iteration
const gaussSeidel1 = (functions, initialValues, iter) => {
  const initialValuesClone = [...initialValues];
  for (let i = 0; i < iter; i++) {
    initialValues.forEach((_, index) => {
      initialValuesClone[index] = functions[index](...initialValuesClone);
    });
  }
  return initialValuesClone;
};

// This gets the estimate to a certain degree of precision
const gaussSeidel = (
  functions,
  initialValues,
  precision,
  finalPrecision = 10
) => {
  const initialValuesClone = [...initialValues];
  const prevIterationValues = [];
  let precisionCount = 0;
  while (precisionCount < initialValues.length) {
    precisionCount = 0;
    initialValues.forEach((_, index) => {
      initialValuesClone[index] = functions[index](...initialValuesClone);
      if (prevIterationValues[index] !== undefined && prevIterationValues) {
        if (
          isPrecise(
            prevIterationValues[index],
            initialValuesClone[index],
            precision
          )
        ) {
          precisionCount += 1;
        }
      }
      prevIterationValues[index] = initialValuesClone[index];
    });
  }
  return initialValuesClone.map((v) => round(v, finalPrecision));
};

// const convertDensityToColor = (density) =>
