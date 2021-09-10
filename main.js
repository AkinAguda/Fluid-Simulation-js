const canvas = document.getElementById("canvas");

const gl = canvas.getContext("webgl");

if (!gl) document.write("NO WEBGL SUPPORT. Upgrade your browser abeg");

webglUtils.resizeCanvasToDisplaySize(gl.canvas);

gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

gl.clearColor(0, 0, 0, 0);

gl.clear(gl.COLOR_BUFFER_BIT);

// this is assuming width and height are same dimensions

const N = 512;

const size = Math.pow(N + 2, 2);

const dt = 0.3;

const u = new Float64Array(size); // x component of the velocity of every particle in the fluid

const v = new Float64Array(size); // y component of the velocity of every particle in the fluid

const uPrev = new Float64Array(size); // x component of the previous velocity of every particle in the fluid

const vPrev = new Float64Array(size); // y component of the previous velocity of every particle in the fluid

const dens = new Float64Array(size); // density of every particle in the fluid

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

const vsGLSL = `

    attribute vec2 a_position;

    // This matrix is only responsible for converting my pixel coords to clipspace

    uniform mat3 u_matrix;

    void main() {
        vec2 position = (u_matrix * vec3(a_position, 1)).xy;
        gl_Position = vec4(position, 0, 1);
    }
`;

const fsGLSL = `
  precision mediump float;
  void main() {
    gl_FragColor = vec4(0.5, 0.8, 0.5, 1);
  }
`;

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vsGLSL);

const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fsGLSL);

const program = createProgram(vertexShader, fragmentShader);

const positionAttributeLocation = gl.getAttribLocation(program, "a_position");

const transformationMatrixLocation = gl.getUniformLocation(program, "u_matrix");

gl.useProgram(program);

const drawGrid = () => {
  const populateVertices = () => {
    let pointIndex = 0;
    const centers = [];

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

  populateVertices();

  gl.uniformMatrix3fv(
    transformationMatrixLocation,
    false,
    m3.projection(gl.canvas.width, gl.canvas.width)
  );

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  // gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW);
  gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW);

  gl.enableVertexAttribArray(positionAttributeLocation);
  gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

  gl.drawArrays(gl.TRIANGLES, 0, 6 * Math.pow(N + 2, 2));
};

drawGrid();
