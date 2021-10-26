import { gaussSeidel1, round, lerp } from "./utils";

export class FluidConfig {
  constructor(public n: number, public diffusion: number, public dt: number) {}
}

export class Fluid {
  public size: number;

  private currVelX: Float32Array;
  private prevVelX: Float32Array;
  private currVelY: Float32Array;
  private prevVelY: Float32Array;
  private currDens: Float32Array;
  private prevDens: Float32Array;
  private densitySource: Float32Array;
  private velocityXSource: Float32Array;
  private velocityYSource: Float32Array;
  private divergenceValues: Float32Array;
  private poissonValues: Float32Array;

  constructor(public config: FluidConfig) {
    this.size = Math.pow(config.n + 2, 2);
    this.currVelX = new Float32Array(this.size);
    this.prevVelX = new Float32Array(this.size);
    this.currVelY = new Float32Array(this.size);
    this.prevVelY = new Float32Array(this.size);
    this.currDens = new Float32Array(this.size);
    this.prevDens = new Float32Array(this.size);
    this.densitySource = new Float32Array(this.size);
    this.velocityXSource = new Float32Array(this.size);
    this.velocityYSource = new Float32Array(this.size);
    this.divergenceValues = new Float32Array(this.size);
    this.poissonValues = new Float32Array(this.size);
  }

  ix = (x: number, y: number): number => {
    return x + (this.config.n + 2) * y;
  };

  simulate = () => {
    this.velocityStep();
    this.densityStep();
  };

  addVelocity = (index: number, valueX: number, valueY: number) => {
    this.velocityXSource[index] = valueX;
    this.velocityYSource[index] = valueY;
  };

  addDensity = (index: number, value: number) => {
    this.densitySource[index] = value;
  };

  getDensityAtIndex(index: number) {
    return this.currDens[index];
  }

  getDensity() {
    return this.currDens;
  }

  getVelocityX() {
    return this.currVelX;
  }

  // remove any from return type
  private calcNextValueOfProperty = (
    x: number,
    y: number,
    property: Float32Array
  ) => {
    return (a: number, b: number, c: number, d: number) => {
      const k = this.config.dt * this.config.diffusion;
      return (property[this.ix(x, y)] + (k * (a + b + c + d)) / 4) / (1 + k);
    };
  };

  private calcNextValueOfPoisson = (
    x: number,
    y: number,
    property: Float32Array
  ) => {
    return (a: number, b: number, c: number, d: number) => {
      return (a + b + c + d - property[this.ix(x, y)]) / 4;
    };
  };

  private calcPoissonValues = (
    i: number,
    j: number,
    property: Float32Array
  ) => {
    let results = gaussSeidel1(
      [
        this.calcNextValueOfPoisson(i - 1, j, property),
        this.calcNextValueOfPoisson(i + 1, j, property),
        this.calcNextValueOfPoisson(i, j - 1, property),
        this.calcNextValueOfPoisson(i, j + 1, property),
      ],
      [0, 0, 0, 0],
      10
    );
    return this.calcNextValueOfPoisson(i, j, property)(
      results[0],
      results[1],
      results[2],
      results[3]
    );
  };

  private diffuse = (i: number, j: number, property: Float32Array) => {
    let results = gaussSeidel1(
      [
        this.calcNextValueOfProperty(i + 1, j, property),
        this.calcNextValueOfProperty(i - 1, j, property),
        this.calcNextValueOfProperty(i, j + 1, property),
        this.calcNextValueOfProperty(i, j - 1, property),
      ],
      [0, 0, 0, 0],
      10
    );
    return this.calcNextValueOfProperty(i, j, property)(
      results[0],
      results[1],
      results[2],
      results[3]
    );
  };

  private diffusionStep(
    prevProperty: Float32Array,
    currProperty: Float32Array
  ) {
    for (let i = 1; i <= this.config.n; i++) {
      for (let j = 1; j <= this.config.n; j++) {
        const index = this.ix(i, j);
        currProperty[index] = this.diffuse(i, j, prevProperty);
      }
    }
  }

