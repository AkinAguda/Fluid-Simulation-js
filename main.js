const resetButton = document.getElementById("reset");

const canvas = document.getElementById("canvas");

const gl = canvas.getContext("webgl");

if (!gl) document.write("NO WEBGL SUPPORT. Upgrade your browser abeg");

webglUtils.resizeCanvasToDisplaySize(gl.canvas);

gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

gl.clearColor(0, 0, 0, 0);

gl.clear(gl.COLOR_BUFFER_BIT);

// this is assuming width and height are same dimensions

const N = 64;

const size = Math.pow(N + 2, 2);

let dt = 1 / 60 / 2;

const diffusion = 20;

let mode = "density";

const dispenseBoth = false;

let currVelX = new Float64Array(size); // x component of the velocity of every particle in the fluid

let nextVelX = new Float64Array(size); // x component of the next velocity of every particle in the fluid

let currVelY = new Float64Array(size); // y component of the velocity of every particle in the fluid

let nextVelY = new Float64Array(size); // y component of the next velocity of every particle in the fluid

let currDens = new Float32Array(size); // density of every particle in the fluid

let nextDens = new Float64Array(size); // next density of every particle in the fluid

const dneistyPerVertex = new Float32Array(size * 6); // This stores the colors that will be passed as a varying to the fragment shader

const points = new Float32Array(size * 12); // The centers of each square where the vector for that unit of fluid sits at (has its tail at)

const halfSquare = gl.canvas.width / (N + 2) / 2;

const defaultMouseEventState = {
  mouseDown: false,
  dragging: false,
};

let mouseEventState = {
  ...defaultMouseEventState,
};

const modeToggler = document.getElementById("mode");

modeToggler.innerHTML = mode;

modeToggler.addEventListener("click", () => {
  if (mode === "velocity") {
    mode = "density";
  } else {
    mode = "velocity";
  }
  modeToggler.innerHTML = mode;
});

//////// Utility functions for fluid sim
/**
 * This function gets the index of a value speciied by its x and y coordinates
 * @param {Number} x
 * @param {Number} y
 * @returns Number
 */
const ix = (x, y) => x + (N + 2) * y;

const updateDensity = (y, x) => {
  // TODO: Remember to update the projection matrix to fix the irrgularity of puttin y before x
  currDens[ix(x, y)] = 1;
};

const updateVelocity = (y, x) => {
  // TODO: Remember to update the projection matrix to fix the irrgularity of puttin y before x
  currVelX[ix(x, y)] = 10;
  currVelY[ix(x, y)] = 10;
};

const clear = () => {
  currDens = new Float32Array(size);
  nextDens = new Float32Array(size);
  vPrev = new Float32Array(size);
  v = new Float32Array(size);
};

const handleEvent = (x, y) => {
  if (dispenseBoth) {
    updateVelocity(x, y);
    updateDensity(x, y);
  } else {
    if (mode === "velocity") {
      updateVelocity(x, y);
    } else {
      updateDensity(x, y);
    }
  }
};

resetButton.addEventListener("click", () => {
  clear();
});

canvas.addEventListener("mousedown", () => {
  mouseEventState = { ...mouseEventState, mouseDown: true };
});

canvas.addEventListener("mousemove", (e) => {
  if (mouseEventState.mouseDown) {
    mouseEventState = { ...mouseEventState, dragging: true };
    handleEvent(...getEventLocation(e));
  }
});

canvas.addEventListener("click", (e) => {
  handleEvent(...getEventLocation(e));
});

canvas.addEventListener("mouseup", () => {
  mouseEventState = { ...defaultMouseEventState };
});

const vsGLSL = `
  attribute vec2 a_position;
  attribute float a_density;

  // This matrix is only responsible for converting my pixel coords to clipspace
  uniform mat3 u_matrix;

  varying float v_density;

  void main() {
      vec2 position = (u_matrix * vec3(a_position, 1)).xy;
      gl_Position = vec4(position, 0, 1);
      v_density = a_density;
  }
`;

const fsGLSL = `
  precision mediump float;

  varying float v_density;

  void main() {
    gl_FragColor = vec4(v_density, v_density, v_density, 1);
  }
`;

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vsGLSL);

const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fsGLSL);

const program = createProgram(vertexShader, fragmentShader);

const positionAttributeLocation = gl.getAttribLocation(program, "a_position");

const densityAttributeLocation = gl.getAttribLocation(program, "a_density");

const transformationMatrixLocation = gl.getUniformLocation(program, "u_matrix");

const positionBuffer = gl.createBuffer();

const densityBuffer = gl.createBuffer();

gl.useProgram(program);

gl.uniformMatrix3fv(
  transformationMatrixLocation,
  false,
  m3.projection(gl.canvas.width, gl.canvas.width)
);

