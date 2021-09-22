const canvas = document.getElementById("canvas");

const gl = canvas.getContext("webgl");

if (!gl) document.write("NO WEBGL SUPPORT. Upgrade your browser abeg");

webglUtils.resizeCanvasToDisplaySize(gl.canvas);

gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

gl.clearColor(0, 0, 0, 0);

gl.clear(gl.COLOR_BUFFER_BIT);

// this is assuming width and height are same dimensions

const N = 128;

const size = Math.pow(N + 2, 2);

let dt = 1 / 60 / 2;

const u = new Float64Array(size); // x component of the velocity of every particle in the fluid

const v = new Float64Array(size); // y component of the velocity of every particle in the fluid

const uPrev = new Float64Array(size); // x component of the previous velocity of every particle in the fluid

const vPrev = new Float64Array(size); // y component of the previous velocity of every particle in the fluid

const dens = new Float32Array(size); // density of every particle in the fluid

const dneistyPerVertex = new Float32Array(size * 6); // This stores the colors that will be passed as a varying to the fragment shader

const densPrev = new Float64Array(size); // previous density of every particle in the fluid

const points = new Float32Array(size * 12); // The centers of each square where the vector for that unit of fluid sits at (has its tail at)

const halfSquare = gl.canvas.width / (N + 2) / 2;

//////// Utility functions for fluid sim
/**
 * This function gets the index of a value speciied by its x and y coordinates
 * @param {Number} x
 * @param {Number} y
 * @returns Number
 */
const ix = (x, y) => x + (N + 2) * y;

canvas.addEventListener("click", (e) => {
  const rect = e.target.getBoundingClientRect();
  const x = e.clientX - rect.left; //x position within the element.
  const y = e.clientY - rect.top; //y position within the element.
  const hRatio = N / rect.height;
  const wRatio = N / rect.width;
  const convertedX = Math.round(x * wRatio);
  const convertedY = Math.round(y * hRatio);
  // console.log(hRatio, wRatio);
  // console.log(x, y, convertedX, convertedY);
  dens[ix(convertedX, convertedY)] = 1;
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

const populateVertices = () => {
  let pointIndex = 0;
  for (let i = 0; i < N + 2; i++) {
    for (let j = 0; j < N + 2; j++) {
      // This is responsible for populating the points array with the correct coords
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

populateVertices();

const drawGrid = () => {
  dens.forEach((density, index) => {
    for (let i = index * 6; i < index * 6 + 6; i++) {
      dneistyPerVertex[i] = density;
    }
  });

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

let then = 0;
const draw = (now) => {
  now *= 0.001;
  // Subtract the previous time from the current time
  dt = now - then;
  // Remember the current time for the next frame.
  then = now;
  drawGrid();
  requestAnimationFrame(draw);
};

requestAnimationFrame(draw);