  private advectProperty = (x: number, y: number, property: Float32Array) => {
    // This will give the new point (this formula is form the normal Delta position divided by Delta time equals velocity)
    const initialPosX = x - this.currVelX[this.ix(x, y)] * this.config.dt;
    const initialPosY = y - this.currVelY[this.ix(x, y)] * this.config.dt;

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
      lerp(
        property[this.ix(point1[0], point1[1])],
        property[this.ix(point2[0], point2[1])],
        imaginaryX
      ),
      lerp(
        property[this.ix(point3[0], point3[1])],
        property[this.ix(point4[0], point4[1])],
        imaginaryX
      ),
      imaginaryY
    );

    return updatedProperty;
  };

  private advectionStep = (
    prevProperty: Float32Array,
    currProperty: Float32Array
  ) => {
    for (let i = 1; i <= this.config.n; i++) {
      for (let j = 1; j <= this.config.n; j++) {
        const index = this.ix(i, j);
        currProperty[index] = this.advectProperty(i, j, prevProperty);
      }
    }
  };

  private divergence(x: number, y: number) {
    return (
      0.5 *
      (this.currVelX[this.ix(x + 1, y)] -
        this.currVelX[this.ix(x - 1, y)] +
        (this.currVelX[this.ix(x, y + 1)] - this.currVelX[this.ix(x, y - 1)]))
    );
  }

  private projectionStep() {
    for (let i = 1; i <= this.config.n; i++) {
      for (let j = 1; j <= this.config.n; j++) {
        this.divergenceValues[this.ix(i, j)] = this.divergence(i, j);
        this.poissonValues[this.ix(i, j)] = 0.0;
      }
    }

    for (let i = 1; i <= this.config.n; i++) {
      for (let j = 1; j <= this.config.n; j++) {
        this.poissonValues[this.ix(i, j)] = this.calcPoissonValues(
          i,
          j,
          this.poissonValues
        );
      }
    }

    for (let i = 1; i <= this.config.n; i++) {
      for (let j = 1; j <= this.config.n; j++) {
        let index = this.ix(i, j);
        this.currVelX[index] -=
          (this.poissonValues[this.ix(i + 1, j)] -
            this.poissonValues[this.ix(i - 1, j)]) *
          0.5;
        this.currVelY[index] -=
          (this.poissonValues[this.ix(i, j + 1)] -
            this.poissonValues[this.ix(i, j - 1)]) *
          0.5;
      }
    }
  }

  private addSource = (property: Float32Array, source: Float32Array) => {
    for (let i = 0; i < this.size; i++) {
      property[i] += this.config.dt * source[i];
      source[i] = 0;
    }
  };
  private densityStep() {
    this.addSource(this.prevDens, this.densitySource);
    this.diffusionStep(this.prevDens, this.currDens);
    let temp = this.prevDens;
    this.prevDens = this.currDens;
    this.currDens = temp;
    this.advectionStep(this.prevDens, this.currDens);
    temp = this.prevDens;
    this.prevDens = this.currDens;
    this.currDens = temp;
    // curr - val after advec
    // prev - val before advec
  }
  private velocityStep() {
    this.addSource(this.prevVelX, this.velocityXSource);
    this.addSource(this.prevVelY, this.velocityYSource);

    this.diffusionStep(this.prevVelX, this.currVelX);

    let temp = this.prevVelX;
    this.prevVelX = this.currVelX;
    this.currVelX = temp;

    this.diffusionStep(this.prevVelY, this.currVelY);

    temp = this.prevVelY;
    this.prevVelY = this.currVelY;
    this.currVelY = temp;

    this.projectionStep();

    this.advectionStep(this.prevVelX, this.currVelX);

    temp = this.prevVelX;
    this.prevVelX = this.currVelX;
    this.currVelX = temp;

    this.advectionStep(this.prevVelY, this.currVelY);

    temp = this.prevVelY;
    this.prevVelY = this.currVelY;
    this.currVelY = temp;

    this.projectionStep();
  }
}