// This function populates the points array withh the coords for each verterx
// that will be fed to the vertex shader
const populateVertices = () => {
  let pointIndex = 0;
  for (let i = 0; i < N + 2; i++) {
    for (let j = 0; j < N + 2; j++) {
      const center = [
        halfSquare * 2 * i + halfSquare,
        halfSquare * 2 * j + halfSquare,
      ];

      // Vertex 1 coords
      points[pointIndex] = center[0] - halfSquare;
      points[pointIndex + 1] = center[1] - halfSquare;

      // Vertex 2 coords
      points[pointIndex + 2] = center[0] + halfSquare;
      points[pointIndex + 3] = center[1] - halfSquare;

      // Vertex 3 coords
      points[pointIndex + 4] = center[0] - halfSquare;
      points[pointIndex + 5] = center[1] + halfSquare;

      // Vertex 4 coords
      points[pointIndex + 6] = center[0] - halfSquare;
      points[pointIndex + 7] = center[1] + halfSquare;

      // Vertex 5 coords
      points[pointIndex + 8] = center[0] + halfSquare;
      points[pointIndex + 9] = center[1] - halfSquare;

      // Vertex 6 coords
      points[pointIndex + 10] = center[0] + halfSquare;
      points[pointIndex + 11] = center[1] + halfSquare;

      pointIndex += 12;
    }
  }
};

const calcNextValueOfProperty = (x, y, property) => (a, b, c, d) => {
  const k = dt * diffusion;
  return (property[ix(x, y)] + (k * (a + b + c + d)) / 4) / (1 + k);
};

const diffuse = (i, j, property) =>
  calcNextValueOfProperty(
    i,
    j,
    property
  )(
    ...gaussSeidel(
      [
        calcNextValueOfProperty(i + 1, j, property),
        calcNextValueOfProperty(i - 1, j, property),
        calcNextValueOfProperty(i, j + 1, property),
        calcNextValueOfProperty(i, j - 1, property),
      ],
      [0, 0, 0, 0],
      1000
    )
  );

const advectProperty = (x, y, property) => {
  // This will give the new point (this formula is form the normal Delta position divided by Delta time equals velocity)
  const initialPosX = x - currVelX[ix(x, y)] * dt;
  const initialPosY = y - currVelY[ix(x, y)] * dt;

  const imaginaryX = round(initialPosX % 1, 10);
  const imaginaryY = round(initialPosY % 1, 10);

  const point1 = [Math.floor(initialPosX), Math.floor(initialPosY)]; // top left
  const point2 = [Math.ceil(initialPosX), Math.floor(initialPosY)]; // top right
  const point3 = [Math.floor(initialPosX), Math.ceil(initialPosY)]; // bottom left
  const point4 = [Math.ceil(initialPosX), Math.ceil(initialPosY)]; // bottom right

  // To find the closest point to that, we need to floor it
  // const closestX = Math.floor(initialPosX);
  // const closestY = Math.floor(initialPosY);

  const updatedProperty = lerp(
    lerp(property[ix(...point1)], property[ix(...point2)], imaginaryX),
    lerp(property[ix(...point3)], property[ix(...point4)], imaginaryX),
    imaginaryY
  );

  return updatedProperty;
};

const swap = (arr1, arr2) => {
  const temp = arr1;
  arr1 = arr2;
  arr2 = temp;
};

const addSource = (x, s) => {
  for (let i = 0; i < size; i++) {
    x[i] += dt * s[i];
    // x[i] = s[i];
  }
};

const diffusionStep = (next, curr) => {
  for (let i = 1; i <= N; i++) {
    for (let j = 1; j <= N; j++) {
      const index = ix(i, j);
      next[index] = diffuse(i, j, curr);
    }
  }
  // densityAfterDiffusion = diffuse(i, j, currDens);
  // nextDens[index] = densityAfterDiffusion;
  // nextDens[index] = advectProperty(i, j, nextDens);
};

const advectionStep = (next, curr) => {
  for (let i = 1; i <= N; i++) {
    for (let j = 1; j <= N; j++) {
      const index = ix(i, j);
      next[index] = advectProperty(i, j, curr);
    }
  }
};

const getVerticesFromDensity = () => {
  for (let i = 1; i <= N; i++) {
    for (let j = 1; j <= N; j++) {
      const index = ix(i, j);
      for (let i = index * 6; i < index * 6 + 6; i++) {
        // if (nextDens[index] !== 0) {
        //   console.log(nextDens[index]);
        // }
        dneistyPerVertex[i] = nextDens[index];
      }
    }
  }
};

const updateFluid = () => {
  addSource(nextDens, currDens);
  swap(currDens, nextDens);
  diffusionStep(nextDens, currDens);
  swap(currDens, nextDens);
  // advectionStep(nextDens, currDens);

  // currVelX = nextVelX;
  // currVelY = nextVelY;
  // currDens = nextDens;
};

const drawFluid = () => {
  getVerticesFromDensity();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW);

  gl.bindBuffer(gl.ARRAY_BUFFER, densityBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, dneistyPerVertex, gl.STATIC_DRAW);

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.enableVertexAttribArray(positionAttributeLocation);
  gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, densityBuffer);
  gl.enableVertexAttribArray(densityAttributeLocation);
  gl.vertexAttribPointer(densityAttributeLocation, 1, gl.FLOAT, true, 0, 0);

  gl.drawArrays(gl.TRIANGLES, 0, 6 * size);
};

const render = () => {
  updateFluid();
  drawFluid();
};

let then = 0;
const draw = (now) => {
  now *= 0.001;
  // Subtract the next time from the current time
  dt = now - then;
  // Remember the current time for the next frame.
  then = now;
  render();
  requestAnimationFrame(draw);
};

const start = () => {
  populateVertices();
  requestAnimationFrame(draw);
};

start();

setInterval(() => {
  console.log(nextDens);
}, 3000);
